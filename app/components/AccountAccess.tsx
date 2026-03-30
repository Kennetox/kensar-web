"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useWebCustomer } from "@/app/components/WebCustomerProvider";

function getFirstName(name?: string | null) {
  if (!name) return "Cuenta";
  return name.trim().split(/\s+/)[0] || "Cuenta";
}

export default function AccountAccess() {
  const { authenticated, customer, loading } = useWebCustomer();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const title = !hydrated || loading
    ? "Cuenta"
    : authenticated
      ? getFirstName(customer?.name)
      : "Cuenta";
  const subtitle = !hydrated || loading ? "Acceder" : authenticated ? "Activa" : "Entrar";

  return (
    <Link
      href="/cuenta"
      className={`header-account-link${authenticated ? " is-authenticated" : ""}`}
      aria-label={authenticated ? `Entrar a la cuenta de ${customer?.name}` : "Entrar a mi cuenta"}
    >
      <span className="header-account-icon" aria-hidden="true">
        {!hydrated || loading ? "…" : authenticated ? "✓" : "○"}
      </span>
      <span className="header-account-copy">
        <strong>{title}</strong>
        <small>{subtitle}</small>
      </span>
    </Link>
  );
}
