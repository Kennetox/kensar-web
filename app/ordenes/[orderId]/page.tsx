"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { getManualPaymentInstructions } from "@/app/lib/paymentInstructions";
import {
  fetchWebOrder,
  submitManualPaymentForOrder,
  type WebOrderDetail,
} from "@/app/lib/webCart";
import { useWebCustomer } from "@/app/components/WebCustomerProvider";

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value?: string | null) {
  if (!value) return "No disponible";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No disponible";
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function translateOrderStatus(status?: string | null): string {
  const normalized = (status || "").trim().toLowerCase();
  if (normalized === "pending_payment") return "Pendiente de pago";
  if (normalized === "paid") return "Pagada";
  if (normalized === "processing") return "En proceso";
  if (normalized === "ready") return "Lista";
  if (normalized === "fulfilled") return "Entregada";
  if (normalized === "payment_failed") return "Pago fallido";
  if (normalized === "cancelled") return "Cancelada";
  if (normalized === "refunded") return "Reembolsada";
  return status || "Sin estado";
}

function translatePaymentStatus(status?: string | null): string {
  const normalized = (status || "").trim().toLowerCase();
  if (normalized === "pending") return "Pendiente";
  if (normalized === "approved") return "Aprobado";
  if (normalized === "failed" || normalized === "rejected") return "Rechazado";
  if (normalized === "cancelled") return "Cancelado";
  if (normalized === "refunded") return "Reembolsado";
  return status || "Sin estado";
}

function translateFulfillmentStatus(status?: string | null): string {
  const normalized = (status || "").trim().toLowerCase();
  if (normalized === "pending") return "Pendiente";
  if (normalized === "processing") return "En proceso";
  if (normalized === "ready") return "Lista";
  if (normalized === "fulfilled") return "Entregada";
  if (normalized === "cancelled") return "Cancelada";
  return status || "Sin estado";
}

function getStatusLabel(order: WebOrderDetail) {
  if (order.payment_status === "approved") return "Pago aprobado";
  if (order.payment_status === "pending") return "Esperando validación";
  if (order.payment_status === "failed") return "Pago fallido";
  return translateOrderStatus(order.status);
}

export default function WebOrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const { authenticated, loading: customerLoading } = useWebCustomer();
  const [order, setOrder] = useState<WebOrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const [isPending, startTransition] = useTransition();

  const orderId = Number(params.orderId);
  const paymentInfo = useMemo(() => getManualPaymentInstructions(), []);
  const shouldFetchOrder =
    Number.isFinite(orderId) && orderId > 0 && authenticated && !customerLoading;
  const loading = customerLoading || (shouldFetchOrder && order == null && error == null);

  useEffect(() => {
    if (!shouldFetchOrder) return;

    let active = true;
    fetchWebOrder(orderId)
      .then((nextOrder) => {
        if (!active) return;
        setOrder(nextOrder);
        setAmount(String(nextOrder.total));
      })
      .catch((nextError) => {
        if (!active) return;
        setError(nextError instanceof Error ? nextError.message : "No se pudo cargar la orden.");
      });

    return () => {
      active = false;
    };
  }, [orderId, shouldFetchOrder]);

  function handleSubmitPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order) return;

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Debes indicar un monto válido para el pago reportado.");
      return;
    }

    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        const updated = await submitManualPaymentForOrder(order.id, {
          method: "transferencia",
          provider: "manual_transfer",
          provider_reference: reference.trim() || undefined,
          amount: parsedAmount,
          note: note.trim() || undefined,
        });
        setOrder(updated);
        setSuccess("Pago reportado. El equipo de Kensar lo validará desde Comercio Web.");
        setReference("");
        setNote("");
      } catch (nextError) {
        setError(
          nextError instanceof Error ? nextError.message : "No se pudo reportar el pago."
        );
      }
    });
  }

  return (
    <main className="site-shell internal-page section-space order-page-shell">
      <section className="page-hero order-page-hero">
        <div>
          <p className="section-label">Confirmación de orden</p>
          <h1 className="page-title">Tu orden web entra al flujo operativo de Kensar con trazabilidad real.</h1>
          <p className="section-intro">
            La orden se creó en Metrik como documento `OW`. Desde aquí puedes ver el resumen y reportar
            un pago por transferencia para que el equipo lo valide.
          </p>
        </div>
      </section>

      {customerLoading || loading ? (
        <section className="account-loading-card">
          <p>Cargando detalle de la orden…</p>
        </section>
      ) : !authenticated ? (
        <section className="cart-guest-card">
          <h2>Necesitas iniciar sesión</h2>
          <p>Solo el cliente autenticado puede ver y reportar pagos sobre sus órdenes web.</p>
          <div className="account-action-row">
            <Link href="/cuenta" className="account-primary-btn">
              Ir a mi cuenta
            </Link>
          </div>
        </section>
      ) : error && !order ? (
        <section className="cart-guest-card">
          <h2>No pudimos cargar la orden</h2>
          <p>{error}</p>
          <div className="account-action-row">
            <Link href="/carrito" className="account-secondary-btn">
              Volver al carrito
            </Link>
          </div>
        </section>
      ) : order ? (
        <>
          {error ? <p className="account-feedback error">{error}</p> : null}
          {success ? <p className="account-feedback success">{success}</p> : null}

          <section className="order-main-grid">
            <article className="cart-card">
              <div className="cart-card-head">
                <div>
                  <p className="account-section-kicker">Orden web</p>
                  <h2>{order.document_number || `Orden #${order.id}`}</h2>
                  <p className="account-section-copy">
                    Creada el {formatDate(order.created_at)}. Estado actual: {getStatusLabel(order)}.
                  </p>
                </div>
              </div>

              <div className="order-meta-grid">
                <div className="order-meta-pill">
                  <span>Pago</span>
                  <strong>{translatePaymentStatus(order.payment_status)}</strong>
                </div>
                <div className="order-meta-pill">
                  <span>Fulfillment</span>
                  <strong>{translateFulfillmentStatus(order.fulfillment_status)}</strong>
                </div>
                <div className="order-meta-pill">
                  <span>Total</span>
                  <strong>{formatMoney(order.total)}</strong>
                </div>
              </div>

              <div className="cart-item-list">
                {order.items.map((item) => (
                  <div key={item.id} className="cart-item-row">
                    <div className="cart-item-copy">
                      <h3>{item.product_name}</h3>
                      <p>
                        {item.product_sku || "Sin SKU"} · {item.quantity} unidad
                        {item.quantity === 1 ? "" : "es"}
                      </p>
                      <strong>{formatMoney(item.line_total)}</strong>
                    </div>
                  </div>
                ))}
              </div>

              <div className="order-timeline">
                <h3>Bitácora visible</h3>
                <div className="order-log-list">
                  {order.status_logs.length === 0 ? (
                    <p>No hay movimientos visibles todavía.</p>
                  ) : (
                    order.status_logs.map((log) => (
                      <div key={log.id} className="order-log-card">
                        <strong>{log.from_status ? `${translateOrderStatus(log.from_status)} → ` : ""}{translateOrderStatus(log.to_status)}</strong>
                        <span>{formatDate(log.created_at)}</span>
                        <p>{log.note || "Sin nota adicional"}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </article>

            <aside className="cart-card order-payment-card">
              <p className="account-section-kicker">Pago manual</p>
              <h2>Transferencia o canal directo</h2>
              <div className="order-payment-instructions">
                <div className="order-payment-line">
                  <span>Titular</span>
                  <strong>{paymentInfo.owner}</strong>
                </div>
                <div className="order-payment-line">
                  <span>Banco</span>
                  <strong>{paymentInfo.bank}</strong>
                </div>
                <div className="order-payment-line">
                  <span>Tipo</span>
                  <strong>{paymentInfo.account_type}</strong>
                </div>
                <div className="order-payment-line">
                  <span>Cuenta</span>
                  <strong>{paymentInfo.account_number}</strong>
                </div>
                <div className="order-payment-line">
                  <span>{paymentInfo.alt_channel_label}</span>
                  <strong>{paymentInfo.alt_channel_value}</strong>
                </div>
              </div>

              <form className="account-form" onSubmit={handleSubmitPayment}>
                <label>
                  <span>Monto transferido</span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                  />
                </label>
                <label>
                  <span>Referencia o comprobante</span>
                  <input
                    type="text"
                    value={reference}
                    onChange={(event) => setReference(event.target.value)}
                    placeholder="Ej: comprobante, código de transferencia, último 4"
                  />
                </label>
                <label>
                  <span>Nota para validación</span>
                  <textarea
                    rows={4}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Ej: pago enviado desde Bancolombia, confirmar por WhatsApp..."
                  />
                </label>
                <button
                  type="submit"
                  disabled={isPending || order.payment_status === "approved"}
                  className="account-primary-btn cart-checkout-btn"
                >
                  {isPending
                    ? "Reportando pago..."
                    : order.payment_status === "approved"
                      ? "Pago ya aprobado"
                      : "Reportar pago manual"}
                </button>
              </form>

              <p className="cart-summary-note">
                Después de reportarlo, el equipo lo verá en `Comercio Web`, validará el pago y moverá la
                orden al siguiente estado.
              </p>
              <div className="account-action-row">
                <Link
                  href={`https://wa.me/${paymentInfo.whatsapp.replace(/[^\d]/g, "")}?text=${encodeURIComponent(
                    `Hola, necesito confirmar el pago de la orden ${order.document_number || order.id}.`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="account-secondary-btn"
                >
                  Confirmar por WhatsApp
                </Link>
                <Link href="/carrito" className="account-secondary-btn">
                  Volver al carrito
                </Link>
              </div>
            </aside>
          </section>
        </>
      ) : null}
    </main>
  );
}
