"use client";

import { useEffect, useRef, useState } from "react";
import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useWebCustomer } from "@/app/components/WebCustomerProvider";

function getFirstName(name?: string | null) {
  if (!name) return "";
  return name.trim().split(/\s+/)[0] || "";
}

function getInitials(name?: string | null) {
  if (!name) return "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export default function HeaderUserBadge() {
  const router = useRouter();
  const { authenticated, customer, loading, logout } = useWebCustomer();
  const hydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );
  const [open, setOpen] = useState(false);
  const [isPendingLogout, setIsPendingLogout] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const shouldRender = hydrated && !loading && authenticated && Boolean(customer?.name);
  const firstName = getFirstName(customer?.name);
  const initials = getInitials(customer?.name);

  useEffect(() => {
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
  }, []);

  async function handleLogout() {
    try {
      setIsPendingLogout(true);
      await logout();
      setOpen(false);
    } finally {
      setIsPendingLogout(false);
    }
  }

  function goTo(path: string) {
    setOpen(false);
    router.push(path);
  }

  if (!shouldRender) {
    return null;
  }

  return (
    <div className="header-user-menu" ref={containerRef}>
      <button
        type="button"
        className="header-user-badge"
        aria-label={`Opciones de cuenta de ${customer?.name ?? "cliente"}`}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="header-user-badge-initials" aria-hidden="true">
          {initials}
        </span>
        <span className="header-user-badge-name">
          Hola, {firstName}
        </span>
      </button>
      {open ? (
        <div className="header-user-menu-popover" role="menu" aria-label="Opciones de usuario">
          <button
            type="button"
            className="header-user-menu-item"
            role="menuitem"
            onClick={() => goTo("/cuenta")}
          >
            Mi cuenta
          </button>
          <button
            type="button"
            className="header-user-menu-item"
            role="menuitem"
            onClick={() => goTo("/mis-pedidos")}
          >
            Mis pedidos
          </button>
          <button
            type="button"
            className="header-user-menu-item"
            role="menuitem"
            onClick={handleLogout}
            disabled={isPendingLogout}
          >
            {isPendingLogout ? "Cerrando..." : "Cerrar sesión"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
