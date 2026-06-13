"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { buildCatalogCategoryHref } from "@/app/lib/catalogRoutes";
import { buildCatalogCategoryMap, buildCatalogCategoryTrailFromKey } from "@/app/lib/catalogCategoryTree";

type HeaderCategory = {
  id: string;
  path: string;
  name: string;
  parent_path?: string | null;
};

type TopNavProps = {
  categories: HeaderCategory[];
  brands: {
    value: string;
    label: string;
    count: number;
  }[];
};

export default function TopNav({ categories, brands }: TopNavProps) {
  const pathname = usePathname();
  const isHomeActive = pathname === "/";
  const isCatalogActive = pathname === "/catalogo" || pathname.startsWith("/catalogo/");
  const isCombosActive = pathname === "/combos" || pathname.startsWith("/combos/");
  const isCustomizeActive = pathname === "/personaliza" || pathname.startsWith("/personaliza/");
  const isContactActive = pathname === "/empresa" || pathname.startsWith("/empresa/");
  const hasBrands = brands.length > 0;
  const categoryMap = buildCatalogCategoryMap(categories);
  const parentCategories = categories.filter((category) => !category.parent_path);
  const childrenByParent = categories.reduce<Record<string, HeaderCategory[]>>((acc, item) => {
    const parentPath = (item.parent_path || "").trim();
    if (!parentPath) return acc;
    if (!acc[parentPath]) acc[parentPath] = [];
    acc[parentPath].push(item);
    return acc;
  }, {});
  const [catalogMenuOpen, setCatalogMenuOpen] = useState(false);

  useEffect(() => {
    const className = "catalog-menu-active";
    if (catalogMenuOpen) {
      document.body.classList.add(className);
    } else {
      document.body.classList.remove(className);
    }
    return () => {
      document.body.classList.remove(className);
    };
  }, [catalogMenuOpen]);

  function getCategoryHref(category: HeaderCategory, fallbackSegments: string[] = [category.path]) {
    const trail = buildCatalogCategoryTrailFromKey(category.path, categoryMap);
    return buildCatalogCategoryHref({
      categorySegments: trail?.segments?.length ? trail.segments : fallbackSegments,
    });
  }

  return (
    <nav className="top-nav" aria-label="Navegacion principal">
      <Link href="/" className={`nav-link${isHomeActive ? " active" : ""}`}>
        Inicio
      </Link>

      <div
        className={`nav-item-dropdown${isCatalogActive || isCombosActive ? " active" : ""}`}
        onMouseEnter={() => setCatalogMenuOpen(true)}
        onMouseLeave={() => setCatalogMenuOpen(false)}
        >
          <span className={`nav-link nav-link-with-caret${isCatalogActive || isCombosActive ? " active" : ""}`}>
            Catalogo
            <span className="nav-caret" aria-hidden="true">
              <svg viewBox="0 0 14 14" fill="none">
                <path d="M3 5.25 7 9l4-3.75" />
              </svg>
            </span>
          </span>
        <div className="nav-dropdown-panel" role="menu" aria-label="Categorias">
          <Link href="/combos" className="nav-dropdown-link nav-dropdown-link-combos" role="menuitem">
            Combos
          </Link>
          <span className="nav-dropdown-divider" aria-hidden="true" />
          {parentCategories.map((category) => {
            const subcategories = childrenByParent[category.path] || [];
            const hasSubcategories = subcategories.length > 0;
            return (
              <div
                key={category.id}
                className={hasSubcategories ? "nav-dropdown-item has-submenu" : "nav-dropdown-item"}
              >
                <Link
                  href={getCategoryHref(category)}
                  className={hasSubcategories ? "nav-dropdown-link nav-dropdown-link-parent" : "nav-dropdown-link"}
                  role="menuitem"
                >
                  <span>{category.name}</span>
                  {hasSubcategories ? <span className="nav-submenu-caret">›</span> : null}
                </Link>
                {hasSubcategories ? (
                  <div className="nav-submenu-panel" role="menu" aria-label={`Subcategorías de ${category.name}`}>
                    {subcategories.map((subcategory) => (
                      <Link
                        key={subcategory.id}
                        href={getCategoryHref(subcategory, [category.path, subcategory.path])}
                        className="nav-dropdown-link"
                        role="menuitem"
                      >
                        {subcategory.name}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <Link
        href="/personaliza"
        className={`nav-link nav-link-with-badge${isCustomizeActive ? " active" : ""}`}
      >
        <span className="nav-link-label">Personaliza tu instrumento</span>
        <span className="nav-new-badge">NUEVO</span>
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
          {hasBrands ? (
            brands.map((brand) => (
              <Link
                key={brand.value}
                href={`/catalogo?brand=${encodeURIComponent(brand.value)}`}
                className="nav-dropdown-link"
                role="menuitem"
              >
                {brand.label}
              </Link>
            ))
          ) : (
            <Link href="/catalogo" className="nav-dropdown-link" role="menuitem">
              Ver todas las marcas
            </Link>
          )}
        </div>
      </div>

      <Link href="/empresa" className={`nav-link${isContactActive ? " active" : ""}`}>
        Contacto
      </Link>
    </nav>
  );
}
