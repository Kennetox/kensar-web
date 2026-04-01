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

function splitCustomerName(fullName?: string | null) {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: "", last_name: "" };
  if (parts.length === 1) return { first_name: parts[0], last_name: "" };
  return { first_name: parts[0], last_name: parts.slice(1).join(" ") };
}

export default function PagoPage() {
  const router = useRouter();
  const { authenticated, customer } = useWebCustomer();
  const { cart, error } = useWebCart();

  const items = cart?.items ?? [];
  const hasItems = items.length > 0;
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
  const hasDiscountGap = subtotalWithoutDiscount > subtotalBase + 0.5;
  const customerNameParts = splitCustomerName(customer?.name);

  function handleGoBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/carrito");
  }

  return (
    <main className="site-shell internal-page section-space checkout-page-shell">
      <section className="catalog-breadcrumbs">
        <button type="button" className="catalog-breadcrumb-back-btn" onClick={handleGoBack}>
          ← Volver
        </button>
        <Link href="/carrito">Ir al carrito</Link>
        <span>Checkout</span>
        <span>Pago</span>
      </section>

      {error ? <p className="account-feedback error">{error}</p> : null}

      {!hasItems ? (
        <section className="cart-guest-card">
          <h2>Tu carrito está vacío</h2>
          <p>Agrega productos en el catálogo para avanzar al checkout.</p>
          <div className="account-action-row">
            <Link href="/catalogo" className="account-primary-btn">
              Ir al catálogo
            </Link>
            <Link href="/carrito" className="account-secondary-btn">
              Ver carrito
            </Link>
          </div>
        </section>
      ) : (
        <section className="checkout-layout">
          <article className="checkout-form-card">
            <header className="checkout-form-header">
              <p className="account-section-kicker">Pago</p>
              <h1>Contacto y entrega</h1>
              <p>Completa tus datos para confirmar envío, disponibilidad y siguiente paso de pago.</p>
              {!authenticated ? (
                <p className="guest-mode-note checkout-guest-note">
                  Compra como invitado.{" "}
                  <Link href="/cuenta?returnTo=%2Fpago" className="guest-mode-note-link guest-mode-note-link-dark">
                    Iniciar sesión
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
              <input
                type="email"
                name="checkout_email"
                autoComplete="email"
                defaultValue={customer?.email || ""}
                placeholder="Email o número de teléfono móvil"
              />
            </section>

            <section className="checkout-form-section">
              <h2>Entrega</h2>
              <div className="checkout-form-grid checkout-form-grid-2">
                <select
                  name="checkout_country"
                  defaultValue="CO"
                >
                  <option value="CO">Colombia</option>
                </select>
                <input
                  type="text"
                  name="checkout_city"
                  autoComplete="address-level2"
                  placeholder="Ciudad"
                />
              </div>

              <div className="checkout-form-grid checkout-form-grid-2">
                <input
                  type="text"
                  name="checkout_name"
                  autoComplete="given-name"
                  defaultValue={(customer?.first_name || "").trim() || customerNameParts.first_name}
                  placeholder="Nombre"
                />
                <input
                  type="text"
                  name="checkout_lastname"
                  autoComplete="family-name"
                  defaultValue={(customer?.last_name || "").trim() || customerNameParts.last_name}
                  placeholder="Apellidos"
                />
              </div>

              <input
                type="text"
                name="checkout_document"
                autoComplete="off"
                defaultValue={customer?.tax_id || ""}
                placeholder="Número de documento de identidad"
              />
              <input
                type="text"
                name="checkout_address"
                autoComplete="street-address"
                defaultValue={customer?.address || ""}
                placeholder="Dirección"
              />
              <input
                type="text"
                name="checkout_address_2"
                autoComplete="address-line2"
                placeholder="Casa, apartamento, etc. (opcional)"
              />

              <div className="checkout-form-grid checkout-form-grid-3">
                <input
                  type="text"
                  name="checkout_state"
                  autoComplete="address-level1"
                  placeholder="Provincia / Estado"
                />
                <input
                  type="text"
                  name="checkout_zip"
                  autoComplete="postal-code"
                  placeholder="Código postal (opcional)"
                />
                <input
                  type="tel"
                  name="checkout_phone"
                  autoComplete="tel"
                  defaultValue={customer?.phone || ""}
                  placeholder="Teléfono"
                />
              </div>
            </section>

            <section className="checkout-form-section">
              <h2>Método de envío</h2>
              <p className="checkout-muted">
                Mostraremos opciones de envío disponibles según tu dirección al continuar.
              </p>
            </section>
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
              <span>Envío</span>
              <small>Se calcula al confirmar dirección</small>
            </div>
            <div className="checkout-summary-line checkout-summary-total">
              <span>Total</span>
              <strong>{formatMoney(totalWithCoupon)}</strong>
            </div>

            <button type="button" className="checkout-submit-btn">
              Continuar al pago
            </button>
            <Link href="/catalogo" className="checkout-continue-link">
              Seguir comprando
            </Link>
          </aside>
        </section>
      )}
    </main>
  );
}
