"use client";

import type { KoraPageContext } from "./knowledge-types";

export const KORA_TELEMETRY_SESSION_KEY = "kensar_kora_telemetry_session_v1";
export const KORA_PAGE_CONTEXT_SESSION_KEY = "kensar_kora_page_context_v1";

type StoredPageContextPayload = {
  pathname?: string;
  pageContext?: KoraPageContext;
  timestamp?: number;
};

function createSessionId() {
  return `kora-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getOrCreateHandoffSessionId() {
  if (typeof window === "undefined") return createSessionId();
  const existing = window.sessionStorage.getItem(KORA_TELEMETRY_SESSION_KEY);
  if (existing) return existing;
  const next = createSessionId();
  window.sessionStorage.setItem(KORA_TELEMETRY_SESSION_KEY, next);
  return next;
}

export function resolveCurrentUrlFromWindow(fallbackPath?: string | null) {
  if (typeof window !== "undefined" && window.location?.href) return window.location.href;
  const safePath = (fallbackPath || "").trim();
  if (!safePath) return "https://kensarelectronic.com";
  const pathValue = safePath.startsWith("/") ? safePath : `/${safePath}`;
  return `https://kensarelectronic.com${pathValue}`;
}

export function readStoredPageContext(pathname?: string | null): KoraPageContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KORA_PAGE_CONTEXT_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredPageContextPayload;
    if (!parsed?.pageContext || typeof parsed.pageContext !== "object") return null;
    if (pathname && parsed.pathname && parsed.pathname !== pathname) return null;
    return parsed.pageContext;
  } catch {
    return null;
  }
}

export function publishPageContext(pathname: string, pageContext: KoraPageContext) {
  if (typeof window === "undefined") return;
  const payload: StoredPageContextPayload = {
    pathname,
    pageContext,
    timestamp: Date.now(),
  };
  try {
    window.sessionStorage.setItem(KORA_PAGE_CONTEXT_SESSION_KEY, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent("kensar:kora-page-context", { detail: payload }));
  } catch {
    return;
  }
}
