"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useWebCustomer } from "@/app/components/WebCustomerProvider";

function getFirstName(name?: string | null) {
  if (!name) return "";
  return name.trim().split(/\s+/)[0] || "";
}

export default function AccountAccess() {
  const { authenticated, customer, loading, logout } = useWebCustomer();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [isPendingLogout, setIsPendingLogout] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const query = searchParams.toString();
  const returnTo = `${pathname}${query ? `?${query}` : ""}`;
  const href = authenticated ? "/cuenta" : `/cuenta?returnTo=${encodeURIComponent(returnTo)}`;

  const firstName = getFirstName(customer?.name);
  const accountLabel = loading
    ? "Cuenta"
    : authenticated
      ? `Hola, ${firstName || "cliente"}`
      : "Hola, inicia sesión";

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (!containerRef.current?.contains(target)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  async function handleLogout() {
    try {
      setIsPendingLogout(true);
      await logout();
      setOpen(false);
    } finally {
      setIsPendingLogout(false);
    }
  }

  function handlePendingOption() {
    setOpen(false);
  }

  if (authenticated) {
    return (
      <div className="header-user-menu" ref={containerRef}>
        <button
          type="button"
          className="header-account-link"
          aria-label={`Opciones de cuenta de ${customer?.name ?? "cliente"}`}
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((current) => !current)}
        >
          <span className="header-icon-link" aria-hidden="true">
            <span className="header-account-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 12a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4Z" />
                <path d="M4.5 20.4c.6-3.6 3.6-6.2 7.5-6.2s6.9 2.6 7.5 6.2" />
              </svg>
            </span>
          </span>
          <span className="header-account-copy">{accountLabel}</span>
          <span className="header-account-caret" aria-hidden="true">
            <svg viewBox="0 0 12 12" fill="none">
              <path d="M2.5 4.5 6 8l3.5-3.5" />
            </svg>
          </span>
        </button>
        {open ? (
          <div className="header-user-menu-popover" role="menu" aria-label="Opciones de cuenta">
            <Link
              href="/historial"
              className="header-user-menu-item"
              role="menuitem"
              onClick={handlePendingOption}
            >
              Historial
            </Link>
            <Link
              href="/mis-pedidos"
              className="header-user-menu-item"
              role="menuitem"
              onClick={handlePendingOption}
            >
              Compras
            </Link>
            <Link
              href="/cuenta"
              className="header-user-menu-item"
              role="menuitem"
              onClick={handlePendingOption}
            >
              Cuenta
            </Link>
            <button
              type="button"
              className="header-user-menu-item"
              role="menuitem"
              onClick={() => void handleLogout()}
              disabled={isPendingLogout}
            >
              {isPendingLogout ? "Saliendo..." : "Salir"}
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="header-account-link"
      aria-label={authenticated ? `Entrar a la cuenta de ${customer?.name}` : "Entrar a mi cuenta"}
    >
      <span className="header-icon-link" aria-hidden="true">
        <span className="header-account-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M12 12a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4Z" />
            <path d="M4.5 20.4c.6-3.6 3.6-6.2 7.5-6.2s6.9 2.6 7.5 6.2" />
          </svg>
        </span>
      </span>
      <span className="header-account-copy">{accountLabel}</span>
    </Link>
  );
}
