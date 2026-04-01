"use client";

import { useRouter } from "next/navigation";
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
  const { addItem } = useWebCart();
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const quantityOptions = useMemo(() => Array.from({ length: 3 }, (_, index) => index + 1), []);
  const stockLabel = stockStatus === "out_of_stock" ? "Sin stock" : "Stock disponible";
  const canPurchase = stockStatus !== "out_of_stock";

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
      router.push("/pago");
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
    </>
  );
}
