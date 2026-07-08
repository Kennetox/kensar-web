"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  addWebCartItem,
  applyWebCartCoupon,
  clearWebCart,
  clearWebCartCoupon,
  createWebOrderFromCart,
  fetchMyWebOrders,
  fetchWebCart,
  removeWebCartItem,
  updateWebCartItem,
  type WebComboContext,
  type WebCart,
  type WebCartItem,
  type WebOrderSummary,
} from "@/app/lib/webCart";
import { hasCouponSessionMarker, setCouponSessionMarker } from "@/app/lib/couponSession";
import { useWebCustomer } from "@/app/components/WebCustomerProvider";

const GUEST_CART_STORAGE_KEY = "kensar_web_guest_cart_v1";
const CART_MAX_UNITS_PER_ITEM = 3;
const PERSONALIZA_CHECKOUT_CONTEXT_STORAGE_KEY = "kensar_web_personaliza_checkout_context_v1";
const CHECKOUT_COMPLETED_EVENT_NAME = "kensar:checkout-completed";
const CHECKOUT_CLEARED_ORDER_PREFIX = "kensar_web_checkout_cleared_order_";
const CART_REFRESH_THROTTLE_MS = 2000;

function cloneComboContext(value?: WebComboContext[] | null): WebComboContext[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  return value.map((entry) => ({ ...entry }));
}

function mergeComboContext(
  ...values: Array<WebComboContext[] | null | undefined>
): WebComboContext[] | null {
  const merged = values.flatMap((value) => (Array.isArray(value) ? value : []));
  return merged.length > 0 ? merged.map((entry) => ({ ...entry })) : null;
}

type GuestCartItemInput = {
  product_name: string;
  product_slug: string;
  product_sku?: string | null;
  image_url?: string | null;
  brand?: string | null;
  stock_status?: WebCartItem["stock_status"];
  unit_price: number;
  compare_price?: number | null;
  unit_price_override?: number | null;
  combo_context_json?: WebComboContext[] | null;
};

type WebCartContextValue = {
  cart: WebCart | null;
  orders: WebOrderSummary[];
  loading: boolean;
  ordersLoading: boolean;
  refreshing: boolean;
  error: string | null;
  refreshCart: () => Promise<WebCart | null>;
  refreshOrders: () => Promise<WebOrderSummary[]>;
  addItem: (productId: number, quantity?: number, guestItem?: GuestCartItemInput) => Promise<WebCart>;
  updateItem: (productId: number, quantity: number) => Promise<WebCart>;
  removeItem: (productId: number) => Promise<WebCart>;
  clear: () => Promise<void>;
  applyCoupon: (code: string) => Promise<WebCart>;
  clearCoupon: () => Promise<WebCart>;
  createOrder: (notes?: string) => Promise<WebOrderSummary>;
};

const WebCartContext = createContext<WebCartContextValue | null>(null);

function buildGuestCart(): WebCart {
  return {
    id: 0,
    status: "guest",
    currency: "COP",
    items: [],
    items_count: 0,
    subtotal_base: 0,
    discount_amount: 0,
    subtotal: 0,
    total: 0,
    coupon_code: null,
    coupon_discount_percent: 0,
    updated_at: new Date(0).toISOString(),
  };
}

function recalculateGuestCart(items: WebCartItem[]): WebCart {
  const subtotal = items.reduce((acc, item) => acc + item.line_total, 0);
  const itemsCount = items.reduce((acc, item) => acc + item.quantity, 0);
  return {
    id: 0,
    status: "guest",
    currency: "COP",
    items,
    items_count: itemsCount,
    subtotal_base: subtotal,
    discount_amount: 0,
    subtotal,
    total: subtotal,
    coupon_code: null,
    coupon_discount_percent: 0,
    updated_at: new Date().toISOString(),
  };
}

function parseGuestStorage(): WebCart {
  if (typeof window === "undefined") return buildGuestCart();
  try {
    const raw = window.localStorage.getItem(GUEST_CART_STORAGE_KEY);
    if (!raw) return buildGuestCart();
    const parsed = JSON.parse(raw) as Partial<WebCart>;
    if (!Array.isArray(parsed?.items) || parsed.items.length === 0) return buildGuestCart();

    const items = parsed.items
      .map((item) => {
        const quantity = Math.min(CART_MAX_UNITS_PER_ITEM, Math.max(1, Number(item.quantity) || 1));
        const unitPrice = Number(item.unit_price) || 0;
        const lineTotal = unitPrice * quantity;
        return {
          id: Number(item.product_id) || Number(item.id) || 0,
          product_id: Number(item.product_id) || 0,
          product_name: String(item.product_name || "Producto"),
          product_slug: String(item.product_slug || ""),
          product_sku: item.product_sku || null,
          image_url: item.image_url || null,
          brand: item.brand || null,
          stock_status: item.stock_status || "in_stock",
          quantity,
          unit_price: unitPrice,
          compare_price: typeof item.compare_price === "number" ? item.compare_price : null,
          line_total: lineTotal,
          combo_context_json: cloneComboContext(item.combo_context_json),
        } as WebCartItem;
      })
      .filter((item) => item.product_id > 0);

    return recalculateGuestCart(items);
  } catch {
    return buildGuestCart();
  }
}

function persistGuestCart(cart: WebCart) {
  if (typeof window === "undefined") return;
  if (!cart.items.length) {
    window.localStorage.removeItem(GUEST_CART_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(cart));
}

export default function WebCartProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { authenticated, loading: customerLoading } = useWebCustomer();
  const [cart, setCart] = useState<WebCart | null>(null);
  const [orders, setOrders] = useState<WebOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshThrottleRef = useRef(0);

  const hasActiveCoupon = useCallback((nextCart: WebCart | null) => {
    return Boolean(nextCart?.coupon_code && nextCart.coupon_code.trim().length > 0);
  }, []);

  const normalizeAuthenticatedCouponSession = useCallback(
    async (nextCart: WebCart) => {
      let normalized = nextCart;
      const couponActive = hasActiveCoupon(nextCart);

      if (couponActive && !hasCouponSessionMarker()) {
        try {
          normalized = await clearWebCartCoupon();
        } catch {
          normalized = nextCart;
        }
      }

      setCouponSessionMarker(hasActiveCoupon(normalized));
      return normalized;
    },
    [hasActiveCoupon]
  );

  const refreshCart = useCallback(async () => {
    if (!authenticated) {
      const guestCart = parseGuestStorage();
      setCart(guestCart);
      setCouponSessionMarker(false);
      return guestCart;
    }

    try {
      setRefreshing(true);
      setError(null);
      const nextCart = await fetchWebCart();
      const normalized = await normalizeAuthenticatedCouponSession(nextCart);
      setCart(normalized);
      return normalized;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No se pudo cargar el carrito.");
      return null;
    } finally {
      setRefreshing(false);
    }
  }, [authenticated, normalizeAuthenticatedCouponSession]);

  const refreshOrders = useCallback(async () => {
    if (!authenticated) {
      setOrders([]);
      return [];
    }
    try {
      setOrdersLoading(true);
      setError(null);
      const nextOrders = await fetchMyWebOrders();
      setOrders(nextOrders);
      return nextOrders;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No se pudieron cargar tus órdenes.");
      return [];
    } finally {
      setOrdersLoading(false);
    }
  }, [authenticated]);

  useEffect(() => {
    if (customerLoading) return;
    let active = true;

    const run = async () => {
      setLoading(true);
      if (!authenticated) {
        if (!active) return;
        setCart(parseGuestStorage());
        setCouponSessionMarker(false);
        setOrders([]);
        setLoading(false);
        return;
      }

      try {
        const [nextCart, nextOrders] = await Promise.all([fetchWebCart(), fetchMyWebOrders()]);
        const normalizedCart = await normalizeAuthenticatedCouponSession(nextCart);
        if (!active) return;
        setCart(normalizedCart);
        setOrders(nextOrders);
        setError(null);
      } catch (nextError) {
        if (!active) return;
        setError(nextError instanceof Error ? nextError.message : "No se pudo iniciar el carrito.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [authenticated, customerLoading, normalizeAuthenticatedCouponSession]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const runThrottledRefresh = () => {
      const now = Date.now();
      if (now - refreshThrottleRef.current < CART_REFRESH_THROTTLE_MS) return;
      refreshThrottleRef.current = now;
      void refreshCart();
    };

    const onFocus = () => {
      runThrottledRefresh();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      runThrottledRefresh();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refreshCart]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onCheckoutCompleted = (event: Event) => {
      const customEvent = event as CustomEvent<{ orderId?: number; approved?: boolean }>;
      const detail = customEvent.detail || {};
      if (!detail.approved) return;
      const orderId = Number(detail.orderId || 0);
      if (orderId > 0) {
        const idempotencyKey = `${CHECKOUT_CLEARED_ORDER_PREFIX}${orderId}`;
        const alreadyProcessed =
          window.sessionStorage.getItem(idempotencyKey) === "1" ||
          window.localStorage.getItem(idempotencyKey) === "1";
        if (alreadyProcessed) return;
        window.sessionStorage.setItem(idempotencyKey, "1");
        window.localStorage.setItem(idempotencyKey, "1");
      }

      window.localStorage.removeItem(GUEST_CART_STORAGE_KEY);
      window.localStorage.removeItem(PERSONALIZA_CHECKOUT_CONTEXT_STORAGE_KEY);

      if (!authenticated) {
        const nextGuest = buildGuestCart();
        setCart(nextGuest);
        setCouponSessionMarker(false);
        return;
      }

      void (async () => {
        try {
          await clearWebCart();
        } catch {
          // Fallback to backend source of truth in case clear endpoint races with payment processing.
        } finally {
          await refreshCart();
          await refreshOrders();
        }
      })();
    };

    window.addEventListener(CHECKOUT_COMPLETED_EVENT_NAME, onCheckoutCompleted as EventListener);
    return () => {
      window.removeEventListener(CHECKOUT_COMPLETED_EVENT_NAME, onCheckoutCompleted as EventListener);
    };
  }, [authenticated, refreshCart, refreshOrders]);

  const addItem = useCallback(
    async (productId: number, quantity = 1, guestItem?: GuestCartItemInput) => {
      if (!authenticated) {
        const nextQuantity = Math.min(CART_MAX_UNITS_PER_ITEM, Math.max(1, Number(quantity) || 1));
        const current = parseGuestStorage();
        const index = current.items.findIndex((item) => item.product_id === productId);

        const nextItems = [...current.items];
        if (index >= 0) {
          const existing = nextItems[index];
          const allowedQuantity = Math.max(0, Math.min(nextQuantity, CART_MAX_UNITS_PER_ITEM - existing.quantity));
          if (allowedQuantity <= 0) {
            return current;
          }
          const mergedQuantity = existing.quantity + allowedQuantity;
          const unitPriceOverride = Number(guestItem?.unit_price_override ?? guestItem?.unit_price) || 0;
          const nextUnitPrice = unitPriceOverride > 0 ? unitPriceOverride : existing.unit_price;
          const mergedTotal = existing.quantity * existing.unit_price + allowedQuantity * nextUnitPrice;
          nextItems[index] = {
            ...existing,
            quantity: mergedQuantity,
            unit_price: mergedQuantity > 0 ? mergedTotal / mergedQuantity : existing.unit_price,
            line_total: mergedTotal,
            combo_context_json: mergeComboContext(existing.combo_context_json, guestItem?.combo_context_json),
          };
        } else {
          if (!guestItem) {
            throw new Error("No se pudo agregar este producto en modo invitado.");
          }
          const unitPriceOverride = Number(guestItem.unit_price_override ?? guestItem.unit_price) || 0;
          const unitPrice = unitPriceOverride > 0 ? unitPriceOverride : Number(guestItem.unit_price) || 0;
          nextItems.unshift({
            id: productId,
            product_id: productId,
            product_name: guestItem.product_name,
            product_slug: guestItem.product_slug,
            product_sku: guestItem.product_sku || null,
            image_url: guestItem.image_url || null,
            brand: guestItem.brand || null,
            stock_status: guestItem.stock_status || "in_stock",
            quantity: nextQuantity,
            unit_price: unitPrice,
            compare_price: typeof guestItem.compare_price === "number" ? guestItem.compare_price : null,
            line_total: unitPrice * nextQuantity,
            combo_context_json: cloneComboContext(guestItem.combo_context_json),
          });
        }

        const nextCart = recalculateGuestCart(nextItems);
        setCart(nextCart);
        persistGuestCart(nextCart);
        setError(null);
        return nextCart;
      }

      const nextCart = await addWebCartItem({
        product_id: productId,
        quantity: Math.min(CART_MAX_UNITS_PER_ITEM, Math.max(1, Number(quantity) || 1)),
        unit_price_snapshot:
          typeof guestItem?.unit_price_override === "number" && guestItem.unit_price_override > 0
            ? guestItem.unit_price_override
            : undefined,
        combo_context_json: cloneComboContext(guestItem?.combo_context_json) || undefined,
      });
      setCart(nextCart);
      setCouponSessionMarker(hasActiveCoupon(nextCart));
      setError(null);
      return nextCart;
    },
    [authenticated, hasActiveCoupon]
  );

  const updateItem = useCallback(async (productId: number, quantity: number) => {
    if (!authenticated) {
      const current = parseGuestStorage();
      const nextItems = current.items
        .map((item) => {
          if (item.product_id !== productId) return item;
          if (quantity <= 0) return null;
          const nextQuantity = Math.min(CART_MAX_UNITS_PER_ITEM, Math.max(1, Number(quantity) || 1));
          return {
            ...item,
            quantity: nextQuantity,
            line_total: item.unit_price * nextQuantity,
          };
        })
        .filter((item): item is WebCartItem => Boolean(item));

      const nextCart = recalculateGuestCart(nextItems);
      setCart(nextCart);
      persistGuestCart(nextCart);
      setError(null);
      return nextCart;
    }

    const nextCart = await updateWebCartItem(
      productId,
      Math.min(CART_MAX_UNITS_PER_ITEM, Math.max(1, Number(quantity) || 1))
    );
    setCart(nextCart);
    setCouponSessionMarker(hasActiveCoupon(nextCart));
    setError(null);
    return nextCart;
  }, [authenticated, hasActiveCoupon]);

  const removeItem = useCallback(async (productId: number) => {
    if (!authenticated) {
      const current = parseGuestStorage();
      const nextItems = current.items.filter((item) => item.product_id !== productId);
      const nextCart = recalculateGuestCart(nextItems);
      setCart(nextCart);
      persistGuestCart(nextCart);
      setError(null);
      return nextCart;
    }

    const nextCart = await removeWebCartItem(productId);
    setCart(nextCart);
    setCouponSessionMarker(hasActiveCoupon(nextCart));
    setError(null);
    return nextCart;
  }, [authenticated, hasActiveCoupon]);

  const clear = useCallback(async () => {
    if (!authenticated) {
      const nextGuest = buildGuestCart();
      setCart(nextGuest);
      persistGuestCart(nextGuest);
      setCouponSessionMarker(false);
      setError(null);
      return;
    }

    await clearWebCart();
    setCart(buildGuestCart());
    setCouponSessionMarker(false);
    setError(null);
  }, [authenticated]);

  const applyCoupon = useCallback(async (code: string) => {
    if (!authenticated) {
      throw new Error("Debes iniciar sesión para aplicar cupones.");
    }
    const nextCart = await applyWebCartCoupon(code);
    setCart(nextCart);
    setCouponSessionMarker(hasActiveCoupon(nextCart));
    setError(null);
    return nextCart;
  }, [authenticated, hasActiveCoupon]);

  const clearCoupon = useCallback(async () => {
    if (!authenticated) {
      const nextCart = parseGuestStorage();
      setCart(nextCart);
      setCouponSessionMarker(false);
      setError(null);
      return nextCart;
    }
    const nextCart = await clearWebCartCoupon();
    setCart(nextCart);
    setCouponSessionMarker(false);
    setError(null);
    return nextCart;
  }, [authenticated]);

  const createOrder = useCallback(async (notes?: string) => {
    const nextOrder = await createWebOrderFromCart(notes);
    setOrders((current) => [nextOrder, ...current]);
    await refreshCart();
    setError(null);
    return nextOrder;
  }, [refreshCart]);

  const value = useMemo<WebCartContextValue>(
    () => ({
      cart,
      orders,
      loading,
      ordersLoading,
      refreshing,
      error,
      refreshCart,
      refreshOrders,
      addItem,
      updateItem,
      removeItem,
      clear,
      applyCoupon,
      clearCoupon,
      createOrder,
    }),
    [
      addItem,
      cart,
      clear,
      applyCoupon,
      clearCoupon,
      createOrder,
      error,
      loading,
      orders,
      ordersLoading,
      refreshCart,
      refreshOrders,
      refreshing,
      removeItem,
      updateItem,
    ]
  );

  return <WebCartContext.Provider value={value}>{children}</WebCartContext.Provider>;
}

export function useWebCart() {
  const context = useContext(WebCartContext);
  if (!context) {
    throw new Error("useWebCart must be used within WebCartProvider");
  }
  return context;
}
