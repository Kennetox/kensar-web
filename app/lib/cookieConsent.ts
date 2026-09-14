"use client";

import { useEffect, useState } from "react";

export type CookieConsent = {
  version: string;
  essential: true;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
};

export const COOKIE_CONSENT_STORAGE_KEY = "kensar_cookie_consent_v1";
export const COOKIE_CONSENT_COOKIE_NAME = "kensar_cookie_consent_v1";
export const COOKIE_CONSENT_UPDATED_EVENT = "kensar-cookie-consent-updated";
export const COOKIE_CONSENT_VERSION = "2026-09-14";
const COOKIE_CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

function parseConsent(raw: string | null): CookieConsent | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CookieConsent>;
    if (!parsed || parsed.version !== COOKIE_CONSENT_VERSION) return null;
    return {
      version: COOKIE_CONSENT_VERSION,
      essential: true,
      analytics: parsed.analytics === true,
      marketing: parsed.marketing === true,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : "",
    };
  } catch {
    return null;
  }
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const entry = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : null;
}

export function getCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const local = parseConsent(window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY));
    return local || parseConsent(readCookie(COOKIE_CONSENT_COOKIE_NAME));
  } catch {
    return parseConsent(readCookie(COOKIE_CONSENT_COOKIE_NAME));
  }
}

export function persistCookieConsent(value: CookieConsent) {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify(value);
  try {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, payload);
  } catch {
    // The first-party cookie remains a fallback when browser storage is unavailable.
  }
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE_CONSENT_COOKIE_NAME}=${encodeURIComponent(payload)}; Path=/; Max-Age=${COOKIE_CONSENT_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
  window.dispatchEvent(new Event(COOKIE_CONSENT_UPDATED_EVENT));
}

export function hasAnalyticsConsent() {
  return getCookieConsent()?.analytics === true;
}

export function hasMarketingConsent() {
  return getCookieConsent()?.marketing === true;
}

export function useCookieConsent() {
  const [consent, setConsent] = useState<CookieConsent | null>(null);

  useEffect(() => {
    const sync = () => setConsent(getCookieConsent());
    sync();
    window.addEventListener(COOKIE_CONSENT_UPDATED_EVENT, sync);
    return () => window.removeEventListener(COOKIE_CONSENT_UPDATED_EVENT, sync);
  }, []);

  return consent;
}
