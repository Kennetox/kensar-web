"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  COOKIE_CONSENT_VERSION,
  getCookieConsent,
  persistCookieConsent,
  type CookieConsent,
} from "@/app/lib/cookieConsent";

const BENEFIT_DEFERRED_STORAGE_KEY = "kensar_benefit_cookie_notice_deferred";

export default function CookieConsentBanner() {
  const [consent, setConsent] = useState<CookieConsent | null | undefined>(undefined);
  const [deferredForBenefit, setDeferredForBenefit] = useState(false);

  useEffect(() => {
    const initialize = () => {
      const hasBenefit = Boolean(new URLSearchParams(window.location.search).get("beneficio"));
      let deferred = false;
      try {
        if (hasBenefit) {
          window.sessionStorage.setItem(BENEFIT_DEFERRED_STORAGE_KEY, "1");
        }
        deferred = window.sessionStorage.getItem(BENEFIT_DEFERRED_STORAGE_KEY) === "1";
      } catch {
        // If session storage is unavailable, the benefit URL itself still keeps the notice hidden on arrival.
        deferred = hasBenefit;
      }
      setDeferredForBenefit(deferred);
      setConsent(getCookieConsent());
    };
    const timer = window.setTimeout(initialize, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function applyConsent(acceptOptional: boolean) {
    const value: CookieConsent = {
      version: COOKIE_CONSENT_VERSION,
      essential: true,
      analytics: acceptOptional,
      marketing: acceptOptional,
      updatedAt: new Date().toISOString(),
    };
    setConsent(value);
    persistCookieConsent(value);
  }

  if (consent !== null || deferredForBenefit) return null;

  return (
    <aside className="cookie-consent" role="dialog" aria-live="polite" aria-label="Preferencias de cookies">
      <div className="cookie-consent-content">
        <p className="cookie-consent-copy">
          Usamos cookies opcionales para medir y mejorar Kensar.
          <Link href="/legal/cookies" className="cookie-consent-legal-link"> Política</Link>
        </p>
        <div className="cookie-consent-actions">
          <button
            type="button"
            className="cookie-btn cookie-btn-secondary"
            onClick={() => applyConsent(false)}
          >
            Solo necesarias
          </button>
          <button
            type="button"
            className="cookie-btn cookie-btn-primary"
            onClick={() => applyConsent(true)}
          >
            Aceptar
          </button>
        </div>
      </div>
    </aside>
  );
}
