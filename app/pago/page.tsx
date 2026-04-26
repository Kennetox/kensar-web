"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState, type InputHTMLAttributes, type SelectHTMLAttributes } from "react";
import { AsYouType, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";
import { useWebCart } from "@/app/components/WebCartProvider";
import { useWebCustomer } from "@/app/components/WebCustomerProvider";
import {
  createMercadoPagoGuestCheckout,
  createUnifiedCheckout,
  createWompiGuestCheckout,
  type WebCartItem,
} from "@/app/lib/webCart";

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

function splitCustomerName(fullName?: string | null) {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: "", last_name: "" };
  if (parts.length === 1) return { first_name: parts[0], last_name: "" };
  return { first_name: parts[0], last_name: parts.slice(1).join(" ") };
}

function sanitizeReturnTo(value?: string | null): string | null {
  const candidate = (value || "").trim();
  if (!candidate) return null;
  if (!candidate.startsWith("/")) return null;
  if (candidate.startsWith("//")) return null;
  if (candidate.startsWith("/carrito")) return null;
  if (candidate.startsWith("/pago")) return null;
  return candidate;
}

const COLOMBIA_DEPARTMENTS = [
  "Amazonas",
  "Antioquia",
  "Arauca",
  "Atlántico",
  "Bogotá, D.C.",
  "Bolívar",
  "Boyacá",
  "Caldas",
  "Caquetá",
  "Casanare",
  "Cauca",
  "Cesar",
  "Chocó",
  "Córdoba",
  "Cundinamarca",
  "Guainía",
  "Guaviare",
  "Huila",
  "La Guajira",
  "Magdalena",
  "Meta",
  "Nariño",
  "Norte de Santander",
  "Putumayo",
  "Quindío",
  "Risaralda",
  "San Andrés y Providencia",
  "Santander",
  "Sucre",
  "Tolima",
  "Valle del Cauca",
  "Vaupés",
  "Vichada",
] as const;

type CheckoutSnapshot = {
  items: WebCartItem[];
  subtotal: number;
  subtotalBase: number;
  couponDiscountAmount: number;
  totalWithCoupon: number;
  activeCouponCode: string;
  activeCouponPercent: number;
  subtotalWithoutDiscount: number;
};

type CheckoutResultContext = {
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  customerTaxId: string | null;
  deliveryMode: "pickup" | "shipping";
  shippingLabel: string;
  shippingAddress: string;
  billingName: string;
  billingAddress: string;
  paymentMethodLabel: string;
  paymentMethodDetail: string;
};

type CheckoutPaymentProvider = "mercadopago" | "wompi";
type PaymentVisualBadge =
  | { kind: "icon"; src: string; alt: string; width: number; height: number }
  | { kind: "text"; label: string };

const PICKUP_ADDRESS_FULL = "Cra 24 #30-75, Palmira, Valle del Cauca, Colombia";
const CHECKOUT_RESULT_CONTEXT_STORAGE_PREFIX = "kensar_web_checkout_result_context_";
const PERSONALIZA_CHECKOUT_CONTEXT_STORAGE_KEY = "kensar_web_personaliza_checkout_context_v1";
const PERSONALIZA_CHECKOUT_CONTEXT_MAX_AGE_MS = 1000 * 60 * 60 * 8;
const MERCADOPAGO_VISUAL_BADGES: PaymentVisualBadge[] = [
  { kind: "icon", src: "/payment-icons/pse.svg", alt: "PSE", width: 56, height: 22 },
  { kind: "icon", src: "/payment-icons/efecty.svg", alt: "Efecty", width: 52, height: 22 },
  { kind: "icon", src: "/payment-icons/visa.svg", alt: "Visa", width: 46, height: 20 },
  { kind: "text", label: "+2" },
];
const WOMPI_VISUAL_BADGES: PaymentVisualBadge[] = [
  { kind: "icon", src: "/payment-icons/nequi.svg", alt: "Nequi", width: 56, height: 22 },
  { kind: "icon", src: "/payment-icons/pse.svg", alt: "PSE", width: 56, height: 22 },
];

function parsePersonalizaCheckoutContext(): Record<string, unknown> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PERSONALIZA_CHECKOUT_CONTEXT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const parsedRecord = parsed as Record<string, unknown>;
    const generatedAtRaw = parsedRecord.generated_at;
    const generatedAtValue = typeof generatedAtRaw === "string" ? generatedAtRaw : "";
    const generatedAt = generatedAtValue ? new Date(generatedAtValue).getTime() : 0;
    if (generatedAt > 0 && Number.isFinite(generatedAt)) {
      if (Date.now() - generatedAt > PERSONALIZA_CHECKOUT_CONTEXT_MAX_AGE_MS) {
        window.localStorage.removeItem(PERSONALIZA_CHECKOUT_CONTEXT_STORAGE_KEY);
        return null;
      }
    }
    return parsedRecord;
  } catch {
    return null;
  }
}

function normalizeSku(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

function normalizePositiveInteger(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed));
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function buildCartSkuQuantityMap(items: WebCartItem[]): Map<string, number> {
  const qtyBySku = new Map<string, number>();
  for (const item of items) {
    const sku = normalizeSku(item.product_sku);
    if (!sku) continue;
    const quantity = normalizePositiveInteger(item.quantity);
    if (quantity <= 0) continue;
    qtyBySku.set(sku, (qtyBySku.get(sku) || 0) + quantity);
  }
  return qtyBySku;
}

function sanitizePersonalizationContextForCart(
  context: Record<string, unknown>,
  items: WebCartItem[]
): Record<string, unknown> | null {
  const qtyBySku = buildCartSkuQuantityMap(items);
  if (!qtyBySku.size) return null;

  const sourceEntriesRaw = Array.isArray(context.entries) ? context.entries : [context];
  const normalizedEntries = sourceEntriesRaw.map((entry) => toRecord(entry)).filter(Boolean) as Record<string, unknown>[];
  if (!normalizedEntries.length) return null;

  const acceptedEntries: Record<string, unknown>[] = [];
  for (let index = normalizedEntries.length - 1; index >= 0; index -= 1) {
    const entry = normalizedEntries[index];
    const binding = toRecord(entry.checkout_binding);
    const productSku = normalizeSku(binding?.product_sku);
    const personalizationSku = normalizeSku(binding?.personalization_sku);
    if (!personalizationSku) continue;

    const availableServiceQty = qtyBySku.get(personalizationSku) || 0;
    if (availableServiceQty <= 0) continue;
    if (productSku && (qtyBySku.get(productSku) || 0) <= 0) continue;

    acceptedEntries.push(entry);
    qtyBySku.set(personalizationSku, availableServiceQty - 1);
    if (productSku) {
      qtyBySku.set(productSku, Math.max(0, (qtyBySku.get(productSku) || 0) - 1));
    }
  }

  if (!acceptedEntries.length) return null;

  acceptedEntries.reverse();
  const latest = acceptedEntries[acceptedEntries.length - 1];
  return {
    ...context,
    ...latest,
    entries: acceptedEntries,
    entries_count: acceptedEntries.length,
    latest_entry_id: latest?.id || null,
    generated_at: typeof latest?.generated_at === "string" ? latest.generated_at : context.generated_at,
  };
}

function hasCartSku(items: WebCartItem[], sku: string): boolean {
  const normalized = sku.trim().toLowerCase();
  if (!normalized) return false;
  return items.some((item) => (item.product_sku || "").trim().toLowerCase() === normalized);
}

function buildSnapshotFromCart(cart: ReturnType<typeof useWebCart>["cart"]): CheckoutSnapshot {
  const items = cart?.items ?? [];
  const subtotal = cart?.subtotal ?? 0;
  const subtotalBase = cart?.subtotal_base ?? subtotal;
  const couponDiscountAmount = cart?.discount_amount ?? 0;
  const totalWithCoupon = cart?.total ?? subtotal;
  const activeCouponCode = (cart?.coupon_code || "").trim();
  const activeCouponPercent = Number(cart?.coupon_discount_percent || 0);
  const subtotalWithoutDiscount = items.reduce((acc, item) => {
    const quantity = Number(item.quantity) || 0;
    if (typeof item.compare_price === "number" && item.compare_price > item.unit_price) {
      return acc + item.compare_price * quantity;
    }
    return acc + item.unit_price * quantity;
  }, 0);
  return {
    items,
    subtotal,
    subtotalBase,
    couponDiscountAmount,
    totalWithCoupon,
    activeCouponCode,
    activeCouponPercent,
    subtotalWithoutDiscount,
  };
}

function persistGuestOrderAccessToken(orderId: number, token: string) {
  if (typeof window === "undefined") return;
  const cleaned = (token || "").trim();
  if (!cleaned) return;
  try {
    window.localStorage.setItem(`kensar_web_guest_order_token_${orderId}`, cleaned);
  } catch {
    // Ignore storage failures (private mode or disabled storage).
  }
}

function persistCheckoutResultContext(orderId: number, context: CheckoutResultContext) {
  if (typeof window === "undefined") return;
  if (!orderId || Number.isNaN(orderId)) return;
  try {
    window.localStorage.setItem(
      `${CHECKOUT_RESULT_CONTEXT_STORAGE_PREFIX}${orderId}`,
      JSON.stringify({
        ...context,
        savedAt: new Date().toISOString(),
      })
    );
  } catch {
    // Ignore storage failures (private mode or disabled storage).
  }
}

type CheckoutFieldErrors = Partial<Record<string, string>>;

type FloatingInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "placeholder"> & {
  label: string;
  invalid?: boolean;
  allowWrappedEmptyLabel?: boolean;
};

type FloatingSelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "placeholder"> & {
  label: string;
  invalid?: boolean;
};

type FloatingPhoneInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "placeholder"> & {
  label: string;
  invalid?: boolean;
};

type DetectedPhoneCountry = {
  code: string;
  dialCode: string;
};

function phoneFlagClass(code: string): string {
  const normalized = (code || "").toUpperCase();
  const knownFlags = new Set(["CO", "US", "MX", "ES", "AR", "CL", "PE", "EC"]);
  return knownFlags.has(normalized) ? `is-${normalized.toLowerCase()}` : "is-generic";
}

function detectPhoneCountry(rawValue: string): DetectedPhoneCountry | null {
  const normalized = (rawValue || "").replace(/[^\d+]/g, "");
  if (!normalized) return null;

  let country: CountryCode | undefined;

  if (normalized.startsWith("+")) {
    const typer = new AsYouType();
    typer.input(normalized);
    country = typer.getCountry();
    if (!country) {
      country = parsePhoneNumberFromString(normalized)?.country;
    }
  } else {
    country = parsePhoneNumberFromString(normalized, "CO")?.country || "CO";
  }

  if (!country) {
    return { code: "INTL", dialCode: "+" };
  }

  try {
    return {
      code: country,
      dialCode: `+${getCountryCallingCode(country)}`,
    };
  } catch {
    return { code: country, dialCode: "+" };
  }
}

function FloatingInput({
  label,
  invalid = false,
  allowWrappedEmptyLabel = false,
  className,
  ...props
}: FloatingInputProps) {
  const inputClassName = [className, invalid ? "is-invalid" : ""].filter(Boolean).join(" ");
  const resolvedId = props.id ?? (typeof props.name === "string" ? `checkout-${props.name}` : undefined);
  return (
    <div
      className={`checkout-floating-field${invalid ? " is-invalid" : ""}${
        allowWrappedEmptyLabel ? " is-empty-label-wrap" : ""
      }`}
    >
      <input {...props} id={resolvedId} placeholder=" " className={inputClassName || undefined} />
      <label htmlFor={resolvedId}>{label}</label>
    </div>
  );
}

function FloatingSelect({ label, invalid = false, className, children, onChange, ...props }: FloatingSelectProps) {
  const resolvedId = props.id ?? (typeof props.name === "string" ? `checkout-${props.name}` : undefined);
  const selectClassName = [className, invalid ? "is-invalid" : ""].filter(Boolean).join(" ");
  const initialValue =
    typeof props.value === "string"
      ? props.value
      : typeof props.defaultValue === "string"
        ? props.defaultValue
        : typeof props.defaultValue === "number"
          ? String(props.defaultValue)
          : "";
  const [internalValue, setInternalValue] = useState(initialValue);
  const currentValue =
    typeof props.value === "string"
      ? props.value
      : typeof props.value === "number"
        ? String(props.value)
        : internalValue;
  const hasValue = Boolean(currentValue);

  return (
    <div className={`checkout-floating-select${invalid ? " is-invalid" : ""}${hasValue ? " is-filled" : ""}`}>
      <select
        {...props}
        id={resolvedId}
        className={selectClassName || undefined}
        onChange={(event) => {
          setInternalValue(event.target.value);
          onChange?.(event);
        }}
      >
        {children}
      </select>
      <label htmlFor={resolvedId}>{label}</label>
      <span className="checkout-floating-select-chevron" aria-hidden="true">
        <svg viewBox="0 0 12 8" fill="none">
          <path d="M1.5 1.5 6 6l4.5-4.5" />
        </svg>
      </span>
    </div>
  );
}

function FloatingPhoneInput({
  label,
  invalid = false,
  className,
  onChange,
  ...props
}: FloatingPhoneInputProps) {
  const inputClassName = [className, invalid ? "is-invalid" : ""].filter(Boolean).join(" ");
  const resolvedId = props.id ?? (typeof props.name === "string" ? `checkout-${props.name}` : undefined);
  const initialValue =
    typeof props.value === "string"
      ? props.value
      : typeof props.defaultValue === "string"
        ? props.defaultValue
        : typeof props.defaultValue === "number"
          ? String(props.defaultValue)
          : "";
  const [internalValue, setInternalValue] = useState(initialValue);
  const currentValue =
    typeof props.value === "string"
      ? props.value
      : typeof props.value === "number"
        ? String(props.value)
        : internalValue;
  const detectedCountry = detectPhoneCountry(currentValue);
  const hasPhoneValue = Boolean(detectedCountry);

  return (
    <div
      className={`checkout-floating-field checkout-floating-phone${invalid ? " is-invalid" : ""}${
        hasPhoneValue ? " is-country-visible" : ""
      }`}
    >
      <input
        {...props}
        id={resolvedId}
        type="tel"
        inputMode="tel"
        placeholder=" "
        className={inputClassName || undefined}
        onChange={(event) => {
          setInternalValue(event.target.value);
          onChange?.(event);
        }}
      />
      <label htmlFor={resolvedId}>{label}</label>
      {detectedCountry ? (
        <span className="checkout-phone-country" aria-hidden="true">
          <span className={`checkout-phone-flag ${phoneFlagClass(detectedCountry.code)}`} title={`${detectedCountry.code} ${detectedCountry.dialCode}`} />
          <span className="checkout-phone-country-chevron">
            <svg viewBox="0 0 12 8" fill="none">
              <path d="M1.5 1.5 6 6l4.5-4.5" />
            </svg>
          </span>
        </span>
      ) : null}
    </div>
  );
}

function PagoPageContent() {
  const searchParams = useSearchParams();
  const { authenticated, customer } = useWebCustomer();
  const { cart, error, createOrder } = useWebCart();
  const [orderId, setOrderId] = useState<number | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutEmail, setCheckoutEmail] = useState(customer?.email || "");
  const [checkoutFirstName, setCheckoutFirstName] = useState((customer?.first_name || "").trim());
  const [checkoutLastName, setCheckoutLastName] = useState((customer?.last_name || "").trim());
  const [checkoutDocument, setCheckoutDocument] = useState(customer?.tax_id || "");
  const [deliveryMode, setDeliveryMode] = useState<"pickup" | "shipping">("pickup");
  const [paymentProvider, setPaymentProvider] = useState<CheckoutPaymentProvider | null>(null);
  const [billingMode, setBillingMode] = useState<"same_as_shipping" | "different">("same_as_shipping");
  const [fieldErrors, setFieldErrors] = useState<CheckoutFieldErrors>({});
  const [personalizationContext, setPersonalizationContext] = useState<Record<string, unknown> | null>(null);
  const previousCartSignatureRef = useRef<string | null>(null);

  const cartSignature = useMemo(
    () =>
      JSON.stringify({
        items: (cart?.items || []).map((item) => ({
          product_id: item.product_id,
          quantity: Number(item.quantity) || 0,
          unit_price: Number(item.unit_price) || 0,
          line_total: Number(item.line_total) || 0,
        })),
        subtotal: Number(cart?.subtotal || 0),
        total: Number(cart?.total || 0),
      }),
    [cart?.items, cart?.subtotal, cart?.total]
  );

  useEffect(() => {
    const previous = previousCartSignatureRef.current;
    if (previous === null) {
      previousCartSignatureRef.current = cartSignature;
      return;
    }
    if (previous !== cartSignature) {
      // Force a fresh order for authenticated users when cart contents change.
      setOrderId(null);
    }
    previousCartSignatureRef.current = cartSignature;
  }, [cartSignature]);

  useEffect(() => {
    setCheckoutEmail(customer?.email || "");
    setCheckoutFirstName((customer?.first_name || "").trim());
    setCheckoutLastName((customer?.last_name || "").trim());
    setCheckoutDocument(customer?.tax_id || "");
  }, [customer?.email, customer?.first_name, customer?.last_name, customer?.tax_id, customer?.phone]);

  const effectiveSnapshot = buildSnapshotFromCart(cart);
  const items = effectiveSnapshot.items;
  const hasItems = items.length > 0;
  const subtotalBase = effectiveSnapshot.subtotalBase;
  const couponDiscountAmount = effectiveSnapshot.couponDiscountAmount;
  const totalWithCoupon = effectiveSnapshot.totalWithCoupon;
  const activeCouponCode = effectiveSnapshot.activeCouponCode;
  const activeCouponPercent = effectiveSnapshot.activeCouponPercent;
  const subtotalWithoutDiscount = effectiveSnapshot.subtotalWithoutDiscount;
  const hasDiscountGap = subtotalWithoutDiscount > subtotalBase + 0.5;
  const customerNameParts = splitCustomerName(customer?.name);
  const billingFieldsOpen = deliveryMode === "pickup" || billingMode === "different";
  const safeReturnTo = useMemo(
    () => sanitizeReturnTo(searchParams.get("returnTo")),
    [searchParams]
  );
  const cartHref = `/carrito${safeReturnTo ? `?returnTo=${encodeURIComponent(safeReturnTo)}` : ""}`;
  const loginHref = `/cuenta?returnTo=${encodeURIComponent(
    `/pago${safeReturnTo ? `?returnTo=${encodeURIComponent(safeReturnTo)}` : ""}`
  )}`;

  useEffect(() => {
    const candidate = parsePersonalizaCheckoutContext();
    if (!candidate) {
      setPersonalizationContext(null);
      return;
    }
    const sanitized = sanitizePersonalizationContextForCart(candidate, items);
    if (!sanitized) {
      setPersonalizationContext(null);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(PERSONALIZA_CHECKOUT_CONTEXT_STORAGE_KEY);
      }
      return;
    }
    const binding = (sanitized.checkout_binding || null) as Record<string, unknown> | null;
    const productSku = typeof binding?.product_sku === "string" ? binding.product_sku : "";
    const personalizationSku = typeof binding?.personalization_sku === "string" ? binding.personalization_sku : "";
    const hasExpectedBase = productSku ? hasCartSku(items, productSku) : false;
    const hasExpectedService = personalizationSku ? hasCartSku(items, personalizationSku) : false;
    if (hasExpectedBase && hasExpectedService) {
      setPersonalizationContext(sanitized);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(PERSONALIZA_CHECKOUT_CONTEXT_STORAGE_KEY, JSON.stringify(sanitized));
      }
      return;
    }
    setPersonalizationContext(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(PERSONALIZA_CHECKOUT_CONTEXT_STORAGE_KEY);
    }
  }, [items]);

  function resolveMercadoPagoUrl(input: {
    sandbox_init_point?: string | null;
    init_point?: string | null;
  }): string {
    const publicKey = (process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || "").trim().toUpperCase();
    const isLiveCredentials = publicKey.startsWith("APP_USR-");
    const primaryUrl = isLiveCredentials ? input.init_point : input.sandbox_init_point;
    const fallbackUrl = isLiveCredentials ? input.sandbox_init_point : input.init_point;
    const nextUrl = (primaryUrl || fallbackUrl || "").trim();
    if (!nextUrl) {
      throw new Error("No se recibió URL de pago desde Mercado Pago.");
    }
    return nextUrl;
  }

  function getFieldElement(name: string): HTMLInputElement | HTMLSelectElement | null {
    if (typeof document === "undefined") return null;
    return document.querySelector(`[name="${name}"]`);
  }

  function getFieldValue(name: string): string {
    const field = getFieldElement(name);
    if (!field) return "";
    return String(field.value || "").trim();
  }

  function clearFieldError(name: string) {
    setFieldErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  }

  function focusFirstError(errors: CheckoutFieldErrors) {
    const firstField = Object.keys(errors)[0];
    if (!firstField) return;
    const target = getFieldElement(firstField);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => target.focus(), 220);
  }

  async function handleStartPayment() {
    if (checkoutLoading) return;
    setCheckoutError(null);
    setFieldErrors({});

    const email = checkoutEmail.trim();
    const firstName = checkoutFirstName.trim() || customerNameParts.first_name;
    const lastName = checkoutLastName.trim() || customerNameParts.last_name;
    const identification = checkoutDocument.trim();
    const nextErrors: CheckoutFieldErrors = {};

    if (!email) nextErrors.checkout_email = "Ingresa tu correo electrónico.";
    if (!firstName) nextErrors.checkout_name = "Ingresa tu nombre.";
    if (!lastName) nextErrors.checkout_lastname = "Ingresa tus apellidos.";
    if (!identification) nextErrors.checkout_document = "Ingresa tu documento.";

    if (deliveryMode === "shipping") {
      if (!getFieldValue("checkout_city")) nextErrors.checkout_city = "Ingresa tu ciudad.";
      if (!getFieldValue("checkout_address")) nextErrors.checkout_address = "Ingresa tu dirección.";
    }

    if (billingFieldsOpen) {
      if (!getFieldValue("billing_first_name")) nextErrors.billing_first_name = "Ingresa el nombre.";
      if (!getFieldValue("billing_last_name")) nextErrors.billing_last_name = "Ingresa los apellidos.";
      if (!getFieldValue("billing_address")) nextErrors.billing_address = "Ingresa la dirección.";
      if (!getFieldValue("billing_city")) nextErrors.billing_city = "Ingresa la ciudad.";
    }
    if (!paymentProvider) {
      nextErrors.checkout_payment_method = "Debes elegir un método de pago.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setCheckoutError("Completa los campos obligatorios marcados en rojo.");
      focusFirstError(nextErrors);
      return;
    }
    const selectedPaymentMethod: "card" | "wompi" = paymentProvider === "mercadopago" ? "card" : "wompi";
    const checkoutPhone = getFieldValue("checkout_phone");
    const checkoutCountryCode = getFieldValue("checkout_country") || "CO";
    const checkoutAddress = getFieldValue("checkout_address");
    const checkoutAddress2 = getFieldValue("checkout_address_2");
    const checkoutCity = getFieldValue("checkout_city");
    const checkoutState = getFieldValue("checkout_state") || "Valle del Cauca";
    const checkoutZip = getFieldValue("checkout_zip");
    const checkoutCountry = checkoutCountryCode === "CO" ? "Colombia" : checkoutCountryCode;
    const shippingAddress = [checkoutAddress, checkoutAddress2, checkoutCity, checkoutState, checkoutCountry]
      .map((value) => value.trim())
      .filter(Boolean)
      .join(", ");
    const shippingLabel = deliveryMode === "pickup" ? "Retiro en tienda" : "Envío a domicilio";
    const billingFirstName = getFieldValue("billing_first_name");
    const billingLastName = getFieldValue("billing_last_name");
    const billingAddress = getFieldValue("billing_address");
    const billingAddress2 = getFieldValue("billing_address_2");
    const billingCity = getFieldValue("billing_city");
    const billingState = getFieldValue("billing_state") || checkoutState;
    const billingCountry = getFieldValue("billing_country") || checkoutCountry;
    const billingZip = getFieldValue("billing_zip");
    const billingCompany = getFieldValue("billing_company");
    const billingPhone = getFieldValue("billing_phone");
    const resolvedShippingAddress =
      deliveryMode === "pickup"
        ? PICKUP_ADDRESS_FULL
        : shippingAddress || "Dirección a confirmar";
    const resolvedBillingName =
      deliveryMode === "shipping" && billingMode === "same_as_shipping"
        ? [firstName, lastName].filter(Boolean).join(" ").trim()
        : [billingFirstName, billingLastName].filter(Boolean).join(" ").trim();
    const resolvedBillingAddress =
      deliveryMode === "shipping" && billingMode === "same_as_shipping"
        ? resolvedShippingAddress
        : [billingAddress, billingAddress2, billingCity, billingState, billingCountry]
            .map((value) => value.trim())
            .filter(Boolean)
            .join(", ");
    const checkoutResultContext: CheckoutResultContext = {
      customerName: [firstName, lastName].filter(Boolean).join(" ").trim() || email,
      customerEmail: email,
      customerPhone: checkoutPhone || null,
      customerTaxId: identification || null,
      deliveryMode,
      shippingLabel,
      shippingAddress: resolvedShippingAddress,
      billingName: resolvedBillingName || [firstName, lastName].filter(Boolean).join(" ").trim() || email,
      billingAddress: resolvedBillingAddress || resolvedShippingAddress,
      paymentMethodLabel:
        paymentProvider === "mercadopago" ? "Mercado Pago" : "Wompi",
      paymentMethodDetail:
        paymentProvider === "mercadopago"
          ? "PSE, Efecty y billetera Mercado Pago."
          : "PSE y Nequi en checkout de Wompi.",
    };
    const checkoutContextPayload: Record<string, unknown> = {
      flow: authenticated ? "authenticated" : "guest",
      payment_provider: paymentProvider,
      payment_method: selectedPaymentMethod,
      delivery_mode: deliveryMode,
      billing_mode: deliveryMode === "shipping" ? billingMode : "pickup",
      contact: {
        email,
        first_name: firstName || null,
        last_name: lastName || null,
        document_number: identification || null,
        phone: checkoutPhone || null,
      },
      shipping: {
        country: checkoutCountry || null,
        country_code: checkoutCountryCode || null,
        state: checkoutState || null,
        city: checkoutCity || null,
        address_line_1: checkoutAddress || null,
        address_line_2: checkoutAddress2 || null,
        zip: checkoutZip || null,
        label: shippingLabel,
        full_address: resolvedShippingAddress || null,
      },
      billing: {
        country: billingCountry || null,
        state: billingState || null,
        city: billingCity || null,
        address_line_1: billingAddress || null,
        address_line_2: billingAddress2 || null,
        zip: billingZip || null,
        company: billingCompany || null,
        phone: billingPhone || null,
        first_name: billingFirstName || null,
        last_name: billingLastName || null,
        full_name: resolvedBillingName || null,
        full_address: resolvedBillingAddress || null,
      },
      cart_summary: {
        subtotal_base: subtotalBase,
        coupon_discount_amount: couponDiscountAmount,
        total_with_coupon: totalWithCoupon,
        active_coupon_code: activeCouponCode || null,
        active_coupon_percent: activeCouponPercent,
        items: items.map((item) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          product_sku: item.product_sku,
          quantity: Number(item.quantity) || 0,
          unit_price: Number(item.unit_price) || 0,
          line_total: Number(item.line_total) || 0,
        })),
      },
      checkout_result_context: checkoutResultContext,
    };
    if (personalizationContext) {
      checkoutContextPayload.personalization = personalizationContext;
    }

    setCheckoutLoading(true);
    try {
      if (!authenticated) {
        const guestName = [firstName, lastName].filter(Boolean).join(" ").trim();
        const guestPayload = {
          items: items.map((item) => ({
            product_id: item.product_id,
            quantity: Math.max(1, Number(item.quantity) || 1),
          })),
          customer_email: email,
          customer_name: guestName || email,
          customer_phone: checkoutPhone || undefined,
          customer_tax_id: identification || undefined,
          customer_address: resolvedShippingAddress || undefined,
          checkout_context: checkoutContextPayload,
        };
        const init =
          selectedPaymentMethod === "card"
            ? await createMercadoPagoGuestCheckout({
                ...guestPayload,
                payer: {
                  email,
                  first_name: firstName || undefined,
                  last_name: lastName || undefined,
                  identification: identification
                    ? {
                        type: "CC",
                        number: identification,
                      }
                    : undefined,
                },
              })
            : await createWompiGuestCheckout(guestPayload);
        setOrderId(init.order_id);
        if (init.order_access_token) {
          persistGuestOrderAccessToken(init.order_id, init.order_access_token);
        }
        persistCheckoutResultContext(init.order_id, checkoutResultContext);
        if (init.provider === "mercadopago") {
          window.location.href = resolveMercadoPagoUrl(init);
          return;
        }
        const wompiGuestUrl =
          (typeof init.checkout_url === "string" ? init.checkout_url : "") ||
          (typeof init.async_payment_url === "string" ? init.async_payment_url : "") ||
          (typeof init.redirect_url === "string" ? init.redirect_url : "");
        if (!wompiGuestUrl) {
          window.location.href = `/pago/resultado?orderId=${encodeURIComponent(String(init.order_id))}&provider=wompi&payment=pending`;
          return;
        }
        window.location.href = wompiGuestUrl;
        return;
      }

      let nextOrderId = orderId;
      if (!nextOrderId) {
        const createdOrder = await createOrder();
        nextOrderId = createdOrder.id;
        setOrderId(createdOrder.id);
      }

      const init = await createUnifiedCheckout({
        order_id: nextOrderId,
        payment_method: selectedPaymentMethod,
        checkout_context: checkoutContextPayload,
        payer: {
          email,
          first_name: firstName || undefined,
          last_name: lastName || undefined,
          identification: identification
            ? {
                type: "CC",
                number: identification,
                }
              : undefined,
        },
        customer_email: email,
        customer_phone: checkoutPhone || undefined,
        customer_full_name: [firstName, lastName].filter(Boolean).join(" ").trim() || undefined,
      });
      persistCheckoutResultContext(nextOrderId, checkoutResultContext);
      if (init.provider === "mercadopago") {
        window.location.href = resolveMercadoPagoUrl(init);
        return;
      }

      const wompiUrl =
        (typeof init.checkout_url === "string" ? init.checkout_url : "") ||
        (typeof init.async_payment_url === "string" ? init.async_payment_url : "") ||
        (typeof init.redirect_url === "string" ? init.redirect_url : "");
      if (!wompiUrl) {
        window.location.href = `/pago/resultado?orderId=${encodeURIComponent(String(nextOrderId))}&provider=wompi&payment=pending`;
        return;
      }
      window.location.href = wompiUrl;
    } catch (nextError) {
      setCheckoutError(nextError instanceof Error ? nextError.message : "No se pudo iniciar el pago.");
    } finally {
      setCheckoutLoading(false);
    }
  }

  return (
    <main className="site-shell internal-page section-space checkout-page-shell">
      {error ? <p className="account-feedback error">{error}</p> : null}

      {!hasItems ? (
        <section className="cart-guest-card">
          <h2>Tu carrito está vacío</h2>
          <p>Agrega productos en el catálogo para avanzar al checkout.</p>
          <div className="account-action-row">
            <Link href="/catalogo" className="account-primary-btn">
              Ir al catálogo
            </Link>
            <Link href={cartHref} className="account-secondary-btn">
              Ver carrito
            </Link>
          </div>
        </section>
      ) : (
        <section className="checkout-layout">
          <article className="checkout-form-card">
            <form
              className="checkout-form-narrow"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                void handleStartPayment();
              }}
            >
              <header className="checkout-form-header">
                <p className="account-section-kicker">Pago</p>
                <h1>Contacto y entrega</h1>
                <p>Completa tus datos para confirmar modalidad de entrega, disponibilidad y pago.</p>
                {!authenticated ? (
                  <p className="guest-mode-note checkout-guest-note">
                    Compra como invitado sin crear cuenta.{" "}
                    <Link href={loginHref} className="guest-mode-note-link guest-mode-note-link-dark">
                      Iniciar sesión (opcional)
                    </Link>
                  </p>
                ) : null}
              </header>

              <section
                className="checkout-form-section"
                key={`checkout-contact-${customer?.id ?? "guest"}-${customer?.updated_at ?? "na"}`}
              >
                <div className="checkout-form-section-head">
                  <h2>Contacto</h2>
                </div>
                <FloatingInput
                  type="email"
                  name="checkout_email"
                  autoComplete="email"
                  invalid={Boolean(fieldErrors.checkout_email)}
                  value={checkoutEmail}
                  onChange={(event) => {
                    setCheckoutEmail(event.target.value);
                    clearFieldError("checkout_email");
                  }}
                  label="Email o número de teléfono móvil"
                />
                {fieldErrors.checkout_email ? <p className="checkout-field-error">{fieldErrors.checkout_email}</p> : null}
              </section>

              <section className="checkout-form-section">
                <h2>Entrega</h2>
                <div className="checkout-delivery-toggle" role="tablist" aria-label="Modalidad de entrega">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={deliveryMode === "pickup"}
                    className={`checkout-delivery-option${deliveryMode === "pickup" ? " is-active" : ""}`}
                    onClick={() => setDeliveryMode("pickup")}
                  >
                    <span className="checkout-delivery-option-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none">
                        <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" />
                        <circle cx="12" cy="11" r="2.3" />
                      </svg>
                    </span>
                    <span>Retiro en tienda</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={deliveryMode === "shipping"}
                    className={`checkout-delivery-option${deliveryMode === "shipping" ? " is-active" : ""}`}
                    onClick={() => setDeliveryMode("shipping")}
                  >
                    <span className="checkout-delivery-option-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none">
                        <path d="M12 3 4.5 7.2v9.6L12 21l7.5-4.2V7.2L12 3Z" />
                        <path d="M12 21V11.8" />
                        <path d="m4.5 7.2 7.5 4.6 7.5-4.6" />
                      </svg>
                    </span>
                    <span>Envío a domicilio</span>
                  </button>
                </div>

                <div className="checkout-form-grid checkout-form-grid-2">
                  <FloatingInput
                    type="text"
                    name="checkout_name"
                    autoComplete="given-name"
                    invalid={Boolean(fieldErrors.checkout_name)}
                    value={checkoutFirstName}
                    onChange={(event) => {
                      setCheckoutFirstName(event.target.value);
                      clearFieldError("checkout_name");
                    }}
                    label="Nombre"
                  />
                  <FloatingInput
                    type="text"
                    name="checkout_lastname"
                    autoComplete="family-name"
                    invalid={Boolean(fieldErrors.checkout_lastname)}
                    value={checkoutLastName}
                    onChange={(event) => {
                      setCheckoutLastName(event.target.value);
                      clearFieldError("checkout_lastname");
                    }}
                    label="Apellidos"
                  />
                </div>
                {(fieldErrors.checkout_name || fieldErrors.checkout_lastname) ? (
                  <div className="checkout-form-grid checkout-form-grid-2 checkout-field-error-row">
                    {fieldErrors.checkout_name ? (
                      <p className="checkout-field-error">{fieldErrors.checkout_name}</p>
                    ) : (
                      <span />
                    )}
                    {fieldErrors.checkout_lastname ? (
                      <p className="checkout-field-error">{fieldErrors.checkout_lastname}</p>
                    ) : (
                      <span />
                    )}
                  </div>
                ) : null}

                <FloatingInput
                  type="text"
                  name="checkout_document"
                  autoComplete="off"
                  invalid={Boolean(fieldErrors.checkout_document)}
                  value={checkoutDocument}
                  onChange={(event) => {
                    setCheckoutDocument(event.target.value);
                    clearFieldError("checkout_document");
                  }}
                  label="Número de documento de identidad"
                />
                {fieldErrors.checkout_document ? (
                  <p className="checkout-field-error">{fieldErrors.checkout_document}</p>
                ) : null}

                {deliveryMode === "shipping" ? (
                  <>
                    <div className="checkout-form-grid checkout-form-grid-2">
                      <select name="checkout_country" defaultValue="CO">
                        <option value="CO">Colombia</option>
                      </select>
                      <FloatingPhoneInput
                        name="checkout_phone"
                        autoComplete="tel"
                        defaultValue={customer?.phone || ""}
                        label="Teléfono"
                      />
                    </div>

                    <FloatingInput
                      type="text"
                      name="checkout_address"
                      autoComplete="street-address"
                      invalid={Boolean(fieldErrors.checkout_address)}
                      onChange={() => clearFieldError("checkout_address")}
                      defaultValue={customer?.address || ""}
                      label="Dirección"
                    />
                    {fieldErrors.checkout_address ? (
                      <p className="checkout-field-error">{fieldErrors.checkout_address}</p>
                    ) : null}
                    <FloatingInput
                      type="text"
                      name="checkout_address_2"
                      autoComplete="address-line2"
                      label="Casa, apartamento, etc. (opcional)"
                    />

                    <div className="checkout-form-grid checkout-form-grid-3">
                      <FloatingSelect
                        name="checkout_state"
                        autoComplete="address-level1"
                        defaultValue="Valle del Cauca"
                        label="Provincia / Estado"
                        required
                      >
                        {COLOMBIA_DEPARTMENTS.map((department) => (
                          <option key={`checkout-state-${department}`} value={department}>
                            {department}
                          </option>
                        ))}
                      </FloatingSelect>
                      <FloatingInput
                        type="text"
                        name="checkout_zip"
                        autoComplete="postal-code"
                        allowWrappedEmptyLabel
                        label="Código postal (opcional)"
                      />
                      <FloatingInput
                        type="text"
                        name="checkout_city"
                        autoComplete="address-level2"
                        invalid={Boolean(fieldErrors.checkout_city)}
                        onChange={() => clearFieldError("checkout_city")}
                        label="Ciudad"
                      />
                    </div>
                    {fieldErrors.checkout_city ? <p className="checkout-field-error">{fieldErrors.checkout_city}</p> : null}

                    <div className="checkout-delivery-panel">
                      <div className="checkout-delivery-panel-head">
                        <h3>Método de envío</h3>
                      </div>
                      <label className="checkout-delivery-method checkout-delivery-method-active">
                        <span>Envío a domicilio</span>
                        <strong>VALIDACIÓN DE COBERTURA</strong>
                      </label>
                      <p className="checkout-delivery-warning">
                        El pago contraentrega está disponible en Palmira y Cali. Para otras ciudades, está sujeto a
                        validación.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="checkout-pickup-block">
                    <div className="checkout-pickup-head">
                      <h3>Lugar de retiro</h3>
                      <span className="checkout-pickup-region">Colombia</span>
                    </div>
                    <div className="checkout-pickup-card checkout-delivery-method-active">
                      <div className="checkout-pickup-address">
                        <strong>Cra 24 #30-75</strong>
                        <small>Palmira, Valle del Cauca, Colombia</small>
                      </div>
                      <strong className="checkout-pickup-mode">RETIRO EN TIENDA</strong>
                    </div>
                  </div>
                )}
              </section>

              <section className="checkout-form-section">
                <h2>Pago</h2>
                <p className="checkout-muted">
                  Todas las transacciones son seguras y están encriptadas.
                </p>
                <div
                  className={`checkout-payment-methods${fieldErrors.checkout_payment_method ? " is-invalid" : ""}`}
                  role="radiogroup"
                  aria-label="Método de pago"
                  aria-invalid={fieldErrors.checkout_payment_method ? "true" : undefined}
                  aria-describedby={fieldErrors.checkout_payment_method ? "checkout-payment-method-error" : undefined}
                >
                  <label
                    className={`checkout-payment-option${paymentProvider === "mercadopago" ? " is-active" : ""}`}
                  >
                    <span className="checkout-payment-option-radio">
                      <input
                        type="radio"
                        name="checkout_payment_method"
                        value="mercadopago"
                        checked={paymentProvider === "mercadopago"}
                        onChange={() => {
                          setPaymentProvider("mercadopago");
                          clearFieldError("checkout_payment_method");
                        }}
                      />
                    </span>
                    <span className="checkout-payment-option-copy">
                      <strong className="checkout-payment-title checkout-payment-title-primary">Mercado Pago</strong>
                      <small>PSE, Efecty y billetera Mercado Pago.</small>
                    </span>
                    <span className="checkout-payment-option-badges" aria-hidden="true">
                      {MERCADOPAGO_VISUAL_BADGES.map((badge) =>
                        badge.kind === "icon" ? (
                          <span key={badge.alt} className="checkout-payment-badge-icon">
                            <Image
                              src={badge.src}
                              alt={badge.alt}
                              width={badge.width}
                              height={badge.height}
                              className="checkout-payment-badge-image"
                            />
                          </span>
                        ) : (
                          <small key={badge.label} className="checkout-payment-badge checkout-payment-badge-text">
                            {badge.label}
                          </small>
                        )
                      )}
                    </span>
                  </label>
                  <div
                    className={`checkout-payment-option-note${paymentProvider === "mercadopago" ? " is-open" : ""}`}
                  >
                    <p>Se te redirigirá a Mercado Pago para que completes la compra.</p>
                  </div>

                  <label className={`checkout-payment-option${paymentProvider === "wompi" ? " is-active" : ""}`}>
                    <span className="checkout-payment-option-radio">
                      <input
                        type="radio"
                        name="checkout_payment_method"
                        value="wompi"
                        checked={paymentProvider === "wompi"}
                        onChange={() => {
                          setPaymentProvider("wompi");
                          clearFieldError("checkout_payment_method");
                        }}
                      />
                    </span>
                    <span className="checkout-payment-option-copy">
                      <strong className="checkout-payment-title">Wompi</strong>
                      <small>Nequi y PSE.</small>
                    </span>
                    <span className="checkout-payment-option-badges" aria-hidden="true">
                      {WOMPI_VISUAL_BADGES.map((badge) =>
                        badge.kind === "icon" ? (
                          <span key={badge.alt} className="checkout-payment-badge-icon">
                            <Image
                              src={badge.src}
                              alt={badge.alt}
                              width={badge.width}
                              height={badge.height}
                              className="checkout-payment-badge-image"
                            />
                          </span>
                        ) : (
                          <small key={badge.label} className="checkout-payment-badge checkout-payment-badge-text">
                            {badge.label}
                          </small>
                        )
                      )}
                    </span>
                  </label>
                  <div className={`checkout-payment-option-note${paymentProvider === "wompi" ? " is-open" : ""}`}>
                    <p>Se te redirigirá a Wompi para que completes la compra.</p>
                  </div>
                </div>
                {fieldErrors.checkout_payment_method ? (
                  <p id="checkout-payment-method-error" className="checkout-field-error">
                    {fieldErrors.checkout_payment_method}
                  </p>
                ) : null}
                {paymentProvider === "wompi" ? (
                  <div className="checkout-form-grid">
                    <p className="checkout-muted">
                      Al continuar te redirigiremos al checkout de Wompi para elegir el método (PSE o Nequi) y completar el pago.
                    </p>
                  </div>
                ) : null}

                <section className="checkout-billing-section" aria-label="Dirección de facturación">
                  <h3 className="checkout-billing-title">Dirección de facturación</h3>

                  {deliveryMode === "shipping" ? (
                    <div className="checkout-billing-choice" role="radiogroup" aria-label="Opción de facturación">
                      <label
                        className={`checkout-billing-choice-option${billingMode === "same_as_shipping" ? " is-active" : ""}`}
                      >
                        <input
                          type="radio"
                          name="billing_mode"
                          value="same_as_shipping"
                          checked={billingMode === "same_as_shipping"}
                          onChange={() => setBillingMode("same_as_shipping")}
                        />
                        <span>La misma dirección de envío</span>
                      </label>

                      <label
                        className={`checkout-billing-choice-option${billingMode === "different" ? " is-active" : ""}`}
                      >
                        <input
                          type="radio"
                          name="billing_mode"
                          value="different"
                          checked={billingMode === "different"}
                          onChange={() => setBillingMode("different")}
                        />
                        <span>Usar una dirección de facturación distinta</span>
                      </label>
                    </div>
                  ) : null}

                  <div
                    className={`checkout-billing-fields${
                      deliveryMode === "pickup" || billingMode === "different" ? " is-open" : ""
                    }`}
                  >
                    <div className="checkout-billing-fields-inner">
                      <div className="checkout-form-grid">
                        <select name="billing_country" defaultValue="CO">
                          <option value="CO">País / Región: Colombia</option>
                        </select>
                      </div>

                      <div className="checkout-form-grid checkout-form-grid-2">
                        <FloatingInput
                          type="text"
                          name="billing_first_name"
                          autoComplete="billing given-name"
                          invalid={Boolean(fieldErrors.billing_first_name)}
                          onChange={() => clearFieldError("billing_first_name")}
                          defaultValue={checkoutFirstName}
                          label="Nombre"
                        />
                        <FloatingInput
                          type="text"
                          name="billing_last_name"
                          autoComplete="billing family-name"
                          invalid={Boolean(fieldErrors.billing_last_name)}
                          onChange={() => clearFieldError("billing_last_name")}
                          defaultValue={checkoutLastName}
                          label="Apellidos"
                        />
                      </div>
                      {(fieldErrors.billing_first_name || fieldErrors.billing_last_name) ? (
                        <div className="checkout-form-grid checkout-form-grid-2 checkout-field-error-row">
                          {fieldErrors.billing_first_name ? (
                            <p className="checkout-field-error">{fieldErrors.billing_first_name}</p>
                          ) : (
                            <span />
                          )}
                          {fieldErrors.billing_last_name ? (
                            <p className="checkout-field-error">{fieldErrors.billing_last_name}</p>
                          ) : (
                            <span />
                          )}
                        </div>
                      ) : null}

                      <FloatingInput
                        type="text"
                        name="billing_company"
                        autoComplete="organization"
                        label="Empresa (opcional)"
                      />

                      <FloatingInput
                        type="text"
                        name="billing_address"
                        autoComplete="billing street-address"
                        invalid={Boolean(fieldErrors.billing_address)}
                        onChange={() => clearFieldError("billing_address")}
                        defaultValue={customer?.address || ""}
                        label="Dirección"
                      />
                      {fieldErrors.billing_address ? (
                        <p className="checkout-field-error">{fieldErrors.billing_address}</p>
                      ) : null}

                      <FloatingInput
                        type="text"
                        name="billing_address_2"
                        autoComplete="billing address-line2"
                        label="Casa, apartamento, etc. (opcional)"
                      />

                      <div className="checkout-form-grid checkout-form-grid-3">
                        <FloatingInput
                          type="text"
                          name="billing_city"
                          autoComplete="billing address-level2"
                          invalid={Boolean(fieldErrors.billing_city)}
                          onChange={() => clearFieldError("billing_city")}
                          label="Ciudad"
                        />
                        <FloatingSelect
                          name="billing_state"
                          autoComplete="billing address-level1"
                          defaultValue="Valle del Cauca"
                          label="Provincia / Estado"
                          required
                        >
                          {COLOMBIA_DEPARTMENTS.map((department) => (
                            <option key={`billing-state-${department}`} value={department}>
                              {department}
                            </option>
                          ))}
                        </FloatingSelect>
                        <FloatingInput
                          type="text"
                          name="billing_zip"
                          autoComplete="billing postal-code"
                          allowWrappedEmptyLabel
                          label="Código postal (opcional)"
                        />
                      </div>
                      {fieldErrors.billing_city ? (
                        <p className="checkout-field-error">{fieldErrors.billing_city}</p>
                      ) : null}

                      <FloatingPhoneInput
                        name="billing_phone"
                        autoComplete="billing tel"
                        defaultValue={customer?.phone || ""}
                        label="Teléfono (opcional)"
                      />
                    </div>
                  </div>
                </section>

                <button type="submit" className="checkout-submit-btn checkout-submit-btn-main" disabled={checkoutLoading}>
                  {checkoutLoading ? "Procesando..." : "Pagar ahora"}
                </button>
                {!authenticated ? (
                  <p className="checkout-muted">
                    Tu orden se procesará como invitado usando el correo ingresado en este checkout.
                  </p>
                ) : null}
                {checkoutError ? <p className="checkout-payment-feedback">{checkoutError}</p> : null}
              </section>
            </form>
          </article>

          <aside className="checkout-summary-card">
            <h2>Resumen de tu compra</h2>
            <div className="checkout-summary-items">
              {items.map((item) => (
                <article key={item.id} className="checkout-summary-item">
                  <div
                    className={`checkout-summary-thumb${item.image_url ? " has-image" : ""}`}
                    style={item.image_url ? { backgroundImage: `url('${item.image_url}')` } : undefined}
                    aria-hidden="true"
                  >
                    <span className="checkout-summary-thumb-badge">{item.quantity}</span>
                  </div>
                  <div className="checkout-summary-item-copy">
                    <p>{item.product_name}</p>
                    <small>Cantidad {item.quantity}</small>
                  </div>
                  <div className="checkout-summary-item-price">
                    <strong>{formatMoney(item.line_total)}</strong>
                    {typeof item.compare_price === "number" && item.compare_price > item.unit_price ? (
                      <small>{formatMoney(item.compare_price * item.quantity)}</small>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>

            <div className="checkout-summary-line">
              <span>Subtotal</span>
              <strong>{formatMoney(subtotalBase)}</strong>
            </div>
            {hasDiscountGap ? (
              <div className="checkout-summary-line checkout-summary-line-compare">
                <span>Antes</span>
                <strong>{formatMoney(subtotalWithoutDiscount)}</strong>
              </div>
            ) : null}
            {couponDiscountAmount > 0 ? (
              <div className="checkout-summary-line">
                <span>
                  Cupón {activeCouponCode ? activeCouponCode : ""}{activeCouponPercent > 0 ? ` (${activeCouponPercent}%)` : ""}
                </span>
                <strong>- {formatMoney(couponDiscountAmount)}</strong>
              </div>
            ) : null}
            <div className="checkout-summary-line">
              <span>{deliveryMode === "pickup" ? "Retiro en tienda" : "Envío a domicilio"}</span>
              <small>
                {deliveryMode === "pickup"
                  ? "Retiro en Cra 24 #30-75, Palmira"
                  : "El costo y la modalidad de envío se confirmarán por WhatsApp según tu ciudad antes del despacho."}
              </small>
            </div>
            <div className="checkout-summary-line checkout-summary-total">
              <span>Total</span>
              <strong>
                <span className="checkout-summary-currency">COP</span> {formatMoney(totalWithCoupon)}
              </strong>
            </div>
          </aside>
        </section>
      )}
    </main>
  );
}

export default function PagoPage() {
  return (
    <Suspense fallback={<main className="site-shell internal-page section-space checkout-page-shell" />}>
      <PagoPageContent />
    </Suspense>
  );
}
