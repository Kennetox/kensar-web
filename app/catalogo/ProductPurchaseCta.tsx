"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import ProductPaymentMethods from "@/app/catalogo/ProductPaymentMethods";
import { useWebCart } from "@/app/components/WebCartProvider";
import type { WebCatalogProductDetail } from "@/app/lib/metrikCatalog";

export default function ProductPurchaseCta({
  productId,
  stockStatus,
  productName,
  productSlug,
  productSku,
  imageUrl,
  brand,
  unitPrice,
  comparePrice,
}: {
  productId: number;
  stockStatus: WebCatalogProductDetail["stock_status"];
  productName: string;
  productSlug: string;
  productSku: string | null;
  imageUrl: string | null;
  brand: string | null;
  unitPrice: number;
  comparePrice: number | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { addItem } = useWebCart();
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const quantityOptions = useMemo(() => Array.from({ length: 3 }, (_, index) => index + 1), []);
  const stockLabel = stockStatus === "out_of_stock" ? "Sin stock" : "Stock disponible";
  const canPurchase = stockStatus !== "out_of_stock";
  const query = searchParams.toString();
  const returnTo = `${pathname}${query ? `?${query}` : ""}`;
  const checkoutHref = `/pago?returnTo=${encodeURIComponent(returnTo)}`;
  const productPath = `/catalogo/${productSlug}`;

  function resolveShareUrl() {
    if (typeof window === "undefined") return `${productPath}?src=share`;
    const url = new URL(productPath, window.location.origin);
    // WhatsApp cachea previews por URL; este parámetro fuerza refresco de metadata.
    url.searchParams.set("src", "share");
    url.searchParams.set("v", String(Date.now()));
    return url.toString();
  }

  function notifyShare(messageText: string) {
    setShareMessage(messageText);
    window.setTimeout(() => setShareMessage(null), 1800);
  }

  async function handleShareProduct() {
    const shareUrl = resolveShareUrl();
    const shareData = {
      title: `${productName} | Kensar Electronic`,
      text: `Mira este producto en Kensar: ${productName}`,
      url: shareUrl,
    };

    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share(shareData);
        return;
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
    }

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        notifyShare("Enlace copiado.");
        return;
      }
      notifyShare("No se pudo compartir. Copia el enlace desde el navegador.");
    } catch {
      notifyShare("No se pudo copiar el enlace.");
    }
  }

  async function handleAddToCart() {
    try {
      setAdding(true);
      setMessage(null);
      await addItem(productId, quantity, {
        product_name: productName,
        product_slug: productSlug,
        product_sku: productSku,
        image_url: imageUrl,
        brand,
        stock_status: stockStatus,
        unit_price: unitPrice,
        compare_price: comparePrice,
      });
      setMessage("Producto agregado al carrito.");
      window.setTimeout(() => setMessage(null), 1800);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo agregar al carrito.");
    } finally {
      setAdding(false);
    }
  }

  async function handleBuyNow() {
    try {
      setBuyingNow(true);
      setMessage(null);
      await addItem(productId, quantity, {
        product_name: productName,
        product_slug: productSlug,
        product_sku: productSku,
        image_url: imageUrl,
        brand,
        stock_status: stockStatus,
        unit_price: unitPrice,
        compare_price: comparePrice,
      });
      router.push(checkoutHref);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo continuar con la compra.");
      setBuyingNow(false);
    }
  }

  return (
    <>
      <div className="product-qty-panel">
        <div className="product-qty-row">
          <strong className="product-qty-status">{stockLabel}</strong>
          <span className="product-qty-label">Cantidad:</span>
          <div className="product-qty-select-wrap">
            <select
              className="product-qty-select"
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
              aria-label="Seleccionar cantidad"
            >
              {quantityOptions.map((value) => (
                <option key={`product-qty-${value}`} value={value}>
                  {value} {value === 1 ? "unidad" : "unidades"}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="product-cta-column">
        <div className="catalog-add-cart-wrap">
          <button
            type="button"
            onClick={() => void handleAddToCart()}
            disabled={adding || buyingNow || !canPurchase}
            className="catalog-secondary-action catalog-cart-action"
          >
            {adding ? "Agregando..." : "Añadir al carrito"}
          </button>
        </div>
        <button
          type="button"
          onClick={() => void handleBuyNow()}
          disabled={adding || buyingNow || !canPurchase}
          className="product-buy-now"
        >
          {buyingNow ? "Redirigiendo..." : "Comprar ahora"}
        </button>
        {message ? <span className="catalog-cart-feedback">{message}</span> : null}
      </div>

      <ProductPaymentMethods />
      <section className="product-share-card" aria-label="Compartir producto">
        <button type="button" className="product-share-action" onClick={() => void handleShareProduct()}>
          <span className="product-share-action-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M17.5 8a2.5 2.5 0 1 0-2.2-3.7L8.8 8.1a2.5 2.5 0 1 0 0 7.8l6.5 3.8A2.5 2.5 0 1 0 16.5 18l-6.4-3.7a2.5 2.5 0 0 0 0-4.6l6.4-3.7A2.5 2.5 0 0 0 17.5 8Z" />
            </svg>
          </span>
          <span className="product-share-action-copy">
            <strong>Compartir producto</strong>
            <small>Envía este producto por tus apps o copia el enlace.</small>
          </span>
        </button>
        {shareMessage ? (
          <p className="product-share-feedback" aria-live="polite">
            {shareMessage}
          </p>
        ) : null}
      </section>
    </>
  );
}
