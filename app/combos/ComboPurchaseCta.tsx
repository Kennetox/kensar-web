"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useWebCart } from "@/app/components/WebCartProvider";
import { gaAddToCart } from "@/app/lib/ga4";
import { addToCart } from "@/app/lib/meta-pixel";
import { formatCatalogPrice, type WebCatalogCombo } from "@/app/lib/metrikCatalog";
import { allocateComboPrice } from "./comboPricing";

function hasUnavailableComboItem(combo: WebCatalogCombo): boolean {
  return combo.items.some(
    (item) => item.stock_status === "out_of_stock" || item.stock_status === "service" || item.stock_status === "consultar"
  );
}

function createComboGroupId(combo: WebCatalogCombo): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `combo_${combo.id}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export default function ComboPurchaseCta({
  combo,
  checkoutHref,
}: {
  combo: WebCatalogCombo;
  checkoutHref: string;
}) {
  const router = useRouter();
  const { addItem } = useWebCart();
  const [adding, setAdding] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const comboUnavailable = hasUnavailableComboItem(combo);

  const pricing = useMemo(
    () =>
      allocateComboPrice(
        combo.price,
        combo.items.map((item) => ({
          productId: item.product_id,
          quantity: item.quantity,
          productPrice: item.product_price,
        }))
      ),
    [combo.items, combo.price]
  );

  async function addComboToCart() {
    try {
      setAdding(true);
      setMessage(null);
      const comboGroupId = createComboGroupId(combo);
      const allocationByProductId = new Map<
        number,
        { quantity: number; lineTotal: number; baseLineTotal: number }
      >();
      for (const allocation of pricing) {
        const current = allocationByProductId.get(allocation.productId);
        const nextQuantity = (current?.quantity || 0) + allocation.quantity;
        const nextLineTotal = (current?.lineTotal || 0) + allocation.lineTotal;
        const nextBaseLineTotal = (current?.baseLineTotal || 0) + allocation.baseLineTotal;
        allocationByProductId.set(allocation.productId, {
          quantity: nextQuantity,
          lineTotal: nextLineTotal,
          baseLineTotal: nextBaseLineTotal,
        });
      }

      for (const [productId, allocation] of allocationByProductId.entries()) {
        const comboItem = combo.items.find((item) => item.product_id === productId);
        if (!comboItem) continue;
        const unitPriceOverride = allocation.quantity > 0 ? allocation.lineTotal / allocation.quantity : comboItem.product_price;
        const comboContext = [
          {
            combo_group_id: comboGroupId,
            combo_id: combo.id,
            combo_slug: combo.slug,
            combo_name: combo.name,
            combo_price: combo.price,
            combo_item_count: combo.items.length,
            combo_component_product_id: comboItem.product_id,
            combo_component_product_name: comboItem.product_name,
            combo_component_quantity: allocation.quantity,
            combo_component_line_total: allocation.lineTotal,
            combo_component_index: comboItem.sort_order,
          },
        ];
        await addItem(comboItem.product_id, allocation.quantity, {
          product_name: comboItem.product_name,
          product_slug: comboItem.product_slug || "",
          product_sku: comboItem.product_sku,
          image_url: comboItem.product_image_url,
          brand: comboItem.product_brand,
          stock_status: "consultar",
          unit_price: comboItem.product_price,
          unit_price_override: unitPriceOverride,
          combo_context_json: comboContext,
        });
        addToCart(
          {
            id: productId,
            name: comboItem.product_name,
            price: unitPriceOverride,
          },
          allocation.quantity
        );
        gaAddToCart({
          currency: "COP",
          value: allocation.lineTotal,
          items: [
            {
              item_id: String(productId),
              item_name: comboItem.product_name,
              item_brand: comboItem.product_brand || undefined,
              item_category: combo.category_key || undefined,
              item_variant: comboItem.product_sku || undefined,
              price: unitPriceOverride,
              quantity: allocation.quantity,
            },
          ],
        });
      }

      setMessage("Combo agregado al carrito.");
      window.setTimeout(() => setMessage(null), 1800);
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo agregar el combo.");
      throw error instanceof Error ? error : new Error("No se pudo agregar el combo.");
    } finally {
      setAdding(false);
    }
  }

  async function buyNow() {
    try {
      setBuyingNow(true);
      setMessage(null);
      await addComboToCart();
      router.push(checkoutHref);
    } catch {
      setBuyingNow(false);
    }
  }

  const canPurchase = combo.active && combo.published && !comboUnavailable;
  const comboPriceLabel = formatCatalogPrice(combo.price);
  const stockLabel = comboUnavailable ? "Sin stock" : "Disponible";
  const stockToneClass = comboUnavailable ? "is-out-stock" : "is-in-stock";

  return (
    <div className="product-cta-column">
      <div className="product-qty-panel">
        <div className="product-qty-row">
          <strong className={`product-qty-status ${stockToneClass}`}>{stockLabel}</strong>
        </div>
      </div>
      <div className="catalog-add-cart-wrap">
        <button
          type="button"
          onClick={() => void addComboToCart()}
          disabled={adding || buyingNow || !canPurchase}
          className="catalog-secondary-action catalog-cart-action"
        >
          {adding ? "Agregando..." : canPurchase ? `Añadir combo al carrito ${comboPriceLabel}` : "Sin stock"}
        </button>
      </div>
      <button
        type="button"
        onClick={() => void buyNow()}
        disabled={adding || buyingNow || !canPurchase}
        className="product-buy-now"
      >
        {buyingNow ? "Redirigiendo..." : canPurchase ? "Comprar ahora" : "Sin stock"}
      </button>
      {message ? <span className="catalog-cart-feedback">{message}</span> : null}
    </div>
  );
}
