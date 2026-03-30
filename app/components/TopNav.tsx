"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type NavItem =
  | { href: string; label: string; type: "page" }
  | { href: string; label: string; type: "section"; sectionId: string };

const navItems: NavItem[] = [
  { href: "/", label: "Inicio", type: "page" },
  { href: "/catalogo", label: "Catálogo", type: "page" },
  { href: "/empresa#empresa", label: "Empresa", type: "section", sectionId: "empresa" },
  { href: "/empresa#servicios", label: "Servicios", type: "section", sectionId: "servicios" },
  { href: "/empresa#contacto", label: "Contacto", type: "section", sectionId: "contacto" },
];

export default function TopNav() {
  const pathname = usePathname();
  const [activeSection, setActiveSection] = useState("empresa");

  useEffect(() => {
    if (pathname !== "/empresa") {
      return;
    }

    const sectionIds = navItems
      .filter((item): item is Extract<NavItem, { type: "section" }> => item.type === "section")
      .map((item) => item.sectionId);

    const getElements = () =>
      sectionIds
        .map((id) => document.getElementById(id))
        .filter((element): element is HTMLElement => element instanceof HTMLElement);

    const updateActiveSection = () => {
      const elements = getElements();
      if (!elements.length) return;

      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
        setActiveSection(sectionIds[sectionIds.length - 1]);
        return;
      }

      const topbarHeightRaw = getComputedStyle(document.documentElement)
        .getPropertyValue("--topbar-height")
        .trim()
        .replace("px", "");
      const topbarHeight = Number.parseFloat(topbarHeightRaw) || 140;
      const probe = topbarHeight + 28;

      let current = sectionIds[0] ?? "empresa";
      for (const element of elements) {
        const rect = element.getBoundingClientRect();
        if (rect.top <= probe && rect.bottom > probe) {
          current = element.id;
          break;
        }
        if (rect.top <= probe) {
          current = element.id;
        }
      }

      setActiveSection(current);
    };

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);

    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, [pathname]);

  return (
    <nav className="top-nav" aria-label="Navegacion principal">
      {navItems.map((item) => {
        const isActive =
          item.type === "page"
            ? pathname === item.href
            : pathname === "/empresa" && activeSection === item.sectionId;

        return (
          <Link key={item.href} href={item.href} className={`nav-link${isActive ? " active" : ""}`}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
