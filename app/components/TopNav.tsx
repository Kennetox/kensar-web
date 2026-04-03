"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  match: "exact" | "prefix";
};

const navItems: NavItem[] = [
  { href: "/", label: "Inicio", match: "exact" },
  { href: "/catalogo", label: "Catalogo", match: "prefix" },
  { href: "/carrito", label: "Carrito", match: "prefix" },
  { href: "/cuenta", label: "Mi cuenta", match: "prefix" },
  { href: "/empresa#contacto", label: "Contacto", match: "prefix" },
];

export default function TopNav() {
  const pathname = usePathname();

  return (
    <nav className="top-nav" aria-label="Navegacion principal">
      {navItems.map((item) => {
        const cleanHref = item.href.split("#")[0] || item.href;
        const isActive =
          item.match === "exact"
            ? pathname === cleanHref
            : pathname === cleanHref || pathname.startsWith(`${cleanHref}/`);

        return (
          <Link key={item.href} href={item.href} className={`nav-link${isActive ? " active" : ""}`}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
