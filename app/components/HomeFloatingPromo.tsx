"use client";

import { useEffect, useState } from "react";
import type { WebCatalogProductCard } from "@/app/lib/metrikCatalog";

const DISMISSED_KEY = "kensar-home-promo-dismissed";

function formatPrice(value: number | null) {
  if (value === null) return "";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function HomeFloatingPromo({ product }: { product: WebCatalogProductCard }) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (window.sessionStorage.getItem(DISMISSED_KEY) === product.id.toString()) {
      setDismissed(true);
      return;
    }
    const timer = window.setTimeout(() => setOpen(true), 2200);
    return () => window.clearTimeout(timer);
  }, [product.id]);

  function close() {
    setOpen(false);
    setDismissed(true);
    window.sessionStorage.setItem(DISMISSED_KEY, product.id.toString());
  }

  if (dismissed) return null;
  return (
    <aside className={`home-floating-promo${open ? " is-open" : ""}`} aria-label="Oferta destacada">
      <button type="button" className="home-floating-promo-close" onClick={close} aria-label="Cerrar oferta">×</button>
      <a href={`/catalogo/${product.slug}`} className="home-floating-promo-link">
        {product.image_thumb_url || product.image_url ? (
          <img src={product.image_thumb_url || product.image_url || ""} alt="" />
        ) : null}
        <span className="home-floating-promo-copy">
          <span className="home-floating-promo-kicker">Oferta del momento</span>
          <strong>{product.name}</strong>
          {product.compare_price && product.price && product.compare_price > product.price ? (
            <span className="home-floating-promo-saving">Ahorra {formatPrice(product.compare_price - product.price)}</span>
          ) : null}
          {product.price !== null ? <span className="home-floating-promo-price">{formatPrice(product.price)}</span> : null}
          <span className="home-floating-promo-cta">Ver oferta <span aria-hidden="true">→</span></span>
        </span>
      </a>
    </aside>
  );
}
