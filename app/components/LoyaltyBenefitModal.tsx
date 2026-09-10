"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type RewardState = {
  status: "issued" | "activated" | "redeemed" | "expired" | "cancelled" | "invalid";
  code?: string | null;
};

export default function LoyaltyBenefitModal() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const token = searchParams.get("beneficio");
  const [reward, setReward] = useState<RewardState | null>(null);
  const [loading, setLoading] = useState(false);
  const [activating, setActivating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const visible = pathname === "/" && Boolean(token);

  useEffect(() => {
    if (!visible || !token) {
      setReward(null);
      setMessage(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setMessage(null);
    fetch(`/api/rewards/public/${encodeURIComponent(token)}`)
      .then((response) => response.json())
      .then((data: RewardState) => {
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
  }, [token, visible]);

  function close() {
    router.replace("/", { scroll: false });
  }

  async function activate() {
    if (!token) return;
    setActivating(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/rewards/public/${encodeURIComponent(token)}`, { method: "POST" });
      const data = (await response.json()) as RewardState;
      setReward(data);
      if (data.status !== "activated") setMessage("No pudimos activar el beneficio. Inténtalo de nuevo.");
    } catch {
      setMessage("No pudimos activar el beneficio. Inténtalo de nuevo.");
    } finally {
      setActivating(false);
    }
  }

  async function copyCode() {
    if (!reward?.code) return;
    try {
      await navigator.clipboard.writeText(reward.code);
      setMessage("Código copiado. Preséntalo en caja en tu próxima compra.");
    } catch {
      setMessage("Guarda este código antes de continuar.");
    }
  }

  if (!visible) return null;

  const status = reward?.status;
  const unavailable = status === "invalid" || status === "redeemed" || status === "expired" || status === "cancelled";
  const unavailableCopy =
    status === "redeemed"
      ? ["Este beneficio ya fue utilizado.", "Sigue explorando nuestros productos y novedades."]
      : status === "expired"
        ? ["Este beneficio ya venció.", "Sigue explorando nuestros productos y novedades."]
        : status === "cancelled"
          ? ["Este beneficio ya no está disponible.", "Sigue explorando nuestros productos y novedades."]
          : ["No pudimos encontrar este beneficio.", "Revisa el código QR o solicita apoyo en tienda."];

  return (
    <div className="loyalty-modal-backdrop" role="presentation">
      <section className="loyalty-modal" role="dialog" aria-modal="true" aria-labelledby="loyalty-modal-title">
        <button type="button" className="loyalty-modal-close" onClick={close} aria-label="Cerrar beneficio">
          ×
        </button>
        <p className="loyalty-modal-eyebrow">Beneficio Kensar</p>
        {loading ? (
          <>
            <h1 id="loyalty-modal-title">Estamos preparando tu beneficio</h1>
            <p>Un momento, por favor.</p>
          </>
        ) : unavailable ? (
          <>
            <h1 id="loyalty-modal-title">{unavailableCopy[0]}</h1>
            <p>{unavailableCopy[1]}</p>
            <button type="button" className="loyalty-modal-secondary" onClick={close}>
              Explorar productos
            </button>
          </>
        ) : status === "activated" && reward?.code ? (
          <>
            <h1 id="loyalty-modal-title">¡Tu beneficio está activo!</h1>
            <p>Guarda este código y preséntalo en caja en tu próxima compra.</p>
            <div className="loyalty-modal-code">{reward.code}</div>
            <p className="loyalty-modal-save-hint">
              Toma una foto o captura de pantalla antes de cerrar para mostrar este código luego en tienda.
            </p>
            <p className="loyalty-modal-note">El descuento aplicable se confirma según el valor de la compra.</p>
            <button type="button" className="loyalty-modal-primary" onClick={copyCode}>
              Copiar código
            </button>
            <button type="button" className="loyalty-modal-text-action" onClick={close}>
              Explorar productos
            </button>
          </>
        ) : (
          <>
            <h1 id="loyalty-modal-title">Tu próxima compra puede tener un beneficio.</h1>
            <p>Actívalo en segundos y recibe un código para usarlo cuando regreses a Kensar.</p>
            <button type="button" className="loyalty-modal-primary" onClick={activate} disabled={activating}>
              {activating ? "Activando..." : "Activar beneficio"}
            </button>
            <button type="button" className="loyalty-modal-text-action" onClick={close}>
              Explorar productos primero
            </button>
          </>
        )}
        {message ? <p className="loyalty-modal-message">{message}</p> : null}
      </section>
    </div>
  );
}
