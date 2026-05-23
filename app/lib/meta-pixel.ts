"use client";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    __kensarMetaPixelQueue?: Array<{ eventName: string; payload?: Record<string, unknown> }>;
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
const MAX_PENDING_EVENTS = 20;

function isBrowser() {
  return typeof window !== "undefined";
}

function isPixelReady() {
  return isBrowser() && typeof window.fbq === "function";
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

function buildPageContext() {
  if (!isBrowser()) return {};
  const pathname = (window.location.pathname || "").trim() || "/";
  const search = window.location.search || "";
  const hash = window.location.hash || "";
  const pagePath = `${pathname}${search}${hash}`;
  return {
    page_path: pagePath,
    page_title: document.title || undefined,
    event_source_url: window.location.href || undefined,
  };
}

function queueEvent(eventName: string, payload?: Record<string, unknown>) {
  if (!isBrowser()) return;
  const queue = window.__kensarMetaPixelQueue || [];
  queue.push({ eventName, payload });
  if (queue.length > MAX_PENDING_EVENTS) {
    queue.splice(0, queue.length - MAX_PENDING_EVENTS);
  }
  window.__kensarMetaPixelQueue = queue;
}

function trackEvent(eventName: string, payload?: Record<string, unknown>) {
  if (!isBrowser()) return;
  if (!isPixelReady()) {
    queueEvent(eventName, payload);
    return;
  }
  window.fbq!("track", eventName, payload || {});
}

export function flushPendingEvents() {
  if (!isPixelReady()) return;
  const queue = window.__kensarMetaPixelQueue || [];
  if (!queue.length) return;
  for (const entry of queue) {
    window.fbq!("track", entry.eventName, entry.payload || {});
  }
  window.__kensarMetaPixelQueue = [];
}

export function fbqTrack(eventName: string, payload?: Record<string, unknown>) {
  trackEvent(eventName, payload);
}

export function fbqPageView() {
  trackEvent("PageView", buildPageContext());
}

export function pageView() {
  fbqPageView();
}

export function viewContent(product: PixelProduct) {
  const contentId = normalizeProductId(product.id);
  if (!contentId) return;
  const price = toPositiveNumber(product.price);
  fbqTrack("ViewContent", {
    ...buildPageContext(),
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
  const contentId = normalizeProductId(product.id);
  if (!contentId) return;
  const safeQuantity = Math.max(1, Math.round(Number(quantity) || 1));
  const price = toPositiveNumber(product.price);
  const value = price ? price * safeQuantity : null;
  fbqTrack("AddToCart", {
    ...buildPageContext(),
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
  const contents = buildContents(cart.items);
  if (!contents.length) return;
  fbqTrack("InitiateCheckout", {
    ...buildPageContext(),
    content_ids: contents.map((item) => item.id),
    content_type: "product",
    value: toPositiveNumber(cart.total) || undefined,
    currency: resolveCurrency(cart.currency),
    contents,
  });
}

export function purchase(order: PixelOrder) {
  const contents = buildContents(order.items);
  if (!contents.length) return;
  fbqTrack("Purchase", {
    ...buildPageContext(),
    order_id: order.id ? String(order.id) : undefined,
    content_ids: contents.map((item) => item.id),
    content_type: "product",
    value: toPositiveNumber(order.total) || undefined,
    currency: resolveCurrency(order.currency),
    contents,
  });
}
