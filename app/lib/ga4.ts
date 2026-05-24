"use client";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const FALLBACK_MEASUREMENT_ID = "G-VDQ5X2NFKN";

export const GA_MEASUREMENT_ID =
  (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || FALLBACK_MEASUREMENT_ID).trim();

export type GaItem = {
  item_id: string;
  item_name?: string;
  item_brand?: string;
  item_category?: string;
  item_variant?: string;
  price?: number;
  quantity?: number;
};

export function isGaConfigured() {
  return GA_MEASUREMENT_ID.length > 0;
}

function canTrack() {
  return typeof window !== "undefined" && typeof window.gtag === "function" && isGaConfigured();
}

export function gtagEvent(eventName: string, params: Record<string, unknown> = {}) {
  if (!canTrack()) return;
  window.gtag!("event", eventName, params);
}

export function gtagPageView(url: string) {
  if (!canTrack()) return;
  window.gtag!("event", "page_view", {
    page_path: url,
    page_location: window.location.href,
    page_title: document.title,
  });
}

export function gaViewItem(payload: { currency?: string; value?: number; items: GaItem[] }) {
  gtagEvent("view_item", payload);
}

export function gaAddToCart(payload: { currency?: string; value?: number; items: GaItem[] }) {
  gtagEvent("add_to_cart", payload);
}

export function gaBeginCheckout(payload: { currency?: string; value?: number; items: GaItem[] }) {
  gtagEvent("begin_checkout", payload);
}

export function gaPurchase(payload: {
  transaction_id: string;
  currency?: string;
  value?: number;
  tax?: number;
  shipping?: number;
  coupon?: string;
  items: GaItem[];
}) {
  gtagEvent("purchase", payload);
}
