"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type HeaderCategory = {
  id: string;
  path: string;
  name: string;
};

type TopNavProps = {
  categories: HeaderCategory[];
};

const brandMocks = ["Yamaha", "Pioneer", "Shure", "JBL"];

export default function TopNav({ categories }: TopNavProps) {
  const pathname = usePathname();
  const isHomeActive = pathname === "/";
  const isCatalogActive = pathname === "/catalogo" || pathname.startsWith("/catalogo/");
  const isContactActive = pathname === "/empresa" || pathname.startsWith("/empresa/");

  return (
    <nav className="top-nav" aria-label="Navegacion principal">
      <Link href="/" className={`nav-link${isHomeActive ? " active" : ""}`}>
        Inicio
      </Link>

      <div className={`nav-item-dropdown${isCatalogActive ? " active" : ""}`}>
        <Link href="/catalogo" className={`nav-link nav-link-with-caret${isCatalogActive ? " active" : ""}`}>
          Catalogo
          <span className="nav-caret" aria-hidden="true">
            <svg viewBox="0 0 14 14" fill="none">
              <path d="M3 5.25 7 9l4-3.75" />
            </svg>
          </span>
        </Link>
        <div className="nav-dropdown-panel" role="menu" aria-label="Categorias">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/catalogo?category=${encodeURIComponent(category.path)}`}
              className="nav-dropdown-link"
              role="menuitem"
            >
              {category.name}
            </Link>
          ))}
        </div>
      </div>

      <Link href="/catalogo?sort=nuevos" className="nav-link">
        Nuevos Productos
      </Link>

      <div className="nav-item-dropdown">
        <Link href="/catalogo" className="nav-link nav-link-with-caret">
          Marcas
          <span className="nav-caret" aria-hidden="true">
            <svg viewBox="0 0 14 14" fill="none">
              <path d="M3 5.25 7 9l4-3.75" />
            </svg>
          </span>
        </Link>
        <div className="nav-dropdown-panel" role="menu" aria-label="Marcas">
          {brandMocks.map((brand) => (
            <Link
              key={brand}
              href={`/catalogo?brand=${encodeURIComponent(brand.toLowerCase())}`}
              className="nav-dropdown-link"
              role="menuitem"
            >
              {brand}
            </Link>
          ))}
        </div>
      </div>

      <Link href="/empresa" className={`nav-link${isContactActive ? " active" : ""}`}>
        Contacto
      </Link>
    </nav>
  );
}
