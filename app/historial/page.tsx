"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import AccountSectionTabs from "@/app/components/AccountSectionTabs";
import { useWebCustomer } from "@/app/components/WebCustomerProvider";
import { getViewedProductsStorageKey, type ViewedProductEntry } from "@/app/lib/viewedProducts";
import { formatCatalogPrice } from "@/app/lib/metrikCatalog";

const EMPTY_VIEWED_ITEMS: ViewedProductEntry[] = [];
const viewedSnapshotCache = new Map<string, { raw: string; parsed: ViewedProductEntry[] }>();

function readViewedProducts(customerId: number): ViewedProductEntry[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(getViewedProductsStorageKey(customerId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ViewedProductEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item.id === "number" && typeof item.slug === "string");
  } catch {
    return [];
  }
}

function getViewedProductsSnapshot(authenticated: boolean, customerId?: number): ViewedProductEntry[] {
  if (!authenticated || !customerId || typeof window === "undefined") {
    return EMPTY_VIEWED_ITEMS;
  }

  const storageKey = getViewedProductsStorageKey(customerId);
  const raw = window.localStorage.getItem(storageKey) || "";
  const cached = viewedSnapshotCache.get(storageKey);
  if (cached && cached.raw === raw) {
    return cached.parsed;
  }

  const parsed = readViewedProducts(customerId);
  viewedSnapshotCache.set(storageKey, { raw, parsed });
  return parsed;
}

function formatViewedDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

export default function HistorialPage() {
  const { authenticated, customer } = useWebCustomer();
  const items = useSyncExternalStore(
    (notify) => {
      if (typeof window === "undefined") return () => undefined;
      window.addEventListener("storage", notify);
      return () => window.removeEventListener("storage", notify);
    },
    () => getViewedProductsSnapshot(authenticated, customer?.id),
    () => EMPTY_VIEWED_ITEMS
  );

  return (
    <main className="site-shell internal-page section-space cart-page-shell">
      <section className="catalog-breadcrumbs">
        <span>Cuenta</span>
        <span>Historial</span>
      </section>

      <AccountSectionTabs />

      <section className="cart-intro-card">
        <div className="cart-intro-copy">
          <p className="section-label">Historial</p>
          <h1 className="page-title">
            {authenticated ? "Productos vistos recientemente" : "Historial de productos"}
          </h1>
          <p className="section-intro">
            Aquí verás los productos que has abierto o revisado recientemente con tu cuenta.
          </p>
        </div>
      </section>

      {!authenticated ? (
        <section className="cart-guest-card">
          <h2>Necesitas iniciar sesión</h2>
          <p>Inicia sesión para ver tu historial de productos vistos.</p>
          <div className="account-action-row">
            <Link href="/cuenta" className="account-primary-btn">
              Ir a mi cuenta
            </Link>
          </div>
        </section>
      ) : items.length === 0 ? (
        <section className="cart-orders-section">
          <article className="cart-order-card">
            <p>Aún no tienes productos vistos en tu historial.</p>
            <div className="account-action-row">
              <Link href="/catalogo" className="account-secondary-btn">
                Ver catálogo
              </Link>
            </div>
          </article>
        </section>
      ) : (
        <section className="cart-orders-section">
          <div className="cart-orders-grid">
            {items.map((item) => (
              <article key={`${item.id}-${item.viewed_at}`} className="cart-order-card">
                <div className="history-product-main">
                  <div
                    className={`history-product-media${item.image_url ? " has-image" : ""}`}
                    style={item.image_url ? { backgroundImage: `url('${item.image_url}')` } : undefined}
                    aria-hidden="true"
                  />
                  <div className="history-product-copy">
                    <div className="cart-order-head">
                      <strong>{item.name}</strong>
                      <span>{item.brand || "Producto"}</span>
                    </div>
                  </div>
                </div>
                <p>{formatCatalogPrice(item.price)}</p>
                <small>Visto: {formatViewedDate(item.viewed_at)}</small>
                <div className="cart-order-meta">
                  <span>{item.compare_price && item.compare_price > (item.price || 0)
                    ? `Antes: ${formatCatalogPrice(item.compare_price)}`
                    : "Precio actual"}</span>
                </div>
                <div className="account-action-row">
                  <Link href={`/catalogo/${item.slug}`} className="account-secondary-btn">
                    Ver producto
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
