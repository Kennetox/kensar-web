"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useWebCart } from "@/app/components/WebCartProvider";
import { useWebCustomer } from "@/app/components/WebCustomerProvider";

const CART_NOTES_MAX_CHARS = 220;

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
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

export default function CarritoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { authenticated } = useWebCustomer();
  const {
    cart,
    error,
    updateItem,
    removeItem,
    clear,
    applyCoupon,
    clearCoupon,
  } = useWebCart();
  const [notes, setNotes] = useState("");
  const [notesOpen, setNotesOpen] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasItems = Boolean(cart && cart.items.length > 0);
  const subtotal = cart?.subtotal ?? 0;
  const subtotalBase = cart?.subtotal_base ?? subtotal;
  const couponDiscountAmount = cart?.discount_amount ?? 0;
  const totalWithCoupon = cart?.total ?? subtotal;
  const activeCouponCode = (cart?.coupon_code || "").trim();
  const activeCouponPercent = Number(cart?.coupon_discount_percent || 0);
  const sortedItems = useMemo(() => cart?.items ?? [], [cart?.items]);
  const subtotalWithoutDiscount = sortedItems.reduce((acc, item) => {
    const quantity = Number(item.quantity) || 0;
    if (typeof item.compare_price === "number" && item.compare_price > item.unit_price) {
      return acc + item.compare_price * quantity;
    }
    return acc + item.unit_price * quantity;
  }, 0);
  const hasDiscountGap = subtotalWithoutDiscount > subtotal + 0.5;
  const savingsValue = Math.max(0, subtotalWithoutDiscount - subtotal);
  const safeReturnTo = useMemo(
    () => sanitizeReturnTo(searchParams.get("returnTo")),
    [searchParams]
  );
  const backTarget = safeReturnTo || "/catalogo";
  const checkoutHref = `/pago${safeReturnTo ? `?returnTo=${encodeURIComponent(safeReturnTo)}` : ""}`;
  const guestLoginHref = `/cuenta?returnTo=${encodeURIComponent(
    `/carrito${safeReturnTo ? `?returnTo=${encodeURIComponent(safeReturnTo)}` : ""}`
  )}`;

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

  function handleGoToPayments() {
    if (!hasItems) return;
    router.push(checkoutHref);
  }

  function handleApplyCoupon() {
    if (!couponCode.trim()) {
      setCouponMessage("Ingresa un código para continuar.");
      return;
    }
    if (!authenticated) {
      setCouponMessage("Inicia sesión para aplicar cupones.");
      return;
    }
    setCouponMessage(null);
    setActionError(null);
    startTransition(async () => {
      try {
        const applied = await applyCoupon(couponCode.trim());
        const nextCode = (applied.coupon_code || "").trim();
        if (nextCode) {
          setCouponCode(nextCode);
          setCouponMessage("Cupón aplicado correctamente.");
        } else {
          setCouponMessage("No se pudo aplicar el cupón.");
        }
      } catch (nextError) {
        setCouponMessage(
          nextError instanceof Error ? nextError.message : "No se pudo aplicar el cupón."
        );
      }
    });
  }

  function handleClearCoupon() {
    if (!authenticated) {
      setCouponCode("");
      setCouponMessage("Inicia sesión para gestionar cupones.");
      return;
    }
    setCouponMessage(null);
    setActionError(null);
    startTransition(async () => {
      try {
        await clearCoupon();
        setCouponCode("");
        setCouponMessage("Cupón removido.");
      } catch (nextError) {
        setCouponMessage(
          nextError instanceof Error ? nextError.message : "No se pudo remover el cupón."
        );
      }
    });
  }

  function handleGoBack() {
    router.push(backTarget);
  }

  return (
    <main className="site-shell internal-page section-space cart-page-shell">
      <section className="catalog-breadcrumbs">
        <button type="button" className="catalog-breadcrumb-back-btn" onClick={handleGoBack}>
          ← Volver
        </button>
        <span>Checkout</span>
        <span>Carrito</span>
      </section>

      <section className={`cart-intro-card${!authenticated ? " has-guest-note" : ""}`}>
        <div className="cart-intro-copy">
          <p className="section-label">Carrito y pagos</p>
          <h1 className="page-title">Revisa tu carrito y continúa al pago.</h1>
          <p className="section-intro">
            Ajusta cantidades, valida tu pedido y sigue al flujo de pago con una experiencia clara y rápida.
          </p>
        </div>
        {!authenticated ? (
          <div className="cart-intro-side">
            <p className="guest-mode-note cart-intro-guest-note">
              Compra como invitado.{" "}
              <Link href={guestLoginHref} className="guest-mode-note-link guest-mode-note-link-dark">
                Iniciar sesión
              </Link>
            </p>
          </div>
        ) : null}
      </section>

      {error ? <p className="account-feedback error">{error}</p> : null}
      {actionError ? <p className="account-feedback error">{actionError}</p> : null}
      {feedback ? <p className="account-feedback success">{feedback}</p> : null}

      <section className="cart-main-grid">
          <article className="cart-card">
            <div className="cart-card-head">
              <div>
                <p className="account-section-kicker">Tu selección</p>
                <h2>Productos seleccionados</h2>
              </div>
              {hasItems ? (
                <button type="button" onClick={handleClear} disabled={isPending} className="cart-clear-btn">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M9 3.5h6l.7 1.5H20v2H4v-2h4.3L9 3.5Zm-2 6h2v8H7v-8Zm4 0h2v8h-2v-8Zm4 0h2v8h-2v-8Z" />
                  </svg>
                  <span>Vaciar carrito</span>
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
                    <div className="cart-item-main">
                      <div
                        className={`cart-item-media${item.image_url ? " has-image" : ""}`}
                        style={item.image_url ? { backgroundImage: `url('${item.image_url}')` } : undefined}
                        aria-hidden="true"
                      />
                      <div className="cart-item-copy">
                        <h3>{item.product_name}</h3>
                        <p>
                          {item.product_sku || "Sin SKU"} · {item.brand || "Kensar"}
                        </p>
                        <strong className="cart-item-price-row">
                          <span>{formatMoney(item.line_total)}</span>
                          {typeof item.compare_price === "number" && item.compare_price > item.unit_price ? (
                            <small>{formatMoney(item.compare_price * item.quantity)}</small>
                          ) : null}
                        </strong>
                      </div>
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
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M9 3.5h6l.7 1.5H20v2H4v-2h4.3L9 3.5Zm-2 6h2v8H7v-8Zm4 0h2v8h-2v-8Zm4 0h2v8h-2v-8Z" />
                        </svg>
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>

          <aside className="cart-card cart-summary-card">
            <p className="account-section-kicker">Resumen</p>
            <h2>Finalizar compra</h2>
            <div className="cart-summary-line">
              <span>Artículos</span>
              <strong>{cart?.items_count ?? 0}</strong>
            </div>
            {hasDiscountGap ? (
              <>
                <div className="cart-summary-line cart-summary-line-compare">
                  <span>Subtotal</span>
                  <strong>{formatMoney(subtotalWithoutDiscount)}</strong>
                </div>
                <div className="cart-summary-line">
                  <span>Subtotal web</span>
                  <strong>{formatMoney(subtotalBase)}</strong>
                </div>
                <div className="cart-summary-line cart-summary-saving">
                  <span>Te ahorras</span>
                  <strong>{formatMoney(savingsValue)}</strong>
                </div>
              </>
            ) : (
              <div className="cart-summary-line">
                <span>Subtotal</span>
                <strong>{formatMoney(subtotalBase)}</strong>
              </div>
            )}
            {couponDiscountAmount > 0 ? (
              <div className="cart-summary-line cart-summary-saving">
                <span>
                  Cupón {activeCouponCode ? activeCouponCode : ""}{activeCouponPercent > 0 ? ` (${activeCouponPercent}%)` : ""}
                </span>
                <strong>- {formatMoney(couponDiscountAmount)}</strong>
              </div>
            ) : null}
            <div className="cart-summary-line">
              <span>Total</span>
              <strong>{formatMoney(totalWithCoupon)}</strong>
            </div>
            <div className="cart-coupon-block">
              <button
                type="button"
                className="cart-notes-toggle"
                onClick={() => setCouponOpen((prev) => !prev)}
                aria-expanded={couponOpen}
                aria-controls="cart-coupon-panel"
              >
                <span>Tengo un código</span>
                <span className={`cart-notes-toggle-icon${couponOpen ? " is-open" : ""}`}>▾</span>
              </button>
              {couponOpen ? (
                <div id="cart-coupon-panel" className="cart-coupon-panel">
                  <div className={`cart-coupon-row${activeCouponCode ? " has-active-coupon" : ""}`}>
                    <input
                      id="cart-coupon-code"
                      type="text"
                      value={couponCode}
                      onChange={(event) => {
                        setCouponCode(event.target.value.toUpperCase());
                        if (couponMessage) setCouponMessage(null);
                      }}
                      placeholder="Ej: KENSAR10"
                    />
                    <button type="button" className="cart-coupon-btn" onClick={handleApplyCoupon}>
                      Aplicar
                    </button>
                    {activeCouponCode ? (
                      <button type="button" className="cart-coupon-btn cart-coupon-btn-clear" onClick={handleClearCoupon}>
                        Quitar
                      </button>
                    ) : null}
                  </div>
                  {couponMessage ? <p className="cart-coupon-note">{couponMessage}</p> : null}
                </div>
              ) : null}
            </div>
            <label className="cart-notes-field">
              <button
                type="button"
                className="cart-notes-toggle"
                onClick={() => setNotesOpen((prev) => !prev)}
                aria-expanded={notesOpen}
                aria-controls="cart-notes-textarea"
              >
                <span>Notas para la orden</span>
                <span className={`cart-notes-toggle-icon${notesOpen ? " is-open" : ""}`}>▾</span>
              </button>
              {notesOpen ? (
                <>
                  <textarea
                    id="cart-notes-textarea"
                    rows={4}
                    maxLength={CART_NOTES_MAX_CHARS}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value.slice(0, CART_NOTES_MAX_CHARS))}
                    placeholder="Ej: recoger en tienda, confirmar por WhatsApp, referencia urgente..."
                  />
                  <p className="cart-notes-counter">
                    {notes.length}/{CART_NOTES_MAX_CHARS}
                  </p>
                </>
              ) : null}
            </label>
            <button
              type="button"
              disabled={!hasItems || isPending}
              onClick={handleGoToPayments}
              className="account-primary-btn cart-checkout-btn"
            >
              Continuar a pagos
            </button>
          </aside>
        </section>

    </main>
  );
}
