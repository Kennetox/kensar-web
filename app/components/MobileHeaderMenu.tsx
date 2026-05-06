"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { buildCatalogCategoryHref } from "@/app/lib/catalogRoutes";

type HeaderCategory = {
  id: string;
  path: string;
  name: string;
  parent_path?: string | null;
};

type HeaderBrand = {
  value: string;
  label: string;
  count: number;
};

type MobileHeaderMenuProps = {
  categories: HeaderCategory[];
  brands: HeaderBrand[];
};

type MenuView = "root" | "catalog" | "subcategories";

export default function MobileHeaderMenu({ categories }: MobileHeaderMenuProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<MenuView>("root");
  const [activeParentPath, setActiveParentPath] = useState<string | null>(null);

  const parentCategories = useMemo(
    () => categories.filter((category) => !category.parent_path).sort((a, b) => a.name.localeCompare(b.name, "es")),
    [categories]
  );

  const childrenByParent = useMemo(() => {
    const map = categories.reduce<Record<string, HeaderCategory[]>>((acc, item) => {
      const parentPath = (item.parent_path || "").trim();
      if (!parentPath) return acc;
      if (!acc[parentPath]) acc[parentPath] = [];
      acc[parentPath].push(item);
      return acc;
    }, {});

    Object.values(map).forEach((items) => {
      items.sort((a, b) => a.name.localeCompare(b.name, "es"));
    });

    return map;
  }, [categories]);

  const activeParent = useMemo(
    () => parentCategories.find((category) => category.path === activeParentPath) || null,
    [activeParentPath, parentCategories]
  );

  const activeSubcategories = activeParentPath ? childrenByParent[activeParentPath] || [] : [];

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = originalOverflow;
    }
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  function closeMenu() {
    setOpen(false);
    setView("root");
    setActiveParentPath(null);
  }

  function goBack() {
    if (view === "subcategories") {
      setView("catalog");
      setActiveParentPath(null);
      return;
    }
    setView("root");
  }

  function openCatalogView() {
    setView("catalog");
  }

  function openSubcategories(path: string) {
    setActiveParentPath(path);
    setView("subcategories");
  }

  const sliderIndex = view === "root" ? 0 : view === "catalog" ? 1 : 2;

  return (
    <>
      <button
        type="button"
        className="mobile-menu-trigger"
        aria-label="Abrir menu principal"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <span className="mobile-menu-trigger-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M4 6h16" />
            <path d="M4 12h16" />
            <path d="M4 18h16" />
          </svg>
        </span>
      </button>

      <div className={`mobile-menu-overlay${open ? " is-open" : ""}`} aria-hidden={!open}>
        <button
          type="button"
          className="mobile-menu-backdrop"
          aria-label="Cerrar menu"
          onClick={closeMenu}
          tabIndex={open ? 0 : -1}
        />
        <aside className="mobile-menu-drawer" role="dialog" aria-modal="true" aria-label="Menu principal">
          <div className="mobile-menu-head">
            <strong>Menu</strong>
            <button type="button" onClick={closeMenu} aria-label="Cerrar menu">
              ✕
            </button>
          </div>

          {view !== "root" ? (
            <button type="button" className="mobile-menu-back" onClick={goBack}>
              <span aria-hidden="true">‹</span>
              Anterior
            </button>
          ) : null}

          <div className="mobile-menu-viewport">
            <div
              className="mobile-menu-slider"
              style={{ transform: `translateX(-${sliderIndex * (100 / 3)}%)` }}
            >
              <section className="mobile-menu-screen" aria-label="Principal">
                <nav className="mobile-menu-nav" aria-label="Navegacion movil">
                  <Link href="/" onClick={closeMenu}>Inicio</Link>
                  <button type="button" className="mobile-menu-link-button" onClick={openCatalogView}>
                    Catalogo
                    <span aria-hidden="true">›</span>
                  </button>
                  <Link href="/personaliza" onClick={closeMenu}>Personaliza tu instrumento</Link>
                  <Link href="/empresa" onClick={closeMenu}>Contacto</Link>
                </nav>
              </section>

              <section className="mobile-menu-screen" aria-label="Categorias principales">
                <div className="mobile-menu-nav">
                  {parentCategories.map((category) => {
                    const hasChildren = (childrenByParent[category.path] || []).length > 0;
                    if (!hasChildren) {
                      return (
                        <Link
                          key={category.id}
                          href={buildCatalogCategoryHref({ categoryPath: category.path })}
                          onClick={closeMenu}
                        >
                          {category.name}
                        </Link>
                      );
                    }

                    return (
                      <button
                        key={category.id}
                        type="button"
                        className="mobile-menu-link-button"
                        onClick={() => openSubcategories(category.path)}
                      >
                        {category.name}
                        <span aria-hidden="true">›</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="mobile-menu-screen" aria-label="Subcategorias">
                <div className="mobile-menu-nav">
                  {activeParent ? (
                    <Link
                      href={buildCatalogCategoryHref({ categoryPath: activeParent.path })}
                      onClick={closeMenu}
                    >
                      Ver todo en {activeParent.name}
                    </Link>
                  ) : null}
                  {activeSubcategories.map((subcategory) => (
                    <Link
                      key={subcategory.id}
                      href={buildCatalogCategoryHref({
                        categoryPath: subcategory.path,
                        parentCategoryPath: activeParent?.path || undefined,
                      })}
                      onClick={closeMenu}
                    >
                      {subcategory.name}
                    </Link>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
