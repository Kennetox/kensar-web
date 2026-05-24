"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  fetchCheckoutOrderPaymentStatus,
  type WebCheckoutOrderPaymentStatus,
} from "@/app/lib/webCart";
import { gaPurchase } from "@/app/lib/ga4";
import { purchase } from "@/app/lib/meta-pixel";

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

type CheckoutResultContext = {
  cartItems?: Array<{
    id: number;
    product_id: number;
    product_name: string;
    image_url?: string | null;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
  subtotal?: number;
  total?: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string | null;
  customerTaxId?: string | null;
  deliveryMode?: "pickup" | "shipping";
  shippingLabel?: string;
  shippingAddress?: string;
  billingName?: string;
  billingAddress?: string;
  paymentMethodLabel?: string;
  paymentMethodDetail?: string;
  savedAt?: string;
};

const PICKUP_ADDRESS_FULL = "Cra 24 #30-75, Palmira, Valle del Cauca, Colombia";
const CHECKOUT_RESULT_CONTEXT_STORAGE_PREFIX = "kensar_web_checkout_result_context_";
const GUEST_CART_STORAGE_KEY = "kensar_web_guest_cart_v1";
const PERSONALIZA_CHECKOUT_CONTEXT_STORAGE_KEY = "kensar_web_personaliza_checkout_context_v1";
const SUPPORT_EMAIL = "kensarelec@gmail.com";
const META_PURCHASE_SENT_PREFIX = "meta_purchase_sent_order_";
const CHECKOUT_COMPLETED_EVENT_NAME = "kensar:checkout-completed";
const CHECKOUT_CLEARED_ORDER_PREFIX = "kensar_web_checkout_cleared_order_";

function firstNameFromFullName(fullName?: string | null): string {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  return parts[0] || "cliente";
}

function getPaymentStatusLabel(
  value?: "pending" | "approved" | "failed" | "cancelled" | "refunded" | string | null
): string {
  const normalized = (value || "").trim().toLowerCase();
  if (normalized === "approved") return "Aprobado";
  if (normalized === "failed") return "Rechazado";
  if (normalized === "cancelled") return "Cancelado";
  if (normalized === "pending") return "Pendiente";
  if (normalized === "refunded") return "Reembolsado";
  return normalized || "Pendiente";
}

function normalizeImageUrl(value?: string | null): string | null {
  const raw = (value || "").trim();
  if (!raw) return null;
  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("data:") ||
    raw.startsWith("blob:") ||
    raw.startsWith("/")
  ) {
    return raw;
  }
  return `/${raw}`;
}

function normalizeStatusValue(value?: string | null): string {
  return (value || "").trim().toLowerCase();
}

function isApprovedFromBackend(status: WebCheckoutOrderPaymentStatus | null): boolean {
  if (!status) return false;
  const paymentStatus = normalizeStatusValue(status.payment_status);
  const orderStatus = normalizeStatusValue(status.status);
  return (
    paymentStatus === "approved" ||
    paymentStatus === "aprobado" ||
    paymentStatus === "paid" ||
    paymentStatus === "success" ||
    orderStatus === "approved" ||
    orderStatus === "aprobado" ||
    orderStatus === "paid" ||
    orderStatus === "success"
  );
}

function isTerminalPaymentStatus(value?: string | null): boolean {
  const normalized = normalizeStatusValue(value);
  return ["approved", "failed", "cancelled", "refunded"].includes(normalized);
}

function normalizeTerminalPaymentQueryValue(value?: string | null): "approved" | "failed" | "cancelled" | "refunded" | null {
  const normalized = normalizeStatusValue(value);
  if (normalized === "approved") return "approved";
  if (normalized === "failed") return "failed";
  if (normalized === "cancelled") return "cancelled";
  if (normalized === "refunded") return "refunded";
  return null;
}

function PendingRingIcon({ size = 26 }: { size?: number }) {
  const center = size / 2;
  const maxThickness = Math.max(4, size * 0.2);
  const minThickness = Math.max(1.25, size * 0.05);
  const outerRadius = center - 1;
  const startDeg = -104;
  const endDeg = 200;
  const segments = 70;

  const toXY = (deg: number, radius: number) => {
    const rad = (deg * Math.PI) / 180;
    return { x: center + radius * Math.cos(rad), y: center + radius * Math.sin(rad) };
  };

  const outerPoints: string[] = [];
  const innerPoints: string[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const angle = startDeg + (endDeg - startDeg) * t;
    const thickness = minThickness + (maxThickness - minThickness) * t;
    const outer = toXY(angle, outerRadius);
    const inner = toXY(angle, outerRadius - thickness);
    outerPoints.push(`${outer.x.toFixed(3)},${outer.y.toFixed(3)}`);
    innerPoints.push(`${inner.x.toFixed(3)},${inner.y.toFixed(3)}`);
  }

  const pathD = `M ${outerPoints.join(" L ")} L ${innerPoints.reverse().join(" L ")} Z`;
  const startMid = toXY(startDeg, outerRadius - minThickness / 2);
  const endMid = toXY(endDeg, outerRadius - maxThickness / 2);

  return (
    <span className="inline-flex checkout-pending-ring-spin" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <defs>
          <linearGradient id="checkout-pending-ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>
        </defs>
        <path d={pathD} fill="url(#checkout-pending-ring-gradient)" />
        <circle cx={startMid.x} cy={startMid.y} r={minThickness / 2} fill="#334155" />
        <circle cx={endMid.x} cy={endMid.y} r={maxThickness / 2} fill="#020617" />
      </svg>
    </span>
  );
}

function CheckoutResultContent() {
  const searchParams = useSearchParams();
  const orderIdParam = searchParams.get("orderId");
  const paymentHint = (searchParams.get("payment") || "").toLowerCase();
  const providerHint = (searchParams.get("provider") || "").trim().toLowerCase();
  const hintFailure = paymentHint === "failure";
  const hintPending = paymentHint === "pending";
  const hintSuccess = paymentHint === "success";
  const accessTokenParam = (searchParams.get("accessToken") || "").trim();
  const orderId = Number(orderIdParam || 0);
  const invalidOrder = !orderId || Number.isNaN(orderId);
  const [accessToken, setAccessToken] = useState(accessTokenParam);
  const [tokenReady, setTokenReady] = useState(Boolean(accessTokenParam) || invalidOrder);
  const [status, setStatus] = useState<WebCheckoutOrderPaymentStatus | null>(null);
  const [loading, setLoading] = useState(orderId > 0);
  const [error, setError] = useState<string | null>(null);
  const [checkoutContext, setCheckoutContext] = useState<CheckoutResultContext | null>(null);
  const summaryAnchorRef = useRef<HTMLDivElement | null>(null);
  const summaryCardRef = useRef<HTMLElement | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isNearSummaryArea, setIsNearSummaryArea] = useState(false);
  const trackedPurchaseRef = useRef<string | null>(null);

  useEffect(() => {
    if (invalidOrder) {
      setTokenReady(true);
      return;
    }
    if (accessTokenParam) {
      setAccessToken(accessTokenParam);
      setTokenReady(true);
      return;
    }
    if (typeof window === "undefined") return;
    try {
      const stored = (window.localStorage.getItem(`kensar_web_guest_order_token_${orderId}`) || "").trim();
      if (stored) setAccessToken(stored);
    } catch {
      // Ignore storage failures.
    } finally {
      setTokenReady(true);
    }
  }, [accessTokenParam, invalidOrder, orderId]);

  useEffect(() => {
    if (invalidOrder) {
      setCheckoutContext(null);
      return;
    }
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(`${CHECKOUT_RESULT_CONTEXT_STORAGE_PREFIX}${orderId}`);
      if (!raw) {
        setCheckoutContext(null);
        return;
      }
      const parsed = JSON.parse(raw) as CheckoutResultContext;
      setCheckoutContext(parsed && typeof parsed === "object" ? parsed : null);
    } catch {
      setCheckoutContext(null);
    }
  }, [invalidOrder, orderId]);

  useEffect(() => {
    if (invalidOrder || !tokenReady) return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 20;

    const loadStatus = async () => {
      attempts += 1;
      try {
        const next = await fetchCheckoutOrderPaymentStatus(
          orderId,
          accessToken || undefined,
          paymentHint || undefined,
          providerHint || undefined
        );
        if (cancelled) return;
        setStatus(next);
        setError(null);
        if (
          hintSuccess &&
          isTerminalPaymentStatus(next.payment_status)
        ) {
          setLoading(false);
          return;
        }
        const pending = normalizeStatusValue(next.payment_status) === "pending";
        if (!pending || attempts >= maxAttempts) {
          setLoading(false);
          return;
        }
        window.setTimeout(() => {
          if (!cancelled) void loadStatus();
        }, 3000);
      } catch (nextError) {
        if (cancelled) return;
        setError(nextError instanceof Error ? nextError.message : "No se pudo validar el pago.");
        setLoading(false);
      }
    };

    void loadStatus();
    return () => {
      cancelled = true;
    };
  }, [accessToken, hintSuccess, invalidOrder, orderId, paymentHint, providerHint, tokenReady]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!status || loading) return;
    if (!isTerminalPaymentStatus(status.payment_status)) return;
    if (!orderId || Number.isNaN(orderId)) return;

    const params = new URLSearchParams();
    params.set("orderId", String(orderId));
    if (providerHint) params.set("provider", providerHint);
    const terminalPayment = normalizeTerminalPaymentQueryValue(status.payment_status);
    if (terminalPayment) params.set("payment", terminalPayment);
    const nextUrl = `/pago/resultado?${params.toString()}`;
    if (window.location.pathname + window.location.search === nextUrl) return;
    window.history.replaceState({}, "", nextUrl);
  }, [loading, orderId, providerHint, status]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isApprovedFromBackend(status)) return;

    const idempotencyKey =
      orderId > 0 && !Number.isNaN(orderId) ? `${CHECKOUT_CLEARED_ORDER_PREFIX}${orderId}` : "";
    const alreadyProcessed = idempotencyKey
      ? window.sessionStorage.getItem(idempotencyKey) === "1" ||
        window.localStorage.getItem(idempotencyKey) === "1"
      : false;
    if (!alreadyProcessed && idempotencyKey) {
      window.sessionStorage.setItem(idempotencyKey, "1");
      window.localStorage.setItem(idempotencyKey, "1");
    }

    try {
      window.localStorage.removeItem(GUEST_CART_STORAGE_KEY);
      window.localStorage.removeItem(`kensar_web_guest_order_token_${orderId}`);
      window.localStorage.removeItem(`${CHECKOUT_RESULT_CONTEXT_STORAGE_PREFIX}${orderId}`);
      window.localStorage.removeItem(PERSONALIZA_CHECKOUT_CONTEXT_STORAGE_KEY);
    } catch {
      // Ignore storage failures.
    }
    window.dispatchEvent(
      new CustomEvent(CHECKOUT_COMPLETED_EVENT_NAME, {
        detail: {
          orderId,
          approved: true,
        },
      })
    );
  }, [orderId, status]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!status || loading) return;
    if (!isApprovedFromBackend(status)) return;
    if (!orderId || Number.isNaN(orderId)) return;

    const resolvedOrderId = Number(status.order_id || orderId || 0);
    if (!resolvedOrderId || Number.isNaN(resolvedOrderId)) return;

    const storageKey = `${META_PURCHASE_SENT_PREFIX}${resolvedOrderId}`;
    const purchaseKey = `${resolvedOrderId}:approved`;
    const alreadyTracked =
      trackedPurchaseRef.current === purchaseKey ||
      window.sessionStorage.getItem(storageKey) === "1" ||
      window.localStorage.getItem(storageKey) === "1";
    if (alreadyTracked) return;

    purchase({
      id: status.order_id,
      items: (status.items || []).map((item) => ({
        id: item.product_id,
        name: item.product_name,
        quantity: item.quantity,
        price: item.unit_price,
      })),
      total: status.total,
      currency: status.currency || "COP",
    });
    gaPurchase({
      transaction_id: String(status.order_id || resolvedOrderId),
      value: status.total,
      currency: status.currency || "COP",
      items: (status.items || []).map((item) => ({
        item_id: String(item.product_id),
        item_name: item.product_name,
        item_variant: item.product_sku || undefined,
        price: item.unit_price,
        quantity: item.quantity,
      })),
    });

    trackedPurchaseRef.current = purchaseKey;
    try {
      window.sessionStorage.setItem(storageKey, "1");
      window.localStorage.setItem(storageKey, "1");
    } catch {
      // Ignore storage failures.
    }
  }, [loading, orderId, status]);

  const paymentLabel = useMemo(() => {
    if (status?.payment_status === "approved") return "Pago aprobado";
    if (status?.payment_status === "failed") return "Pago rechazado";
    if (status?.payment_status === "cancelled") return "Pago cancelado";
    if (status?.payment_status === "refunded") return "Pago reembolsado";
    if (hintFailure) return "Pago no aprobado";
    if (hintPending) return "Pago pendiente";
    if (hintSuccess && !loading) return "Pago en validación";
    if (loading) return "Validando pago...";
    return "Pago en validación";
  }, [hintFailure, hintPending, hintSuccess, loading, status?.payment_status]);

  const message = (() => {
    if (invalidOrder) return "No recibimos una orden válida para validar el pago.";
    if (error) return error;
    if (status?.payment_status === "approved") {
      return "Tu pedido está confirmado. Pronto recibirás un correo electrónico con la confirmación.";
    }
    if (status?.payment_status === "failed") {
      return "El pago fue rechazado. Puedes intentar nuevamente con otro medio.";
    }
    if (status?.payment_status === "cancelled") {
      return "El pago fue cancelado. Puedes volver al checkout para intentarlo de nuevo.";
    }
    if (status?.payment_status === "refunded") {
      return "Este pago aparece como reembolsado.";
    }
    if (hintFailure) {
      return "El pago no fue aprobado. Puedes intentar nuevamente con otro medio.";
    }
    if (hintPending) {
      return "Estamos validando tu pago con la plataforma de pago. La confirmación puede tardar unos segundos o, en algunos casos, unos minutos.";
    }
    return "Estamos confirmando el estado del pago con el proveedor.";
  })();

  const isApproved = isApprovedFromBackend(status);
  const isFailedLike =
    status?.payment_status === "failed" ||
    status?.payment_status === "cancelled" ||
    (hintFailure && !isApproved);
  const showPaidDetails = isApproved;
  const showRetryAction = isFailedLike;
  const toneClass =
    status?.payment_status === "approved"
      ? "is-approved"
      : isFailedLike
        ? "is-failed"
        : status?.payment_status === "refunded"
          ? "is-refunded"
          : "is-pending";
  const orderLabel = status?.web_order_number || status?.order_id || orderId;
  const resolvedCustomerName =
    (status?.customer_name || checkoutContext?.customerName || "").trim() || "Cliente";
  const greetingName = firstNameFromFullName(resolvedCustomerName);
  const resolvedCustomerEmail =
    (status?.customer_email || checkoutContext?.customerEmail || "").trim() || "No registrado";
  const deliveryMode =
    checkoutContext?.deliveryMode || ((status?.shipping_amount || 0) > 0 ? "shipping" : "pickup");
  const shippingLabel = checkoutContext?.shippingLabel || (deliveryMode === "pickup" ? "Retiro en tienda" : "Envío");
  const shippingAddress =
    checkoutContext?.shippingAddress ||
    (deliveryMode === "pickup" ? PICKUP_ADDRESS_FULL : "Dirección de envío pendiente de confirmación");
  const billingName = checkoutContext?.billingName || resolvedCustomerName;
  const billingAddress = checkoutContext?.billingAddress || shippingAddress;
  const paymentMethodLabel = checkoutContext?.paymentMethodLabel || "Método de pago";
  const paymentMethodDetail = checkoutContext?.paymentMethodDetail || "Procesado por proveedor seguro.";
  const paymentStatusLabel = getPaymentStatusLabel(status?.payment_status || paymentHint || "pending");
  const mapAddress = deliveryMode === "pickup" ? PICKUP_ADDRESS_FULL : shippingAddress;
  const mapEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(mapAddress)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  const fallbackSummaryItems =
    checkoutContext?.cartItems?.map((item, index) => ({
      id: Number(item.id) || Number(item.product_id) || index + 1,
      product_id: Number(item.product_id) || 0,
      product_name: item.product_name || "Producto",
      product_slug: "",
      product_sku: null,
      image_url: item.image_url || null,
      quantity: Math.max(1, Number(item.quantity) || 1),
      unit_price: Number(item.unit_price) || 0,
      line_discount_value: 0,
      line_total: Number(item.line_total) || 0,
    })) || [];
  const summaryItems = status?.items?.length ? status.items : fallbackSummaryItems;
  const hasSummaryItems = summaryItems.length > 0;
  const leadSummaryItem = summaryItems[0] || null;
  const leadSummaryImageUrl = normalizeImageUrl(leadSummaryItem?.image_url);
  const extraSummaryItemsCount = Math.max(0, summaryItems.length - 1);
  const showMobileFloatingSummary = hasSummaryItems && isMobileViewport && !isNearSummaryArea;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 720px)");
    const sync = () => setIsMobileViewport(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!isMobileViewport) {
      setIsNearSummaryArea(false);
      return;
    }
    if (typeof window === "undefined" || !summaryAnchorRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        setIsNearSummaryArea(Boolean(entry?.isIntersecting));
      },
      {
        root: null,
        threshold: 0.15,
        rootMargin: "0px 0px -72px 0px",
      }
    );
    observer.observe(summaryAnchorRef.current);
    return () => observer.disconnect();
  }, [isMobileViewport, hasSummaryItems]);

  return (
    <main className="site-shell internal-page section-space checkout-page-shell checkout-result-page-shell">
      <section className="checkout-layout checkout-result-layout">
        <article className={`checkout-form-card checkout-result-flow-card ${toneClass}`}>
          <header className="checkout-result-hero-v2">
            <span className={`checkout-result-hero-icon-v2${isApproved ? " is-approved" : ""}`} aria-hidden="true">
              {isApproved ? "✓" : isFailedLike ? "!" : <PendingRingIcon />}
            </span>
            <div className="checkout-result-hero-copy-v2">
              <p className="checkout-result-confirmation">Confirmación N°{status?.provider_reference || orderLabel}</p>
              <h1>{isApproved ? `¡Gracias, ${greetingName}!` : paymentLabel}</h1>
              <p className="checkout-result-note">{message}</p>
            </div>
          </header>

          {isApproved ? (
            <section className="checkout-result-section checkout-result-map-card" aria-label="Ubicación de entrega o retiro">
              <div className="checkout-result-map-frame-wrap">
                <iframe
                  title="Mapa de referencia para entrega"
                  src={mapEmbedUrl}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <div className="checkout-result-map-copy">
                <h2>Tu pedido está confirmado</h2>
                <p>{shippingLabel}: {shippingAddress}</p>
                <p>En breve te enviaremos un correo de confirmación a {resolvedCustomerEmail}.</p>
              </div>
            </section>
          ) : null}

          {showPaidDetails ? (
            <>
              <section className="checkout-result-section checkout-result-details-card">
                <h2>Detalles del pedido</h2>
                <div className="checkout-result-details-grid">
                  <div>
                    <h3>Información de contacto</h3>
                    <p>{resolvedCustomerEmail}</p>
                    <p>{resolvedCustomerName}</p>
                    {checkoutContext?.customerPhone ? <p>{checkoutContext.customerPhone}</p> : null}
                    {checkoutContext?.customerTaxId ? <p>Documento: {checkoutContext.customerTaxId}</p> : null}
                  </div>

                  <div>
                    <h3>Método de pago</h3>
                    <p>{paymentMethodLabel}</p>
                    <p>{paymentMethodDetail}</p>
                    <p>Estado: {paymentStatusLabel}</p>
                  </div>

                  <div>
                    <h3>{deliveryMode === "pickup" ? "Lugar de retiro" : "Dirección de envío"}</h3>
                    <p>{shippingAddress}</p>
                  </div>

                  <div>
                    <h3>Dirección de facturación</h3>
                    <p>{billingName}</p>
                    <p>{billingAddress}</p>
                  </div>
                </div>
              </section>

              <section className="checkout-result-section checkout-result-details-card checkout-result-receipt-block-left">
                <h2>Comprobante de pago</h2>
                <div className="checkout-result-receipt-grid-left">
                  <div className="checkout-result-receipt-line">
                    <span>Orden</span>
                    <strong>#{orderLabel}</strong>
                  </div>
                  {status?.document_number ? (
                    <div className="checkout-result-receipt-line">
                      <span>Documento</span>
                      <strong>{status.document_number}</strong>
                    </div>
                  ) : null}
                  {status?.provider_reference ? (
                    <div className="checkout-result-receipt-line">
                      <span>Referencia</span>
                      <strong>{status.provider_reference}</strong>
                    </div>
                  ) : null}
                  <div className="checkout-result-receipt-line">
                    <span>Estado</span>
                    <strong>{paymentStatusLabel}</strong>
                  </div>
                  <div className="checkout-result-receipt-line">
                    <span>Método</span>
                    <strong>{paymentMethodLabel}</strong>
                  </div>
                  {status?.currency ? (
                    <div className="checkout-result-receipt-line">
                      <span>Moneda</span>
                      <strong>{status.currency}</strong>
                    </div>
                  ) : null}
                </div>
              </section>
            </>
          ) : null}

          <section className="checkout-result-section checkout-result-footer-row">
            <p className="checkout-result-help-line">
              ¿Necesitas ayuda?{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`}>
                Ponte en contacto con nosotros
              </a>
            </p>

            <div className="checkout-result-actions-v2">
              {showRetryAction ? (
                <Link href="/pago" className="checkout-result-secondary">
                  Reintentar pago
                </Link>
              ) : null}
              {!showRetryAction ? (
                <Link href="/catalogo" className="checkout-result-primary">
                  Seguir comprando
                </Link>
              ) : null}
            </div>
          </section>
        </article>

        <div ref={summaryAnchorRef} className="checkout-mobile-payment-anchor" aria-hidden="true" />
        <aside ref={summaryCardRef} className="checkout-summary-card checkout-result-summary-card">
          <h2>Resumen de tu compra</h2>
          <div className="checkout-summary-items">
            {summaryItems.length ? (
              summaryItems.map((item) => {
                const resolvedImageUrl = normalizeImageUrl(item.image_url);
                return (
                <article key={item.id} className="checkout-summary-item">
                  <div
                    className={`checkout-summary-thumb${resolvedImageUrl ? " has-image" : ""}`}
                    style={resolvedImageUrl ? { backgroundImage: `url('${resolvedImageUrl}')` } : undefined}
                    aria-hidden="true"
                  >
                    <span className="checkout-summary-thumb-badge">{Math.max(1, Math.round(Number(item.quantity) || 1))}</span>
                  </div>
                  <div className="checkout-summary-item-copy">
                    <p>{item.product_name}</p>
                    <small>Cantidad {Math.max(1, Math.round(Number(item.quantity) || 1))}</small>
                  </div>
                  <div className="checkout-summary-item-price">
                    <strong>{formatMoney(item.line_total)}</strong>
                  </div>
                </article>
                );
              })
            ) : (
              <p className="checkout-result-note">Aún no hay ítems para mostrar en el resumen.</p>
            )}
          </div>

          <div className="checkout-summary-line">
            <span>Subtotal</span>
            <strong>{formatMoney(status?.subtotal || checkoutContext?.subtotal || 0)}</strong>
          </div>
          {(status?.discount_amount || 0) > 0 ? (
            <div className="checkout-summary-line">
              <span>Descuento</span>
              <strong>- {formatMoney(status?.discount_amount || 0)}</strong>
            </div>
          ) : null}
          <div className="checkout-summary-line">
            <span>{deliveryMode === "pickup" ? "Retiro" : "Envío"}</span>
            <small>{deliveryMode === "pickup" ? "Retiro en Cra 24 #30-75, Palmira" : "Se confirma después del pago"}</small>
          </div>
          <div className="checkout-summary-line checkout-summary-total">
            <span>Total</span>
            <strong>
              <span className="checkout-summary-currency">COP</span> {formatMoney(status?.total || checkoutContext?.total || 0)}
            </strong>
          </div>
        </aside>
      </section>

      {accessToken ? (
        <p className="checkout-result-guest-note">
          Esta compra fue procesada como invitado. Si deseas guardar tu historial, crea tu cuenta con el mismo correo.
        </p>
      ) : null}
      {showMobileFloatingSummary && leadSummaryItem ? (
        <button
          type="button"
          className="checkout-mobile-floating-summary"
          onClick={() => summaryCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
        >
          <span
            className={`checkout-mobile-floating-thumb${leadSummaryImageUrl ? " has-image" : ""}`}
            style={leadSummaryImageUrl ? { backgroundImage: `url('${leadSummaryImageUrl}')` } : undefined}
            aria-hidden="true"
          >
            {extraSummaryItemsCount > 0 ? (
              <span className="checkout-mobile-floating-thumb-badge">+{extraSummaryItemsCount}</span>
            ) : null}
          </span>
          <strong>{formatMoney(status?.total || checkoutContext?.total || 0)}</strong>
          <span className="checkout-mobile-floating-chevron" aria-hidden="true">
            <svg viewBox="0 0 16 10" fill="none">
              <path d="m2 2 6 6 6-6" />
            </svg>
          </span>
        </button>
      ) : null}
    </main>
  );
}

export default function CheckoutResultPage() {
  return (
    <Suspense
      fallback={
        <main className="site-shell internal-page section-space checkout-page-shell checkout-result-page-shell">
          <section className="checkout-layout checkout-result-layout">
            <article className="checkout-form-card checkout-result-flow-card">
              <p className="checkout-result-confirmation">Resultado de pago</p>
              <h1>Cargando estado...</h1>
            </article>
          </section>
        </main>
      }
    >
      <CheckoutResultContent />
    </Suspense>
  );
}
