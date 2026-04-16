"use client";

import { useEffect } from "react";
import { useWebCustomer } from "@/app/components/WebCustomerProvider";
import {
  getViewedProductsStorageKey,
  type ViewedProductEntry,
  VIEWED_PRODUCTS_MAX_ITEMS,
} from "@/app/lib/viewedProducts";

type ProductViewTrackerProps = {
  product: {
    id: number;
    slug: string;
    name: string;
    image_url: string | null;
    price: number | null;
    compare_price: number | null;
    brand: string | null;
  };
};

function safeRead(storageKey: string): ViewedProductEntry[] {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ViewedProductEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item.id === "number" && typeof item.slug === "string");
  } catch {
    return [];
  }
}

export default function ProductViewTracker({ product }: ProductViewTrackerProps) {
  const { authenticated, customer } = useWebCustomer();

  useEffect(() => {
    if (!authenticated || !customer?.id) return;

    const storageKey = getViewedProductsStorageKey(customer.id);
    const current = safeRead(storageKey).filter((item) => item.id !== product.id);
    const next: ViewedProductEntry = {
      id: product.id,
      slug: product.slug,
      name: product.name,
      image_url: product.image_url,
      price: product.price,
      compare_price: product.compare_price,
      brand: product.brand,
      viewed_at: new Date().toISOString(),
    };
    current.unshift(next);
    const limited = current.slice(0, VIEWED_PRODUCTS_MAX_ITEMS);
    window.localStorage.setItem(storageKey, JSON.stringify(limited));
  }, [
    authenticated,
    customer?.id,
    product.id,
    product.slug,
    product.name,
    product.image_url,
    product.price,
    product.compare_price,
    product.brand,
  ]);

  return null;
}
