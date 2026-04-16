"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AccountSectionTabs from "@/app/components/AccountSectionTabs";
import { useWebCart } from "@/app/components/WebCartProvider";
import { useWebCustomer } from "@/app/components/WebCustomerProvider";
import { fetchWebOrder, type WebOrderDetail, type WebOrderSummary } from "@/app/lib/webCart";

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

export default function MisPedidosPage() {
  const { authenticated } = useWebCustomer();
  const { orders, ordersLoading } = useWebCart();
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<WebOrderDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailErrorOrderId, setDetailErrorOrderId] = useState<number | null>(null);

  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();
      return bTime - aTime;
    });
  }, [orders]);

  const effectiveSelectedOrderId = useMemo<number | null>(() => {
    if (!sortedOrders.length) return null;
    if (selectedOrderId && sortedOrders.some((order) => order.id === selectedOrderId)) {
      return selectedOrderId;
    }
    return sortedOrders[0].id;
  }, [selectedOrderId, sortedOrders]);

  const selectedOrderSummary = useMemo<WebOrderSummary | null>(() => {
    if (!effectiveSelectedOrderId) return null;
    return sortedOrders.find((order) => order.id === effectiveSelectedOrderId) ?? null;
  }, [effectiveSelectedOrderId, sortedOrders]);

  useEffect(() => {
    if (!effectiveSelectedOrderId || !authenticated) return;

    let active = true;

    fetchWebOrder(effectiveSelectedOrderId)
      .then((detail) => {
        if (!active) return;
        setSelectedOrderDetail(detail);
        setDetailError(null);
        setDetailErrorOrderId(null);
      })
      .catch((error) => {
        if (!active) return;
        setDetailError(error instanceof Error ? error.message : "No se pudo cargar el detalle.");
        setDetailErrorOrderId(effectiveSelectedOrderId);
        setSelectedOrderDetail(null);
      });

    return () => {
      active = false;
    };
  }, [effectiveSelectedOrderId, authenticated]);

  return (
    <main className="site-shell internal-page section-space cart-page-shell">
      <section className="catalog-breadcrumbs">
        <span>Cuenta</span>
        <span>Compras</span>
      </section>

      <AccountSectionTabs />

      <section className="cart-intro-card">
        <div className="cart-intro-copy">
          <p className="section-label">Compras</p>
          <h1 className="page-title">Historial de compras</h1>
          <p className="section-intro">
            Consulta todas tus ventas web registradas, exitosas o rechazadas, y revisa el detalle
            de cada orden en el panel derecho.
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
        <section className="purchase-history-layout">
          <aside className="purchase-history-list-card">
            {ordersLoading ? (
              <p className="account-section-copy">Cargando tus órdenes…</p>
            ) : sortedOrders.length === 0 ? (
              <p className="account-section-copy">Aún no hay órdenes web creadas desde esta cuenta.</p>
            ) : (
              <div className="purchase-order-list">
                {sortedOrders.map((order) => {
                  const active = effectiveSelectedOrderId === order.id;
                  return (
                    <button
                      key={order.id}
                      type="button"
                      className={`purchase-order-row${active ? " active" : ""}`}
                      onClick={() => {
                        setSelectedOrderId(order.id);
                        setDetailError(null);
                        setDetailErrorOrderId(null);
                      }}
                    >
                      <div className="purchase-order-row-top">
                        <strong>{order.document_number || `Orden #${order.id}`}</strong>
                        <span>{translateOrderStatus(order.status)}</span>
                      </div>
                      <p>{formatMoney(order.total)}</p>
                      <small>{formatDate(order.created_at)}</small>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          <article className="purchase-history-detail-card">
            {!selectedOrderSummary ? (
              <p className="account-section-copy">Selecciona una orden para ver su detalle.</p>
            ) : detailError && detailErrorOrderId === effectiveSelectedOrderId ? (
              <p className="account-feedback error">{detailError}</p>
            ) : selectedOrderDetail && selectedOrderDetail.id === effectiveSelectedOrderId ? (
              <div className="purchase-detail-body">
                <div className="purchase-detail-head">
                  <div>
                    <p className="account-section-kicker">Orden seleccionada</p>
                    <h2>{selectedOrderDetail.document_number || `Orden #${selectedOrderDetail.id}`}</h2>
                    <p className="account-section-copy">Creada: {formatDate(selectedOrderDetail.created_at)}</p>
                  </div>
                  <strong>{formatMoney(selectedOrderDetail.total)}</strong>
                </div>

                <div className="purchase-detail-meta">
                  <p>
                    <span>Estado</span>
                    <strong>{translateOrderStatus(selectedOrderDetail.status)}</strong>
                  </p>
                  <p>
                    <span>Pago</span>
                    <strong>{translatePaymentStatus(selectedOrderDetail.payment_status)}</strong>
                  </p>
                  <p>
                    <span>Fulfillment</span>
                    <strong>{translateFulfillmentStatus(selectedOrderDetail.fulfillment_status)}</strong>
                  </p>
                </div>

                <div className="purchase-detail-items">
                  <h3>Productos</h3>
                  {selectedOrderDetail.items.length === 0 ? (
                    <p className="account-section-copy">Esta orden no tiene productos registrados.</p>
                  ) : (
                    <ul>
                      {selectedOrderDetail.items.map((item) => (
                        <li key={item.id}>
                          <div>
                            <strong>{item.product_name}</strong>
                            <span>Cantidad: {item.quantity}</span>
                          </div>
                          <p>{formatMoney(item.line_total)}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : (
              <p className="account-section-copy">Cargando detalle de la orden…</p>
            )}
          </article>
        </section>
      )}
    </main>
  );
}
