"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useWebCart } from "@/app/components/WebCartProvider";
import { useWebCustomer } from "@/app/components/WebCustomerProvider";

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function CarritoPage() {
  const router = useRouter();
  const { authenticated, customer, loading: customerLoading } = useWebCustomer();
  const {
    cart,
    orders,
    loading,
    ordersLoading,
    error,
    updateItem,
    removeItem,
    clear,
    createOrder,
  } = useWebCart();
  const [notes, setNotes] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasItems = Boolean(cart && cart.items.length > 0);
  const subtotal = cart?.subtotal ?? 0;
  const sortedItems = useMemo(() => cart?.items ?? [], [cart?.items]);

  function updateQuantity(productId: number, quantity: number) {
    setFeedback(null);
    setActionError(null);
    startTransition(async () => {
      try {
        if (quantity <= 0) {
          await removeItem(productId);
          setFeedback("Producto eliminado del carrito.");
          return;
        }
        await updateItem(productId, quantity);
      } catch (nextError) {
        setActionError(
          nextError instanceof Error ? nextError.message : "No se pudo actualizar la cantidad."
        );
      }
    });
  }

  function handleClear() {
    setFeedback(null);
    setActionError(null);
    startTransition(async () => {
      try {
        await clear();
        setFeedback("Carrito limpiado correctamente.");
      } catch (nextError) {
        setActionError(nextError instanceof Error ? nextError.message : "No se pudo limpiar el carrito.");
      }
    });
  }

  function handleCheckout() {
    setFeedback(null);
    setActionError(null);
    startTransition(async () => {
      try {
        const order = await createOrder(notes.trim() || undefined);
        setNotes("");
        setFeedback(`Orden ${order.document_number || `#${order.id}`} creada correctamente.`);
        router.push(`/ordenes/${order.id}`);
      } catch (nextError) {
        setActionError(nextError instanceof Error ? nextError.message : "No se pudo crear la orden web.");
      }
    });
  }

  return (
    <main className="site-shell internal-page section-space cart-page-shell">
      <section className="page-hero cart-page-hero">
        <div>
          <p className="section-label">Carrito y checkout</p>
          <h1 className="page-title">Construye tu orden web conectada con Metrik antes del pago.</h1>
          <p className="section-intro">
            Aquí consolidamos el carrito del cliente autenticado y generamos la `OW` que luego seguirá
            el flujo operativo de Comercio Web.
          </p>
        </div>
        <div className="cart-hero-panel">
          <strong>
            {customerLoading || loading ? "Cargando..." : authenticated ? customer?.name : "Sesión requerida"}
          </strong>
          <span>
            {authenticated
              ? "Tu carrito está ligado al mismo cliente maestro que vive en Metrik."
              : "Inicia sesión para persistir el carrito y crear órdenes web reales."}
          </span>
        </div>
      </section>

      {error ? <p className="account-feedback error">{error}</p> : null}
      {actionError ? <p className="account-feedback error">{actionError}</p> : null}
      {feedback ? <p className="account-feedback success">{feedback}</p> : null}

      {!authenticated ? (
        <section className="cart-guest-card">
          <h2>Necesitas iniciar sesión</h2>
          <p>
            El carrito persistente y la creación de órdenes web requieren una cuenta de cliente conectada
            con Metrik.
          </p>
          <div className="account-action-row">
            <Link href="/cuenta" className="account-primary-btn">
              Ir a mi cuenta
            </Link>
            <Link href="/catalogo" className="account-secondary-btn">
              Volver al catálogo
            </Link>
          </div>
        </section>
      ) : (
        <section className="cart-main-grid">
          <article className="cart-card">
            <div className="cart-card-head">
              <div>
                <p className="account-section-kicker">Carrito persistente</p>
                <h2>Productos seleccionados</h2>
              </div>
              {hasItems ? (
                <button type="button" onClick={handleClear} disabled={isPending} className="cart-clear-btn">
                  Vaciar carrito
                </button>
              ) : null}
            </div>

            {!hasItems ? (
              <div className="cart-empty-block">
                <p>Tu carrito aún está vacío.</p>
                <Link href="/catalogo" className="account-primary-btn">
                  Explorar catálogo
                </Link>
              </div>
            ) : (
              <div className="cart-item-list">
                {sortedItems.map((item) => (
                  <div key={item.id} className="cart-item-row">
                    <div className="cart-item-copy">
                      <h3>{item.product_name}</h3>
                      <p>
                        {item.product_sku || "Sin SKU"} · {item.brand || "Kensar"} · {item.stock_status}
                      </p>
                      <strong>{formatMoney(item.line_total)}</strong>
                    </div>
                    <div className="cart-item-actions">
                      <div className="cart-qty-box">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                          disabled={isPending}
                        >
                          -
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                          disabled={isPending}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="cart-remove-btn"
                        onClick={() => updateQuantity(item.product_id, 0)}
                        disabled={isPending}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>

          <aside className="cart-card cart-summary-card">
            <p className="account-section-kicker">Checkout base</p>
            <h2>Crear orden web</h2>
            <div className="cart-summary-line">
              <span>Items</span>
              <strong>{cart?.items_count ?? 0}</strong>
            </div>
            <div className="cart-summary-line">
              <span>Subtotal</span>
              <strong>{formatMoney(subtotal)}</strong>
            </div>
            <label className="cart-notes-field">
              <span>Notas para la orden</span>
              <textarea
                rows={4}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Ej: recoger en tienda, confirmar por WhatsApp, referencia urgente..."
              />
            </label>
            <button
              type="button"
              disabled={!hasItems || isPending}
              onClick={handleCheckout}
              className="account-primary-btn cart-checkout-btn"
            >
              {isPending ? "Creando orden..." : "Crear orden web"}
            </button>
            <p className="cart-summary-note">
              Esta acción crea una `OW` real en Metrik. El siguiente bloque conectará pago y confirmación comercial.
            </p>
          </aside>
        </section>
      )}

      {authenticated ? (
        <section className="cart-orders-section">
          <div className="commerce-section-head">
            <div>
              <p className="commerce-section-kicker">Órdenes recientes</p>
              <h2>Historial web inicial</h2>
              <p className="commerce-section-sub">
                Base para que después puedas ver estados, pagos y seguimiento del canal online.
              </p>
            </div>
          </div>
          <div className="cart-orders-grid">
            {ordersLoading ? (
              <article className="cart-order-card">
                <p>Cargando tus órdenes…</p>
              </article>
            ) : orders.length === 0 ? (
              <article className="cart-order-card">
                <p>Aún no hay órdenes web creadas desde esta cuenta.</p>
              </article>
            ) : (
              orders.map((order) => (
                <article key={order.id} className="cart-order-card">
                  <div className="cart-order-head">
                    <strong>{order.document_number || `Orden #${order.id}`}</strong>
                    <span>{order.status}</span>
                  </div>
                  <p>{formatMoney(order.total)}</p>
                  <small>{formatDate(order.created_at)}</small>
                  <div className="cart-order-meta">
                    <span>Pago: {order.payment_status}</span>
                    <span>Fulfillment: {order.fulfillment_status}</span>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      ) : null}
    </main>
  );
}
