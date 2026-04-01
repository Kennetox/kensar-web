"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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

export default function MisPedidosPage() {
  const router = useRouter();
  const { authenticated } = useWebCustomer();
  const { orders, ordersLoading } = useWebCart();

  function handleGoBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/cuenta");
  }

  return (
    <main className="site-shell internal-page section-space cart-page-shell">
      <section className="catalog-breadcrumbs">
        <button type="button" className="catalog-breadcrumb-back-btn" onClick={handleGoBack}>
          ← Volver
        </button>
        <span>Cuenta</span>
        <span>Mis pedidos</span>
      </section>

      <section className="cart-intro-card">
        <div className="cart-intro-copy">
          <p className="section-label">Órdenes web</p>
          <h1 className="page-title">Historial reciente</h1>
          <p className="section-intro">
            Revisa tus pedidos recientes, su estado y entra a cada orden para seguimiento.
          </p>
        </div>
      </section>

      {!authenticated ? (
        <section className="cart-guest-card">
          <h2>Necesitas iniciar sesión</h2>
          <p>Inicia sesión para ver tus pedidos y su estado actual.</p>
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
        <section className="cart-orders-section">
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
                  <div className="account-action-row">
                    <Link
                      href={`/ordenes/${order.id}`}
                      className="account-secondary-btn"
                      prefetch={false}
                    >
                      Ver detalle
                    </Link>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      )}
    </main>
  );
}
