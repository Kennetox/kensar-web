"use client";

import { useState } from "react";

type ComboShareCardProps = {
  title: string;
  url: string;
  className?: string;
};

export default function ComboShareCard({ title, url, className }: ComboShareCardProps) {
  const [message, setMessage] = useState<string | null>(null);

  async function handleShare() {
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({
          title,
          text: `Mira este combo de Kensar: ${title}`,
          url,
        });
        return;
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
    }

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setMessage("Enlace copiado.");
        window.setTimeout(() => setMessage(null), 1800);
        return;
      }
      setMessage("No se pudo compartir. Copia el enlace desde el navegador.");
      window.setTimeout(() => setMessage(null), 2200);
    } catch {
      setMessage("No se pudo copiar el enlace.");
      window.setTimeout(() => setMessage(null), 2200);
    }
  }

  return (
    <section className={["product-share-card", className].filter(Boolean).join(" ")} aria-label="Compartir combo">
      <button type="button" className="product-share-action" onClick={() => void handleShare()}>
        <span className="product-share-action-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M17.5 8a2.5 2.5 0 1 0-2.2-3.7L8.8 8.1a2.5 2.5 0 1 0 0 7.8l6.5 3.8A2.5 2.5 0 1 0 16.5 18l-6.4-3.7a2.5 2.5 0 0 0 0-4.6l6.4-3.7A2.5 2.5 0 0 0 17.5 8Z" />
          </svg>
        </span>
        <span className="product-share-action-copy">
          <strong>Compartir combo</strong>
          <small>Envíalo por tus apps o copia el enlace.</small>
        </span>
      </button>
      {message ? <p className="product-share-message">{message}</p> : null}
    </section>
  );
}
