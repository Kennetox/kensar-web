"use client";

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & {
      getState?: () => unknown;
    };
    __kensarMetaPixelQueue?: Array<{ eventName: string; payload?: Record<string, unknown> }>;
    kensarMetaDebug?: () => {
      timestamp: string;
      pixelIdConfigured: string;
      debugEnabled: boolean;
      isBrowser: boolean;
      fbqExists: boolean;
      pixelIdsLoaded: string[];
      pendingQueueLength: number;
      pendingQueueEvents: string[];
      pathname: string | null;
      href: string | null;
      fbqState: unknown;
    };
    __kensarMetaDebugAttached?: boolean;
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
const META_PIXEL_ID = (process.env.NEXT_PUBLIC_META_PIXEL_ID || "").trim();
const META_PIXEL_DEBUG_ENABLED = process.env.NEXT_PUBLIC_PIXEL_DEBUG === "true";

function isBrowser() {
  return typeof window !== "undefined";
}

function getCurrentRoute() {
  if (!isBrowser()) return null;
  const pathname = window.location.pathname || "";
  const search = window.location.search || "";
  const hash = window.location.hash || "";
  return `${pathname}${search}${hash}` || null;
}

function getFbqState() {
  if (!isBrowser() || typeof window.fbq !== "function") return null;
  try {
    return window.fbq.getState?.() ?? null;
  } catch {
    return null;
  }
}

function getLoadedPixelIds(): string[] {
  const state = getFbqState();
  if (!state || typeof state !== "object") return [];
  const pixels = (state as { pixels?: Array<{ id?: string | number; pixelId?: string | number }> }).pixels;
  if (!Array.isArray(pixels)) return [];
  return pixels
    .map((pixel) => String(pixel?.id || pixel?.pixelId || "").trim())
    .filter(Boolean);
}

function buildDebugSnapshot() {
  return {
    timestamp: new Date().toISOString(),
    pixelIdConfigured: META_PIXEL_ID,
    debugEnabled: META_PIXEL_DEBUG_ENABLED,
    isBrowser: isBrowser(),
    fbqExists: isBrowser() && typeof window.fbq === "function",
    pixelIdsLoaded: getLoadedPixelIds(),
    pendingQueueLength: isBrowser() ? (window.__kensarMetaPixelQueue || []).length : 0,
    pendingQueueEvents: isBrowser() ? (window.__kensarMetaPixelQueue || []).map((entry) => entry.eventName) : [],
    pathname: getCurrentRoute(),
    href: isBrowser() ? window.location.href || null : null,
    fbqState: getFbqState(),
  };
}

function debugMetaPixel(eventName: string, payload?: Record<string, unknown>, extra?: Record<string, unknown>) {
  if (!META_PIXEL_DEBUG_ENABLED) return;
  const snapshot = buildDebugSnapshot();
  console.groupCollapsed(`[MetaPixel][${eventName}]`);
  console.log("route:", snapshot.pathname);
  console.log("pixel:", snapshot.pixelIdConfigured || "<missing>");
  console.log("payload:", payload || {});
  console.log("time:", snapshot.timestamp);
  console.log("fbq:", snapshot.fbqExists ? "ready" : "missing");
  if (extra && Object.keys(extra).length > 0) {
    console.log("extra:", extra);
  }
  console.groupEnd();
}

function attachGlobalMetaDebugHelper() {
  if (!isBrowser()) return;
  if (window.__kensarMetaDebugAttached) return;
  window.kensarMetaDebug = () => buildDebugSnapshot();
  window.__kensarMetaDebugAttached = true;
  debugMetaPixel("debug-helper-ready", {}, { helper: "window.kensarMetaDebug()" });
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
  if (!isBrowser()) {
    debugMetaPixel(eventName, payload, { status: "queue-skip", reason: "window-unavailable" });
    return;
  }
  const queue = window.__kensarMetaPixelQueue || [];
  queue.push({ eventName, payload });
  if (queue.length > MAX_PENDING_EVENTS) {
    queue.splice(0, queue.length - MAX_PENDING_EVENTS);
  }
  window.__kensarMetaPixelQueue = queue;
  debugMetaPixel(eventName, payload, {
    status: "queued",
    pendingQueueLength: queue.length,
  });
}

function trackEvent(eventName: string, payload?: Record<string, unknown>) {
  attachGlobalMetaDebugHelper();

  if (!isBrowser()) {
    debugMetaPixel(eventName, payload, { status: "skip", reason: "window-unavailable" });
    return;
  }

  if (!META_PIXEL_ID) {
    debugMetaPixel(eventName, payload, { status: "skip", reason: "pixel-id-missing" });
    return;
  }

  if (!isPixelReady()) {
    debugMetaPixel(eventName, payload, { status: "fbq-not-ready" });
    queueEvent(eventName, payload);
    return;
  }

  window.fbq!("track", eventName, payload || {});
  debugMetaPixel(eventName, payload, { status: "sent", mode: "fbq-track" });
}

export function flushPendingEvents() {
  attachGlobalMetaDebugHelper();

  if (!isPixelReady()) {
    debugMetaPixel("flushPendingEvents", {}, { status: "skip", reason: "fbq-not-ready" });
    return;
  }

  const queue = window.__kensarMetaPixelQueue || [];
  if (!queue.length) {
    debugMetaPixel("flushPendingEvents", {}, { status: "noop", reason: "queue-empty" });
    return;
  }

  for (const entry of queue) {
    window.fbq!("track", entry.eventName, entry.payload || {});
  }
  window.__kensarMetaPixelQueue = [];

  debugMetaPixel("flushPendingEvents", {}, {
    status: "flushed",
    flushedEvents: queue.map((entry) => entry.eventName),
    flushedCount: queue.length,
  });
}

export function fbqTrack(eventName: string, payload?: Record<string, unknown>) {
  trackEvent(eventName, payload);
}

export function fbqPageView() {
  const payload = buildPageContext();
  trackEvent("PageView", payload);
}

export function pageView() {
  fbqPageView();
}

export function viewContent(product: PixelProduct) {
  const contentId = normalizeProductId(product.id);
  if (!contentId) {
    debugMetaPixel("ViewContent", {}, { status: "skip", reason: "content-id-missing" });
    return;
  }
  const price = toPositiveNumber(product.price);
  const payload = {
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
  };
  trackEvent("ViewContent", payload);
}

export function addToCart(product: PixelProduct, quantity: number) {
  const contentId = normalizeProductId(product.id);
  if (!contentId) {
    debugMetaPixel("AddToCart", {}, { status: "skip", reason: "content-id-missing" });
    return;
  }
  const safeQuantity = Math.max(1, Math.round(Number(quantity) || 1));
  const price = toPositiveNumber(product.price);
  const value = price ? price * safeQuantity : null;
  const payload = {
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
  };
  trackEvent("AddToCart", payload);
}

export function initiateCheckout(cart: PixelCart) {
  const contents = buildContents(cart.items);
  if (!contents.length) {
    debugMetaPixel("InitiateCheckout", {}, { status: "skip", reason: "contents-empty" });
    return;
  }
  const payload = {
    ...buildPageContext(),
    content_ids: contents.map((item) => item.id),
    content_type: "product",
    value: toPositiveNumber(cart.total) || undefined,
    currency: resolveCurrency(cart.currency),
    contents,
  };
  trackEvent("InitiateCheckout", payload);
}

export function purchase(order: PixelOrder) {
  const contents = buildContents(order.items);
  if (!contents.length) {
    debugMetaPixel("Purchase", {}, { status: "skip", reason: "contents-empty" });
    return;
  }
  const payload = {
    ...buildPageContext(),
    order_id: order.id ? String(order.id) : undefined,
    content_ids: contents.map((item) => item.id),
    content_type: "product",
    value: toPositiveNumber(order.total) || undefined,
    currency: resolveCurrency(order.currency),
    contents,
  };
  trackEvent("Purchase", payload);
}
