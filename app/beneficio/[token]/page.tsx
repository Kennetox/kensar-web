"use client";

import { use, useEffect, useState } from "react";

type RewardState = {
  status: "issued" | "activated" | "redeemed" | "expired" | "cancelled" | "invalid";
  amount?: number | null;
  minimum_purchase?: number | null;
  expires_at?: string | null;
  code?: string | null;
  redemption_options?: {
    min_purchase: number;
    max_purchase?: number | null;
    discount_amount: number;
  }[];
};

function formatMoney(value?: number | null) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value?: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export default function LoyaltyBenefitPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [reward, setReward] = useState<RewardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/rewards/public/${encodeURIComponent(token)}`)
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) setReward(data);
      })
      .catch(() => {
        if (!cancelled) setReward({ status: "invalid" });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function activate() {
    if (!token) return;
    setActivating(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/rewards/public/${encodeURIComponent(token)}`, {
        method: "POST",
      });
      const data = (await response.json()) as RewardState;
      setReward(data);
      if (data.status === "activated" && data.code) {
        setMessage("Beneficio activado.");
      }
    } catch {
      setMessage("No pudimos activar el beneficio.");
    } finally {
      setActivating(false);
    }
  }

  async function copyCode() {
    if (!reward?.code) return;
    await navigator.clipboard.writeText(reward.code);
    setMessage("Código copiado.");
  }

  const status = reward?.status ?? "invalid";
  const showAmounts = status === "issued" || status === "activated";
  const redemptionOptions = reward?.redemption_options ?? [];
  const maxRedemptionAmount = redemptionOptions.reduce(
    (max, option) => Math.max(max, Number(option.discount_amount || 0)),
    0
  );

  return (
    <main className="loyalty-page">
      <section className="loyalty-panel">
        <div className="loyalty-brand">Kensar Electronic</div>
        {loading ? (
          <h1>Consultando beneficio...</h1>
        ) : status === "invalid" ? (
          <>
            <h1>Beneficio no disponible</h1>
            <p>Revisa el QR o solicita apoyo en tienda.</p>
          </>
        ) : status === "redeemed" ? (
          <>
            <h1>Beneficio utilizado</h1>
            <p>Este descuento ya fue redimido.</p>
          </>
        ) : status === "expired" ? (
          <>
            <h1>Beneficio vencido</h1>
            <p>La vigencia de este descuento ya terminó.</p>
          </>
        ) : status === "cancelled" ? (
          <>
            <h1>Beneficio no disponible</h1>
            <p>Este beneficio fue cancelado y ya no puede activarse.</p>
          </>
        ) : (
          <>
            <h1>{status === "activated" ? "Tu código está listo" : "¡Tienes un beneficio para tu próxima compra!"}</h1>
            <p>
              Activa tu código y obtén hasta {formatMoney(maxRedemptionAmount)} de descuento según el valor de tu
              próxima compra.
            </p>
            {showAmounts ? (
              <div className="loyalty-amounts">
                <div>
                  <span>Descuento máximo</span>
                  <strong>Hasta {formatMoney(maxRedemptionAmount)}</strong>
                </div>
                <div>
                  <span>Vence</span>
                  <strong>{formatDate(reward?.expires_at)}</strong>
                </div>
              </div>
            ) : null}
            {redemptionOptions.length > 0 ? (
              <div className="loyalty-tiers">
                <p>Tu beneficio:</p>
                {redemptionOptions.map((option) => (
                  <div key={`${option.min_purchase}-${option.discount_amount}`}>
                    <span>{formatMoney(option.discount_amount)}</span>
                    <strong>en compras desde {formatMoney(option.min_purchase)}</strong>
                  </div>
                ))}
              </div>
            ) : null}
            {status === "issued" ? (
              <button type="button" className="loyalty-primary" onClick={activate} disabled={activating}>
                {activating ? "Activando..." : "Activar mi beneficio"}
              </button>
            ) : null}
            {status === "activated" && reward?.code ? (
              <div className="loyalty-code-block">
                <div className="loyalty-code">{reward.code}</div>
                <button type="button" className="loyalty-primary" onClick={copyCode}>
                  Copiar código
                </button>
                <p className="loyalty-save-note">
                  Toma un pantallazo o guarda este código en un lugar seguro para no perderlo.
                </p>
              </div>
            ) : null}
          </>
        )}
        {message ? <p className="loyalty-message">{message}</p> : null}
      </section>
    </main>
  );
}
