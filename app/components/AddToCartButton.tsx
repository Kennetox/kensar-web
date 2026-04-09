"use client";

import { useRef, useState } from "react";
import { useWebCart } from "@/app/components/WebCartProvider";

export default function AddToCartButton({
  productId,
  quantity = 1,
  productName,
  productSlug,
  productSku = null,
  imageUrl = null,
  brand = null,
  stockStatus = "in_stock",
  unitPrice = 0,
  comparePrice = null,
  showCartIcon = false,
  wrapClassName,
  buttonClassName,
}: {
  productId: number;
  quantity?: number;
  productName?: string;
  productSlug?: string;
  productSku?: string | null;
  imageUrl?: string | null;
  brand?: string | null;
  stockStatus?: "in_stock" | "low_stock" | "out_of_stock" | "service" | "consultar";
  unitPrice?: number;
  comparePrice?: number | null;
  showCartIcon?: boolean;
  wrapClassName?: string;
  buttonClassName?: string;
}) {
  const { addItem } = useWebCart();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [busy, setBusy] = useState(false);
  const isUnavailable = stockStatus === "out_of_stock" || stockStatus === "service" || stockStatus === "consultar";

  async function handleClick() {
    if (isUnavailable) return;
    try {
      setBusy(true);
      await addItem(productId, quantity, {
        product_name: productName || `Producto ${productId}`,
        product_slug: productSlug || "",
        product_sku: productSku,
        image_url: imageUrl,
        brand,
        stock_status: stockStatus,
        unit_price: unitPrice,
        compare_price: comparePrice,
      });
      const sourceRect = buttonRef.current?.getBoundingClientRect();
      if (sourceRect) {
        window.dispatchEvent(
          new CustomEvent("kensar:cart-add", {
            detail: {
              x: sourceRect.left + sourceRect.width / 2,
              y: sourceRect.top + sourceRect.height / 2,
            },
          })
        );
      }
    } catch {
      // Silenciamos feedback inline por requerimiento de UI.
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={["catalog-add-cart-wrap", wrapClassName].filter(Boolean).join(" ")}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => void handleClick()}
        disabled={busy || isUnavailable}
        className={["catalog-secondary-action", "catalog-cart-action", buttonClassName].filter(Boolean).join(" ")}
      >
        {showCartIcon && !isUnavailable ? (
          <span className="catalog-cart-action-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <circle cx="9" cy="19" r="1.65" />
              <circle cx="17" cy="19" r="1.65" />
              <path d="M3 5h2l1.8 8.2a1 1 0 0 0 .98.8h8.72a1 1 0 0 0 .97-.76L20 8H7" />
            </svg>
          </span>
        ) : null}
        <span>{busy ? "Agregando..." : "Añadir al carrito"}</span>
      </button>
    </div>
  );
}
