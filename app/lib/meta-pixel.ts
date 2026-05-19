"use client";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

type PixelProduct = {
  id: string | number;
  name?: string | null;
  price?: number | null;
  quantity?: number | null;
};

type PixelCart = {
  items: PixelProduct[];
  total?: number | null;
  currency?: string | null;
};

type PixelOrder = {
  id?: string | number | null;
  items: PixelProduct[];
  total?: number | null;
  currency?: string | null;
};

const DEFAULT_CURRENCY = "COP";

function isPixelReady() {
  return typeof window !== "undefined" && typeof window.fbq === "function";
}

function toPositiveNumber(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function normalizeProductId(id: string | number): string {
  return String(id).trim();
}

function buildContents(items: PixelProduct[]) {
  return items
    .map((item) => {
      const itemId = normalizeProductId(item.id);
      if (!itemId) return null;
      return {
        id: itemId,
        quantity: Math.max(1, Math.round(Number(item.quantity) || 1)),
        item_price: toPositiveNumber(item.price) || undefined,
      };
    })
    .filter(Boolean) as Array<{ id: string; quantity: number; item_price?: number }>;
}

function resolveCurrency(value?: string | null) {
  return (value || DEFAULT_CURRENCY).trim().toUpperCase() || DEFAULT_CURRENCY;
}

export function pageView() {
  if (!isPixelReady()) return;
  window.fbq!("track", "PageView");
}

export function viewContent(product: PixelProduct) {
  if (!isPixelReady()) return;
  const contentId = normalizeProductId(product.id);
  if (!contentId) return;
  const price = toPositiveNumber(product.price);
  window.fbq!("track", "ViewContent", {
    content_ids: [contentId],
    content_type: "product",
    content_name: product.name || undefined,
    value: price || undefined,
    currency: DEFAULT_CURRENCY,
    contents: [
      {
        id: contentId,
        quantity: 1,
        item_price: price || undefined,
      },
    ],
  });
}

export function addToCart(product: PixelProduct, quantity: number) {
  if (!isPixelReady()) return;
  const contentId = normalizeProductId(product.id);
  if (!contentId) return;
  const safeQuantity = Math.max(1, Math.round(Number(quantity) || 1));
  const price = toPositiveNumber(product.price);
  const value = price ? price * safeQuantity : null;
  window.fbq!("track", "AddToCart", {
    content_ids: [contentId],
    content_type: "product",
    content_name: product.name || undefined,
    value: value || undefined,
    currency: DEFAULT_CURRENCY,
    contents: [
      {
        id: contentId,
        quantity: safeQuantity,
        item_price: price || undefined,
      },
    ],
  });
}

export function initiateCheckout(cart: PixelCart) {
  if (!isPixelReady()) return;
  const contents = buildContents(cart.items);
  if (!contents.length) return;
  window.fbq!("track", "InitiateCheckout", {
    content_ids: contents.map((item) => item.id),
    content_type: "product",
    value: toPositiveNumber(cart.total) || undefined,
    currency: resolveCurrency(cart.currency),
    contents,
  });
}

export function purchase(order: PixelOrder) {
  if (!isPixelReady()) return;
  const contents = buildContents(order.items);
  if (!contents.length) return;
  window.fbq!("track", "Purchase", {
    content_ids: contents.map((item) => item.id),
    content_type: "product",
    value: toPositiveNumber(order.total) || undefined,
    currency: resolveCurrency(order.currency),
    contents,
    order_id: order.id ? String(order.id) : undefined,
  });
}
