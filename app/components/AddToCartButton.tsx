"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useWebCart } from "@/app/components/WebCartProvider";
import { useWebCustomer } from "@/app/components/WebCustomerProvider";

export default function AddToCartButton({
  productId,
}: {
  productId: number;
}) {
  const router = useRouter();
  const { authenticated } = useWebCustomer();
  const { addItem } = useWebCart();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    if (!authenticated) {
      router.push("/cuenta");
      return;
    }

    try {
      setBusy(true);
      setMessage(null);
      await addItem(productId, 1);
      setMessage("Agregado");
      window.setTimeout(() => setMessage(null), 1800);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo agregar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="catalog-add-cart-wrap">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={busy}
        className="catalog-secondary-action catalog-cart-action"
      >
        {busy ? "Agregando..." : authenticated ? "Agregar al carrito" : "Ingresar para comprar"}
      </button>
      {message ? <span className="catalog-cart-feedback">{message}</span> : null}
    </div>
  );
}
