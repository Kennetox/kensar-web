"use client";

import { useState } from "react";
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
}) {
  const { addItem } = useWebCart();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    try {
      setBusy(true);
      setMessage(null);
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
      setMessage("Agregado");
      window.setTimeout(() => setMessage(null), 1800);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo agregar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="catalog-add-cart-wrap">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={busy}
        className="catalog-secondary-action catalog-cart-action"
      >
        {busy ? "Agregando..." : "Añadir al carrito"}
      </button>
      {message ? <span className="catalog-cart-feedback">{message}</span> : null}
    </div>
  );
}
