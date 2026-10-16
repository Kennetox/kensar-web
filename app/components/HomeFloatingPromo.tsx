"use client";

import { useEffect, useState } from "react";
import type { WebCatalogProductCard } from "@/app/lib/metrikCatalog";

const SEEN_KEY = "kensar-home-promo-seen-v2";
const AUTO_DISMISS_MS = 20_000;
const REAPPEAR_DELAY_MS = 60_000;
const EXIT_ANIMATION_MS = 380;

function formatPrice(value: number | null) {
  if (value === null) return "";
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);
}

export default function HomeFloatingPromo({ product }: { product: WebCatalogProductCard }) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  useEffect(() => {
    if (window.sessionStorage.getItem(SEEN_KEY) === "1") {
      setDismissed(true);
      return;
    }
    const timer = window.setTimeout(() => {
      setOpen(true);
      setHasShown(true);
    }, 2200);
    return () => window.clearTimeout(timer);
  }, []);

  function dismiss(permanently = false) {
    if (leaving || dismissed) return;
    if (permanently) window.sessionStorage.setItem(SEEN_KEY, "1");
    setLeaving(true);
    window.setTimeout(() => {
      setLeaving(false);
      setOpen(false);
      if (permanently) setDismissed(true);
    }, EXIT_ANIMATION_MS);
  }

  useEffect(() => {
    if (!open || hovered || leaving) return;
    const timer = window.setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [open, hovered, leaving]);

  useEffect(() => {
    if (!hasShown || open || dismissed) return;
    const timer = window.setTimeout(() => setOpen(true), REAPPEAR_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [hasShown, open, dismissed]);

  if (dismissed) return null;
  return (
    <aside className={`home-floating-promo${open ? " is-open" : ""}${leaving ? " is-leaving" : ""}`} aria-label="Oferta destacada" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <span className="home-floating-promo-glow" aria-hidden="true" />
      {open && !leaving ? <span className="home-floating-promo-timer" aria-hidden="true" /> : null}
      <button type="button" className="home-floating-promo-close" onClick={() => dismiss(true)} aria-label="Cerrar oferta">×</button>
      <a href={`/catalogo/${product.slug}`} className="home-floating-promo-link">
        {product.image_thumb_url || product.image_url ? (
          <img src={product.image_thumb_url || product.image_url || ""} alt="" />
        ) : null}
        <span className="home-floating-promo-copy">
          <span className="home-floating-promo-kicker"><i /> Oferta del momento</span>
          <strong>{product.name}</strong>
          {product.compare_price && product.price && product.compare_price > product.price ? (
            <span className="home-floating-promo-saving">Ahorra {formatPrice(product.compare_price - product.price)}</span>
          ) : null}
          <span className="home-floating-promo-footer">{product.price !== null ? <span className="home-floating-promo-price">{formatPrice(product.price)}</span> : null}<span className="home-floating-promo-cta">Ver oferta <span aria-hidden="true">→</span></span></span>
        </span>
      </a>
    </aside>
  );
}
