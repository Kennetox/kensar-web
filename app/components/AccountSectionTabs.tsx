"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const accountTabs = [
  { href: "/historial", label: "Historial" },
  { href: "/mis-pedidos", label: "Compras" },
  { href: "/cuenta", label: "Cuenta" },
];

export default function AccountSectionTabs() {
  const pathname = usePathname();

  return (
    <nav className="account-section-tabs" aria-label="Navegación de cuenta">
      {accountTabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`account-section-tab${isActive ? " active" : ""}`}
            aria-current={isActive ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
