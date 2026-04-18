"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type CookieConsent = {
  version: string;
  essential: true;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
};

const COOKIE_CONSENT_STORAGE_KEY = "kensar_cookie_consent_v1";
const COOKIE_CONSENT_COOKIE_NAME = "kensar_cookie_consent_v1";
const COOKIE_CONSENT_VERSION = "2026-04-17";
const COOKIE_CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

function parseCookieConsentPayload(raw: string | null): CookieConsent | null {
  if (!raw) return null;
  try {
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

function readCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const localRaw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    const fromLocal = parseCookieConsentPayload(localRaw);
    if (fromLocal) return fromLocal;
  } catch {
    // Ignore storage access failures (privacy mode / blocked storage).
  }

  try {
    const cookieMatch = document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${COOKIE_CONSENT_COOKIE_NAME}=`));
    const cookieRaw = cookieMatch ? decodeURIComponent(cookieMatch.split("=")[1] || "") : null;
    return parseCookieConsentPayload(cookieRaw);
  } catch {
    return null;
  }
}

function saveCookieConsent(value: CookieConsent) {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify(value);
  try {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, payload);
  } catch {
    // Ignore storage access failures and fallback to cookie only.
  }
  try {
    document.cookie = `${COOKIE_CONSENT_COOKIE_NAME}=${encodeURIComponent(payload)}; Path=/; Max-Age=${COOKIE_CONSENT_MAX_AGE_SECONDS}; SameSite=Lax`;
  } catch {
    // Ignore cookie write failures.
  }
  try {
    window.dispatchEvent(
      new CustomEvent("kensar-cookie-consent-updated", {
        detail: value,
      })
    );
  } catch {
    // Ignore event dispatch failures (older browsers / strict contexts).
  }
}

export default function CookieConsentBanner() {
  const initialConsent = typeof window === "undefined" ? null : readCookieConsent();
  const [visible, setVisible] = useState(initialConsent == null);
  const [expanded, setExpanded] = useState(false);
  const [analytics, setAnalytics] = useState(initialConsent?.analytics ?? false);
  const [marketing, setMarketing] = useState(initialConsent?.marketing ?? false);
  const bannerRef = useRef<HTMLElement | null>(null);
  const lastActionAtRef = useRef(0);

  function runBannerAction(action: () => void) {
    const now = Date.now();
    if (now - lastActionAtRef.current < 250) return;
    lastActionAtRef.current = now;
    action();
  }

  function persistConsent(next: { analytics: boolean; marketing: boolean }) {
    // Always close the banner in UI first, even if persistence fails.
    setVisible(false);
    setExpanded(false);
    saveCookieConsent({
      version: COOKIE_CONSENT_VERSION,
      essential: true,
      analytics: next.analytics,
      marketing: next.marketing,
      updatedAt: new Date().toISOString(),
    });
  }

  useEffect(() => {
    const root = bannerRef.current;
    if (!root) return;

    const handleNativeAction = (event: Event) => {
      const target = event.target as HTMLElement | null;
      const actionNode = target?.closest("[data-cookie-action]") as HTMLElement | null;
      if (!actionNode) return;

      const action = (actionNode.getAttribute("data-cookie-action") || "").trim();
      if (!action) return;

      event.preventDefault();
      event.stopPropagation();

      runBannerAction(() => {
        if (action === "reject") {
          persistConsent({ analytics: false, marketing: false });
          return;
        }
        if (action === "configure") {
          setExpanded((current) => !current);
          return;
        }
        if (action === "accept") {
          persistConsent({ analytics: true, marketing: true });
          return;
        }
        if (action === "save") {
          persistConsent({ analytics, marketing });
        }
      });
    };

    // Safari fallback: native listeners bypass React synthetic-event quirks.
    root.addEventListener("click", handleNativeAction, true);
    root.addEventListener("touchend", handleNativeAction, true);
    root.addEventListener("pointerup", handleNativeAction, true);
    return () => {
      root.removeEventListener("click", handleNativeAction, true);
      root.removeEventListener("touchend", handleNativeAction, true);
      root.removeEventListener("pointerup", handleNativeAction, true);
    };
  }, [analytics, marketing]);

  if (!visible) return null;

  return (
    <aside
      ref={bannerRef}
      className="cookie-consent"
      role="dialog"
      aria-live="polite"
      aria-label="Preferencias de cookies"
    >
      <div className="cookie-consent-content">
        <p className="cookie-consent-title">Cookies y privacidad</p>
        <p className="cookie-consent-copy">
          Usamos cookies esenciales para operar el sitio y opcionales para analítica y marketing. Puedes aceptar,
          rechazar o configurar preferencias.
        </p>
        <div className="cookie-consent-actions">
          <button
            type="button"
            className="cookie-btn cookie-btn-secondary"
            data-cookie-action="reject"
            onClick={() => runBannerAction(() => persistConsent({ analytics: false, marketing: false }))}
            onPointerUp={() => runBannerAction(() => persistConsent({ analytics: false, marketing: false }))}
            onTouchEnd={() => runBannerAction(() => persistConsent({ analytics: false, marketing: false }))}
          >
            Rechazar opcionales
          </button>
          <button
            type="button"
            className="cookie-btn cookie-btn-secondary"
            data-cookie-action="configure"
            onClick={() => runBannerAction(() => setExpanded((current) => !current))}
            onPointerUp={() => runBannerAction(() => setExpanded((current) => !current))}
            onTouchEnd={() => runBannerAction(() => setExpanded((current) => !current))}
          >
            Configurar
          </button>
          <button
            type="button"
            className="cookie-btn cookie-btn-primary"
            data-cookie-action="accept"
            onClick={() => runBannerAction(() => persistConsent({ analytics: true, marketing: true }))}
            onPointerUp={() => runBannerAction(() => persistConsent({ analytics: true, marketing: true }))}
            onTouchEnd={() => runBannerAction(() => persistConsent({ analytics: true, marketing: true }))}
          >
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
              <button
                type="button"
                className="cookie-btn cookie-btn-primary"
                data-cookie-action="save"
                onClick={() => runBannerAction(() => persistConsent({ analytics, marketing }))}
                onPointerUp={() => runBannerAction(() => persistConsent({ analytics, marketing }))}
                onTouchEnd={() => runBannerAction(() => persistConsent({ analytics, marketing }))}
              >
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
