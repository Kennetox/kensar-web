"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  addWebCartItem,
  clearWebCart,
  createWebOrderFromCart,
  fetchMyWebOrders,
  fetchWebCart,
  removeWebCartItem,
  updateWebCartItem,
  type WebCart,
  type WebOrderSummary,
} from "@/app/lib/webCart";
import { useWebCustomer } from "@/app/components/WebCustomerProvider";

type WebCartContextValue = {
  cart: WebCart | null;
  orders: WebOrderSummary[];
  loading: boolean;
  ordersLoading: boolean;
  refreshing: boolean;
  error: string | null;
  refreshCart: () => Promise<WebCart | null>;
  refreshOrders: () => Promise<WebOrderSummary[]>;
  addItem: (productId: number, quantity?: number) => Promise<WebCart>;
  updateItem: (productId: number, quantity: number) => Promise<WebCart>;
  removeItem: (productId: number) => Promise<WebCart>;
  clear: () => Promise<void>;
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
    subtotal: 0,
    updated_at: new Date(0).toISOString(),
  };
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

  const refreshCart = useCallback(async () => {
    if (!authenticated) {
      const guestCart = buildGuestCart();
      setCart(guestCart);
      return guestCart;
    }

    try {
      setRefreshing(true);
      setError(null);
      const nextCart = await fetchWebCart();
      setCart(nextCart);
      return nextCart;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No se pudo cargar el carrito.");
      return null;
    } finally {
      setRefreshing(false);
    }
  }, [authenticated]);

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
        setCart(buildGuestCart());
        setOrders([]);
        setLoading(false);
        return;
      }

      try {
        const [nextCart, nextOrders] = await Promise.all([fetchWebCart(), fetchMyWebOrders()]);
        if (!active) return;
        setCart(nextCart);
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
  }, [authenticated, customerLoading]);

  const addItem = useCallback(
    async (productId: number, quantity = 1) => {
      const nextCart = await addWebCartItem({ product_id: productId, quantity });
      setCart(nextCart);
      setError(null);
      return nextCart;
    },
    []
  );

  const updateItem = useCallback(async (productId: number, quantity: number) => {
    const nextCart = await updateWebCartItem(productId, quantity);
    setCart(nextCart);
    setError(null);
    return nextCart;
  }, []);

  const removeItem = useCallback(async (productId: number) => {
    const nextCart = await removeWebCartItem(productId);
    setCart(nextCart);
    setError(null);
    return nextCart;
  }, []);

  const clear = useCallback(async () => {
    await clearWebCart();
    setCart(buildGuestCart());
    setError(null);
  }, []);

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
      createOrder,
    }),
    [
      addItem,
      cart,
      clear,
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
