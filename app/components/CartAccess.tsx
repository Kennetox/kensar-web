"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useWebCart } from "@/app/components/WebCartProvider";
import { useWebCustomer } from "@/app/components/WebCustomerProvider";

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function CartAccess() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { authenticated } = useWebCustomer();
  const { cart, loading, updateItem, removeItem, clear } = useWebCart();
  const hydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsWarning, setTermsWarning] = useState("");

  const count = cart?.items_count ?? 0;
  const items = cart?.items ?? [];
  const subtotal = cart?.subtotal ?? 0;
  const subtotalWithoutDiscount = items.reduce((acc, item) => {
    const quantity = Number(item.quantity) || 0;
    if (typeof item.compare_price === "number" && item.compare_price > item.unit_price) {
      return acc + item.compare_price * quantity;
    }
    return acc + item.unit_price * quantity;
  }, 0);
  const showSubtotalWithoutDiscount = subtotalWithoutDiscount > subtotal + 0.5;
  const badgeValue = !hydrated || loading ? "…" : count;
  const productsCountLabel = !hydrated || loading ? "…" : String(items.length);
  const currentQuery = searchParams.toString();
  const currentPath = `${pathname}${currentQuery ? `?${currentQuery}` : ""}`;
  const guestLoginHref = `/cuenta?returnTo=${encodeURIComponent(currentPath)}`;

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    if (open) {
      document.body.style.overflow = "hidden";
      document.body.classList.add("mini-cart-open");
    } else {
      document.body.classList.remove("mini-cart-open");
    }
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.classList.remove("mini-cart-open");
    };
  }, [open]);

  async function handleQuantity(productId: number, quantity: number) {
    try {
      setBusy(true);
      if (quantity <= 0) {
        await removeItem(productId);
        return;
      }
      await updateItem(productId, quantity);
    } finally {
      setBusy(false);
    }
  }

  async function handleClear() {
    try {
      setBusy(true);
      await clear();
    } finally {
      setBusy(false);
    }
  }

  function goTo(path: string) {
    setOpen(false);
    router.push(path);
  }

  function handleGoToPay() {
    if (!termsAccepted) {
      setTermsWarning("Por favor acepta los Términos y Condiciones para continuar.");
      return;
    }
    setTermsWarning("");
    goTo("/pago");
  }

  return (
    <>
      <button
        type="button"
        className={`header-icon-link header-cart-link${count > 0 ? " has-items" : ""}`}
        aria-label="Abrir carrito"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span className="header-cart-icon-wrap" aria-hidden="true">
          <span className="header-cart-icon">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M3 4h2.3l1.8 9.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8l1.2-6.1H7.2" />
              <circle cx="10" cy="19" r="1.6" />
              <circle cx="17" cy="19" r="1.6" />
            </svg>
          </span>
          <span className="header-cart-count">{badgeValue}</span>
        </span>
      </button>

      {mounted
        ? createPortal(
            <div className={`mini-cart-overlay${open ? " is-open" : ""}`} aria-hidden={!open}>
              <button
                type="button"
                className="mini-cart-backdrop"
                onClick={() => setOpen(false)}
                aria-label="Cerrar carrito"
                tabIndex={open ? 0 : -1}
              />
              <aside className="mini-cart-drawer" role="dialog" aria-modal="true" aria-label="Tu carrito">
                <div className="mini-cart-head">
                  <div className="mini-cart-head-main">
                    <strong>Tu carrito ({productsCountLabel})</strong>
                    {!authenticated ? (
                      <p className="guest-mode-note mini-cart-guest-note">
                        Compra como invitado.{" "}
                        <Link
                          href={guestLoginHref}
                          className="guest-mode-note-link guest-mode-note-link-dark"
                          onClick={() => setOpen(false)}
                        >
                          Iniciar sesión
                        </Link>
                      </p>
                    ) : null}
                  </div>
                  <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar carrito">
                    ✕
                  </button>
                </div>

                {items.length === 0 ? (
                  <div className="mini-cart-empty">
                    <p>Tu carrito está vacío.</p>
                    <button type="button" className="account-secondary-btn" onClick={() => goTo("/catalogo")}>
                      Ver catálogo
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mini-cart-items">
                      {items.map((item) => (
                        <article key={item.id} className="mini-cart-item">
                          <div
                            className={`mini-cart-item-media${item.image_url ? " has-image" : ""}`}
                            style={
                              item.image_url
                                ? { backgroundImage: `url('${item.image_url}')` }
                                : undefined
                            }
                            aria-hidden="true"
                          />
                          <div className="mini-cart-item-main">
                            <div className="mini-cart-item-copy">
                              <h4>{item.product_name}</h4>
                              <p>
                                <span>{formatMoney(item.line_total)}</span>
                                {typeof item.compare_price === "number" && item.compare_price > item.unit_price ? (
                                  <small>{formatMoney(item.compare_price * item.quantity)}</small>
                                ) : null}
                              </p>
                            </div>
                            <div className="mini-cart-item-actions">
                              <div className="mini-cart-qty">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void handleQuantity(item.product_id, item.quantity - 1)}
                                >
                                  -
                                </button>
                                <span>{item.quantity}</span>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void handleQuantity(item.product_id, item.quantity + 1)}
                                >
                                  +
                                </button>
                              </div>
                              <button
                                type="button"
                                className="mini-cart-remove"
                                disabled={busy}
                                onClick={() => void handleQuantity(item.product_id, 0)}
                              >
                                Eliminar
                              </button>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>

                    <div className="mini-cart-footer">
                      <div className="mini-cart-terms-block">
                        <label className="mini-cart-terms">
                          <input
                            type="checkbox"
                            checked={termsAccepted}
                            onChange={(event) => {
                              const accepted = event.target.checked;
                              setTermsAccepted(accepted);
                              if (accepted) setTermsWarning("");
                            }}
                          />
                          <span>
                            Acepto los{" "}
                            <Link href="/terminos-y-condiciones">
                              Términos y Condiciones
                            </Link>
                            .
                          </span>
                        </label>
                        {termsWarning ? (
                          <p className="mini-cart-terms-warning" role="alert">
                            {termsWarning}
                          </p>
                        ) : null}
                      </div>

                      {showSubtotalWithoutDiscount ? (
                        <div className="mini-cart-subtotal mini-cart-subtotal-compare">
                          <span>Subtotal</span>
                          <strong>{formatMoney(subtotalWithoutDiscount)}</strong>
                        </div>
                      ) : null}
                      <div className="mini-cart-subtotal">
                        <span>{showSubtotalWithoutDiscount ? "Total" : "Subtotal"}</span>
                        <strong>{formatMoney(subtotal)}</strong>
                      </div>
                      <div className="mini-cart-footer-actions">
                        <button type="button" className="account-secondary-btn" onClick={() => goTo("/carrito")}>
                          Ver carrito
                        </button>
                        <button type="button" className="account-primary-btn" onClick={handleGoToPay}>
                          Ir a pagar
                        </button>
                      </div>
                      <button
                        type="button"
                        className="mini-cart-clear"
                        disabled={busy}
                        onClick={() => void handleClear()}
                      >
                        Vaciar carrito
                      </button>
                    </div>
                  </>
                )}
              </aside>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
