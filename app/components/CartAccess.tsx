"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useWebCart } from "@/app/components/WebCartProvider";
import { useWebCustomer } from "@/app/components/WebCustomerProvider";

export default function CartAccess() {
  const { authenticated } = useWebCustomer();
  const { cart, loading } = useWebCart();
  const [hydrated, setHydrated] = useState(false);
  const count = cart?.items_count ?? 0;

  useEffect(() => {
    setHydrated(true);
  }, []);

  const subtitle = !hydrated || loading ? "Ver" : authenticated ? "Ver" : "Entrar";
  const badgeValue = !hydrated || loading ? "…" : count;

  return (
    <Link
      href="/carrito"
      className={`header-cart-link${authenticated && count > 0 ? " has-items" : ""}`}
      aria-label="Abrir carrito"
    >
      <span className="header-cart-icon" aria-hidden="true">
        🛒
      </span>
      <span className="header-cart-copy">
        <strong>Carrito</strong>
        <small>{subtitle}</small>
      </span>
      <span className="header-cart-count">{badgeValue}</span>
    </Link>
  );
}
