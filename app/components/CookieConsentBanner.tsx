"use client";

import Link from "next/link";
import { useState } from "react";

type CookieConsent = {
  version: string;
  essential: true;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
};

const COOKIE_CONSENT_STORAGE_KEY = "kensar_cookie_consent_v1";
const COOKIE_CONSENT_VERSION = "2026-04-17";

function readCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CookieConsent>;
    if (!parsed || parsed.version !== COOKIE_CONSENT_VERSION) return null;
    return {
      version: COOKIE_CONSENT_VERSION,
      essential: true,
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function saveCookieConsent(value: CookieConsent) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(value));
  window.dispatchEvent(
    new CustomEvent("kensar-cookie-consent-updated", {
      detail: value,
    })
  );
}

export default function CookieConsentBanner() {
  const initialConsent = typeof window === "undefined" ? null : readCookieConsent();
  const [visible, setVisible] = useState(initialConsent == null);
  const [expanded, setExpanded] = useState(false);
  const [analytics, setAnalytics] = useState(initialConsent?.analytics ?? false);
  const [marketing, setMarketing] = useState(initialConsent?.marketing ?? false);

  function persistConsent(next: { analytics: boolean; marketing: boolean }) {
    saveCookieConsent({
      version: COOKIE_CONSENT_VERSION,
      essential: true,
      analytics: next.analytics,
      marketing: next.marketing,
      updatedAt: new Date().toISOString(),
    });
    setVisible(false);
    setExpanded(false);
  }

  if (!visible) return null;

  return (
    <aside className="cookie-consent" role="dialog" aria-live="polite" aria-label="Preferencias de cookies">
      <div className="cookie-consent-content">
        <p className="cookie-consent-title">Cookies y privacidad</p>
        <p className="cookie-consent-copy">
          Usamos cookies esenciales para operar el sitio y opcionales para analítica y marketing. Puedes aceptar,
          rechazar o configurar preferencias.
        </p>
        <div className="cookie-consent-actions">
          <button type="button" className="cookie-btn cookie-btn-secondary" onClick={() => persistConsent({ analytics: false, marketing: false })}>
            Rechazar opcionales
          </button>
          <button type="button" className="cookie-btn cookie-btn-secondary" onClick={() => setExpanded((current) => !current)}>
            Configurar
          </button>
          <button type="button" className="cookie-btn cookie-btn-primary" onClick={() => persistConsent({ analytics: true, marketing: true })}>
            Aceptar todas
          </button>
        </div>
        {expanded ? (
          <div className="cookie-consent-settings">
            <label className="cookie-consent-toggle">
              <input type="checkbox" checked disabled />
              <span>Cookies esenciales (siempre activas)</span>
            </label>
            <label className="cookie-consent-toggle">
              <input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} />
              <span>Cookies de analítica</span>
            </label>
            <label className="cookie-consent-toggle">
              <input type="checkbox" checked={marketing} onChange={(event) => setMarketing(event.target.checked)} />
              <span>Cookies de marketing</span>
            </label>
            <div className="cookie-consent-actions">
              <button type="button" className="cookie-btn cookie-btn-primary" onClick={() => persistConsent({ analytics, marketing })}>
                Guardar preferencias
              </button>
              <Link href="/legal/cookies" className="cookie-consent-legal-link">
                Ver política de cookies
              </Link>
            </div>
          </div>
        ) : (
          <p className="cookie-consent-footnote">
            Más información en nuestra <Link href="/legal/cookies">Política de cookies</Link>.
          </p>
        )}
      </div>
    </aside>
  );
}
