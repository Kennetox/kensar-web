"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buildCatalogCategoryHref } from "@/app/lib/catalogRoutes";

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
  const isContactActive = pathname === "/empresa" || pathname.startsWith("/empresa/");
  const hasBrands = brands.length > 0;
  const parentCategories = categories.filter((category) => !category.parent_path);
  const childrenByParent = categories.reduce<Record<string, HeaderCategory[]>>((acc, item) => {
    const parentPath = (item.parent_path || "").trim();
    if (!parentPath) return acc;
    if (!acc[parentPath]) acc[parentPath] = [];
    acc[parentPath].push(item);
    return acc;
  }, {});

  Object.values(childrenByParent).forEach((items) => {
    items.sort((a, b) => a.name.localeCompare(b.name, "es"));
  });

  return (
    <nav className="top-nav" aria-label="Navegacion principal">
      <Link href="/" className={`nav-link${isHomeActive ? " active" : ""}`}>
        Inicio
      </Link>

      <div className={`nav-item-dropdown${isCatalogActive ? " active" : ""}`}>
        <span className={`nav-link nav-link-with-caret${isCatalogActive ? " active" : ""}`}>
          Catalogo
          <span className="nav-caret" aria-hidden="true">
            <svg viewBox="0 0 14 14" fill="none">
              <path d="M3 5.25 7 9l4-3.75" />
            </svg>
          </span>
        </span>
        <div className="nav-dropdown-panel" role="menu" aria-label="Categorias">
          {parentCategories.map((category) => {
            const subcategories = childrenByParent[category.path] || [];
            const hasSubcategories = subcategories.length > 0;
            return (
              <div
                key={category.id}
                className={hasSubcategories ? "nav-dropdown-item has-submenu" : "nav-dropdown-item"}
              >
                <Link
                  href={buildCatalogCategoryHref({ categoryPath: category.path })}
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
                        href={buildCatalogCategoryHref({
                          categoryPath: subcategory.path,
                          parentCategoryPath: category.path,
                        })}
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
