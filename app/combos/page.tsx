import Link from "next/link";
import ComboCard from "./ComboCard";
import CombosFiltersSidebar from "./CombosFiltersSidebar";
import MobileFilterDisclosure from "@/app/catalogo/MobileFilterDisclosure";
import { getCatalogCombos, type WebCatalogCombo } from "@/app/lib/metrikCatalog";
import {
  buildCombosHref,
  buildPaginationTokens,
  humanizeComboCategoryKey,
  normalizeComboFilterKey,
  type ComboFilterOption,
  type ComboSortOption,
} from "./comboUtils";

export const metadata = {
  title: "Combos",
  description: "Combos y kits armados por Kensar Electronic con productos seleccionados y precio final.",
};

type CombosPageProps = {
  searchParams?: Promise<{
    q?: string;
    local_q?: string;
    category?: string | string[];
    sort?: string;
    min_price?: string;
    max_price?: string;
    page?: string;
    view?: string;
  }>;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function matchesComboQuery(combo: WebCatalogCombo, query: string) {
  if (!query) return true;
  const needle = query.toLocaleLowerCase("es");
  const haystack = [
    combo.name,
    combo.short_description || "",
    combo.long_description || "",
    combo.badge_text || "",
    combo.category_key || "",
    ...combo.items.map((item) => item.product_name || ""),
  ]
    .join(" ")
    .toLocaleLowerCase("es");
  return haystack.includes(needle);
}

function sortCombos(combos: WebCatalogCombo[], sort: ComboSortOption) {
  const sorted = [...combos];

  switch (sort) {
    case "name_asc":
      return sorted.sort((a, b) => a.name.localeCompare(b.name, "es"));
    case "name_desc":
      return sorted.sort((a, b) => b.name.localeCompare(a.name, "es"));
    case "price_asc":
      return sorted.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    case "price_desc":
      return sorted.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    default:
      return sorted.sort(
        (a, b) =>
          Number(b.featured ? 1 : 0) - Number(a.featured ? 1 : 0) ||
          Number(a.sort_order || 0) - Number(b.sort_order || 0) ||
          Number(a.price || 0) - Number(b.price || 0) ||
          a.name.localeCompare(b.name, "es")
      );
  }
}

function buildCategoryOptions(combos: WebCatalogCombo[]): ComboFilterOption[] {
  const map = new Map<string, ComboFilterOption>();
  combos.forEach((combo) => {
    const rawKey = combo.category_key?.trim();
    const key = normalizeComboFilterKey(rawKey || "");
    if (!rawKey || !key) return;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      return;
    }
    map.set(key, {
      value: rawKey,
      label: humanizeComboCategoryKey(rawKey) || rawKey,
      count: 1,
    });
  });
  return Array.from(map.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.label.localeCompare(b.label, "es");
  });
}

export default async function CombosPage({ searchParams }: CombosPageProps) {
  const pageSize = 24;
  const params = (await searchParams) ?? {};
  const globalQ = params.q?.trim() || "";
  const localQ = params.local_q?.trim() || "";
  const effectiveQ = localQ || globalQ;
  const selectedCategories = Array.isArray(params.category)
    ? params.category.map((item) => item.trim()).filter(Boolean)
    : params.category?.trim()
    ? [params.category.trim()]
    : [];
  const selectedCategoryKeys = new Set(selectedCategories.map((value) => normalizeComboFilterKey(value)));
  const rawSort = (params.sort || "").trim();
  const sort = (["recommended", "name_asc", "name_desc", "price_asc", "price_desc"].includes(rawSort)
    ? rawSort
    : "recommended") as ComboSortOption;
  const minPrice = Math.max(Number(params.min_price) || 0, 0);
  const maxPrice = Math.max(Number(params.max_price) || 0, 0);
  const page = Math.max(Number(params.page) || 1, 1);
  const view = (params.view || "").trim() === "list" ? "list" : "grid";

  const allCombos = await getCatalogCombos();
  const categoryOptions = buildCategoryOptions(allCombos);
  const categoryLabelByKey = new Map(
    categoryOptions.map((item) => [normalizeComboFilterKey(item.value), item.label])
  );

  const filteredCombos = sortCombos(
    allCombos.filter((combo) => {
      if (!matchesComboQuery(combo, effectiveQ)) return false;
      if (selectedCategoryKeys.size > 0) {
        const comboKey = normalizeComboFilterKey(combo.category_key || "");
        if (!comboKey || !selectedCategoryKeys.has(comboKey)) return false;
      }
      const comboPrice = Number(combo.price || 0);
      if (minPrice > 0 && comboPrice < minPrice) return false;
      if (maxPrice > 0 && comboPrice > maxPrice) return false;
      return true;
    }),
    sort
  );

  const totalCombos = filteredCombos.length;
  const totalItems = filteredCombos.reduce((sum, combo) => sum + combo.items.length, 0);
  const availableMinPrice = allCombos.reduce((currentMin, combo) => {
    const numericPrice = typeof combo.price === "number" && Number.isFinite(combo.price) ? Math.round(combo.price) : 0;
    if (!numericPrice) return currentMin;
    return Math.min(currentMin, numericPrice);
  }, Number.POSITIVE_INFINITY);
  const availableMaxPrice = allCombos.reduce((currentMax, combo) => {
    const numericPrice = typeof combo.price === "number" && Number.isFinite(combo.price) ? Math.round(combo.price) : 0;
    return Math.max(currentMax, numericPrice);
  }, 0);
  const safeAvailableMinPrice = Number.isFinite(availableMinPrice) ? availableMinPrice : 0;
  const safeAvailableMaxPrice = Math.max(availableMaxPrice, safeAvailableMinPrice);
  const totalPages = Math.max(1, Math.ceil(totalCombos / Math.max(1, pageSize)));
  const safePage = clamp(page, 1, totalPages);
  const start = (safePage - 1) * pageSize;
  const visibleCombos = filteredCombos.slice(start, start + pageSize);
  const paginationTokens = buildPaginationTokens(safePage, totalPages);
  const selectedCategoryLabels = selectedCategories
    .map((value) => categoryLabelByKey.get(normalizeComboFilterKey(value)) || humanizeComboCategoryKey(value) || value)
    .filter(Boolean);
  const selectedCategoryName =
    selectedCategoryLabels.length === 1
      ? selectedCategoryLabels[0]
      : selectedCategoryLabels.length > 1
      ? selectedCategoryLabels.join(" / ")
      : "";
  const catalogHeaderTitle = selectedCategoryName || "Combos";
  const catalogHeaderSubtitle = selectedCategoryLabels.length
    ? selectedCategoryLabels.length > 1
      ? "Filtrado por varias categorías"
      : "Categoría de combos"
    : "Todos los combos disponibles";
  const catalogHrefBase = {
    q: globalQ || undefined,
    local_q: localQ || undefined,
    category: selectedCategories.length ? selectedCategories : undefined,
    sort,
    min_price: minPrice > 0 ? String(minPrice) : undefined,
    max_price: maxPrice > 0 ? String(maxPrice) : undefined,
    page: safePage > 1 ? String(safePage) : undefined,
  };

  if (allCombos.length === 0) {
    return (
      <main className="site-shell internal-page section-space catalog-page-shell">
        <section className="catalog-empty-state storefront-empty-state storefront-empty-state-minimal">
          <div className="storefront-empty-copy storefront-empty-copy-minimal">
            <span className="catalog-filter-label">Combos en preparación</span>
            <h2>Todavía no hay combos publicados.</h2>
            <p>Cuando guardes y publiques uno desde el panel, aparecerá aquí.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main
      className={`site-shell internal-page section-space catalog-page-shell ${
        totalPages > 1 ? "catalog-page-with-pagination" : "catalog-page-no-pagination"
      }`}
    >
      <section className="catalog-context-strip" aria-label="Contexto del catálogo">
        <div className="catalog-context-top">
          <nav className="catalog-context-breadcrumbs" aria-label="Breadcrumb">
            <Link href="/">Inicio</Link>
            <span>/</span>
            <span>Combos</span>
            {selectedCategoryLabels.length
              ? selectedCategoryLabels.map((label, index) => (
                  <span key={`${label}-${index}`}>
                    <span>/</span>
                    <span>{label}</span>
                  </span>
                ))
              : null}
          </nav>
          <div className="catalog-context-side">
            <p className="catalog-context-summary">
              {totalCombos} combos
            </p>
            <p className="catalog-context-summary">{totalItems} productos agrupados</p>
          </div>
        </div>
        <div className="catalog-context-banner" aria-label="Encabezado de categoría">
          <div className="catalog-context-banner-copy">
            <h1 className="catalog-context-title">{catalogHeaderTitle}</h1>
            <p className="catalog-context-subtitle">{catalogHeaderSubtitle}</p>
          </div>
          <div className="catalog-context-banner-controls">
            <div className="catalog-view-toolbar catalog-view-toolbar-header" aria-label="Tipo de vista de productos">
              <span className="catalog-view-toolbar-label">Ver como</span>
              <div className="catalog-view-toolbar-actions">
                <Link
                  href={buildCombosHref({ ...catalogHrefBase, view: "list" })}
                  className={`catalog-view-toggle catalog-view-toggle-list${view === "list" ? " is-active" : ""}`}
                  aria-label="Ver como lista"
                  title="Lista"
                  aria-current={view === "list" ? "page" : undefined}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <circle cx="4" cy="6" r="1.6" />
                    <circle cx="4" cy="12" r="1.6" />
                    <circle cx="4" cy="18" r="1.6" />
                    <path d="M8 6h12M8 12h12M8 18h12" />
                  </svg>
                </Link>
                <Link
                  href={buildCombosHref({ ...catalogHrefBase, view: "grid" })}
                  className={`catalog-view-toggle catalog-view-toggle-grid${view === "grid" ? " is-active" : ""}`}
                  aria-label="Ver como galeria"
                  title="Galeria"
                  aria-current={view === "grid" ? "page" : undefined}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <rect x="3" y="3" width="7" height="7" rx="0.8" />
                    <rect x="14" y="3" width="7" height="7" rx="0.8" />
                    <rect x="3" y="14" width="7" height="7" rx="0.8" />
                    <rect x="14" y="14" width="7" height="7" rx="0.8" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="catalog-store-layout">
        <aside className="catalog-sidebar catalog-sidebar-desktop">
          <CombosFiltersSidebar
            query={localQ}
            sort={sort}
            minPrice={minPrice}
            maxPrice={maxPrice > 0 ? maxPrice : safeAvailableMaxPrice}
            availableMinPrice={safeAvailableMinPrice}
            availableMaxPrice={safeAvailableMaxPrice}
            selectedCategories={selectedCategories}
            categories={categoryOptions}
          />
        </aside>

        <div className="catalog-mobile-controls">
          <MobileFilterDisclosure>
            <CombosFiltersSidebar
              query={localQ}
              sort={sort}
              minPrice={minPrice}
              maxPrice={maxPrice > 0 ? maxPrice : safeAvailableMaxPrice}
              availableMinPrice={safeAvailableMinPrice}
              availableMaxPrice={safeAvailableMaxPrice}
              selectedCategories={selectedCategories}
              categories={categoryOptions}
            />
          </MobileFilterDisclosure>
          <div className="catalog-view-toolbar catalog-view-toolbar-mobile" aria-label="Tipo de vista de productos">
            <span className="catalog-view-toolbar-label">Ver como</span>
            <div className="catalog-view-toolbar-actions">
              <Link
                href={buildCombosHref({ ...catalogHrefBase, view: "list" })}
                className={`catalog-view-toggle catalog-view-toggle-list${view === "list" ? " is-active" : ""}`}
                aria-label="Ver como lista"
                title="Lista"
                aria-current={view === "list" ? "page" : undefined}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <circle cx="4" cy="6" r="1.6" />
                  <circle cx="4" cy="12" r="1.6" />
                  <circle cx="4" cy="18" r="1.6" />
                  <path d="M8 6h12M8 12h12M8 18h12" />
                </svg>
              </Link>
              <Link
                href={buildCombosHref({ ...catalogHrefBase, view: "grid" })}
                className={`catalog-view-toggle catalog-view-toggle-grid${view === "grid" ? " is-active" : ""}`}
                aria-label="Ver como galeria"
                title="Galeria"
                aria-current={view === "grid" ? "page" : undefined}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <rect x="3" y="3" width="7" height="7" rx="0.8" />
                  <rect x="14" y="3" width="7" height="7" rx="0.8" />
                  <rect x="3" y="14" width="7" height="7" rx="0.8" />
                  <rect x="14" y="14" width="7" height="7" rx="0.8" />
                </svg>
              </Link>
            </div>
          </div>
        </div>

        <div className="catalog-store-content">
          {visibleCombos.length ? (
            <>
              <section className={`catalog-product-grid storefront-grid${view === "list" ? " is-list" : ""}`}>
                {visibleCombos.map((combo) => (
                  <ComboCard key={combo.id} combo={combo} viewMode={view} />
                ))}
              </section>

              {totalPages > 1 ? (
                <section className="catalog-pagination-shell" aria-label="Navegación de páginas">
                  <nav className="catalog-pagination" aria-label="Paginación de combos">
                    <Link
                      href={buildCombosHref({
                        ...catalogHrefBase,
                        page: safePage > 1 ? String(safePage - 1) : undefined,
                        view,
                      })}
                      className={`catalog-pagination-nav${safePage <= 1 ? " is-disabled" : ""}`}
                      aria-disabled={safePage <= 1}
                    >
                      <span aria-hidden="true">‹</span>
                      <span>Anterior</span>
                    </Link>
                    <div className="catalog-pagination-pages">
                      {paginationTokens.map((token, index) => {
                        if (token === "ellipsis") {
                          return (
                            <div key={`page-wrap-gap-${index}`} className="catalog-pagination-page-wrap">
                              <span className="catalog-pagination-gap">…</span>
                            </div>
                          );
                        }
                        const itemPage = token;
                        return (
                          <div key={`page-wrap-${itemPage}`} className="catalog-pagination-page-wrap">
                            <Link
                              href={buildCombosHref({
                                ...catalogHrefBase,
                                page: itemPage > 1 ? String(itemPage) : undefined,
                                view,
                              })}
                              className={itemPage === safePage ? "catalog-pagination-page is-active" : "catalog-pagination-page"}
                              aria-current={itemPage === safePage ? "page" : undefined}
                            >
                              <span>{itemPage}</span>
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                    <Link
                      href={buildCombosHref({
                        ...catalogHrefBase,
                        page: safePage < totalPages ? String(safePage + 1) : String(totalPages),
                        view,
                      })}
                      className={`catalog-pagination-nav${safePage >= totalPages ? " is-disabled" : ""}`}
                      aria-disabled={safePage >= totalPages}
                    >
                      <span>Siguiente</span>
                      <span aria-hidden="true">›</span>
                    </Link>
                  </nav>
                </section>
              ) : null}
            </>
          ) : (
            <section className="catalog-empty-state storefront-empty-state storefront-empty-state-minimal">
              <div className="storefront-empty-copy storefront-empty-copy-minimal">
                <span className="catalog-filter-label">Combos</span>
                <h2>No hay combos en esta sección por ahora.</h2>
                <p>Estamos ajustando el catálogo de combos. Si necesitas ayuda, escríbenos por WhatsApp.</p>
              </div>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}
