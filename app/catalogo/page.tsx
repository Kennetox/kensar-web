import Link from "next/link";
import { redirect } from "next/navigation";
import CatalogProductCard from "@/app/catalogo/CatalogProductCard";
import CatalogFiltersSidebar from "@/app/catalogo/CatalogFiltersSidebar";
import {
  getCatalogCategories,
  getCatalogProducts,
  type WebCatalogCategory,
  type WebCatalogFilterOption,
  type WebCatalogProductList,
} from "@/app/lib/metrikCatalog";

type CatalogPageProps = {
  searchParams?: Promise<{
    q?: string;
    local_q?: string;
    category?: string;
    brand?: string | string[];
    sort?: string;
    min_price?: string;
    max_price?: string;
    page?: string;
  }>;
};

type PaginationToken = number | "ellipsis";

function buildCatalogHref(input: {
  q?: string;
  local_q?: string;
  category?: string;
  brand?: string[];
  sort?: string;
  min_price?: string;
  max_price?: string;
  page?: string;
}) {
  const categoryPath = input.category?.trim();
  const basePath = categoryPath
    ? `/catalogo/categoria/${encodeURIComponent(categoryPath)}`
    : "/catalogo";
  const params = new URLSearchParams();

  if (input.q) params.set("q", input.q);
  if (input.local_q) params.set("local_q", input.local_q);
  (input.brand || []).forEach((value) => {
    if (value) params.append("brand", value);
  });
  if (input.sort && input.sort !== "recommended") params.set("sort", input.sort);
  if (input.min_price && Number(input.min_price) > 0) params.set("min_price", input.min_price);
  if (input.max_price && Number(input.max_price) > 0) params.set("max_price", input.max_price);
  if (input.page) params.set("page", input.page);

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

function buildPaginationTokens(currentPage: number, totalPages: number): PaginationToken[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const clampedCurrent = Math.min(Math.max(currentPage, 1), totalPages);
  const start = Math.max(2, clampedCurrent - 1);
  const end = Math.min(totalPages - 1, clampedCurrent + 1);
  const tokens: PaginationToken[] = [1];

  if (start > 2) {
    tokens.push("ellipsis");
  }

  for (let page = start; page <= end; page += 1) {
    tokens.push(page);
  }

  if (end < totalPages - 1) {
    tokens.push("ellipsis");
  }

  tokens.push(totalPages);
  return tokens;
}

function buildFallbackCategories(): WebCatalogCategory[] {
  return [
    {
      id: "fallback-audio",
      name: "Audio profesional",
      path: "",
      image_url: null,
      tile_color: null,
      home_featured: false,
      home_featured_order: 0,
      product_count: 0,
    },
    {
      id: "fallback-instruments",
      name: "Instrumentos",
      path: "",
      image_url: null,
      tile_color: null,
      home_featured: false,
      home_featured_order: 0,
      product_count: 0,
    },
    {
      id: "fallback-mics",
      name: "Microfonos",
      path: "",
      image_url: null,
      tile_color: null,
      home_featured: false,
      home_featured_order: 0,
      product_count: 0,
    },
    {
      id: "fallback-accessories",
      name: "Accesorios",
      path: "",
      image_url: null,
      tile_color: null,
      home_featured: false,
      home_featured_order: 0,
      product_count: 0,
    },
    {
      id: "fallback-cameras",
      name: "Camaras",
      path: "",
      image_url: null,
      tile_color: null,
      home_featured: false,
      home_featured_order: 0,
      product_count: 0,
    },
  ];
}

async function loadCatalogData(input: {
  q: string;
  category: string;
  brands: string[];
  sort: "recommended" | "name_asc" | "name_desc" | "price_asc" | "price_desc";
  min_price?: number;
  max_price?: number;
  page: number;
  page_size: number;
}): Promise<{
  categories: WebCatalogCategory[];
  productList: WebCatalogProductList | null;
  hasError: boolean;
}> {
  try {
    const [categories, productList] = await Promise.all([
      getCatalogCategories(),
      getCatalogProducts({
        q: input.q || undefined,
        category: input.category || undefined,
        brand: input.brands.length ? input.brands : undefined,
        sort: input.sort,
        min_price: input.min_price,
        max_price: input.max_price,
        page: input.page,
        page_size: input.page_size,
      }),
    ]);

    return { categories, productList, hasError: false };
  } catch {
    return { categories: [], productList: null, hasError: true };
  }
}

export default async function CatalogoPage({ searchParams }: CatalogPageProps) {
  const CATALOG_PAGE_SIZE = 24;
  const params = (await searchParams) ?? {};
  const rawSort = (params.sort || "").trim();
  const globalQ = params.q?.trim() || "";
  const localQ = params.local_q?.trim() || "";
  const effectiveQ = localQ || globalQ;
  const category = params.category?.trim() || "";
  const selectedBrands = Array.isArray(params.brand)
    ? params.brand.map((item) => item.trim()).filter(Boolean)
    : params.brand?.trim()
    ? [params.brand.trim()]
    : [];
  const sort = (["recommended", "name_asc", "name_desc", "price_asc", "price_desc"].includes(
    (params.sort || "").trim()
  )
    ? (params.sort || "recommended").trim()
    : "recommended") as "recommended" | "name_asc" | "name_desc" | "price_asc" | "price_desc";
  const minPrice = Math.max(Number(params.min_price) || 0, 0);
  const maxPrice = Math.max(Number(params.max_price) || 0, 0);
  const page = Math.max(Number(params.page) || 1, 1);
  const currentCatalogPath = buildCatalogHref({
    q: globalQ || undefined,
    local_q: localQ || undefined,
    category: category || undefined,
    brand: selectedBrands,
    sort,
    min_price: minPrice > 0 ? String(minPrice) : undefined,
    max_price: maxPrice > 0 ? String(maxPrice) : undefined,
    page: page > 1 ? String(page) : undefined,
  });
  const isDirectCatalogRoot =
    !category &&
    !effectiveQ &&
    selectedBrands.length === 0 &&
    minPrice === 0 &&
    maxPrice === 0 &&
    !rawSort;

  if (isDirectCatalogRoot) {
    redirect("/");
  }

  const { categories, productList, hasError } = await loadCatalogData({
    q: effectiveQ,
    category,
    brands: selectedBrands,
    sort,
    min_price: minPrice > 0 ? minPrice : undefined,
    max_price: maxPrice > 0 ? maxPrice : undefined,
    page,
    page_size: CATALOG_PAGE_SIZE,
  });

  if (hasError || !productList) {
    return (
      <main className="site-shell internal-page section-space catalog-page-shell">
        <section className="page-hero catalog-page-hero">
          <div>
            <p className="section-label">Catalogo</p>
            <h1 className="page-title">No fue posible cargar el catalogo conectado en este momento.</h1>
            <p className="section-intro">
              Revisa la variable <code>METRIK_API_BASE_URL</code> y la conectividad con el backend. Mientras tanto,
              puedes seguir atendiendo consultas por WhatsApp.
            </p>
          </div>
        </section>
      </main>
    );
  }

  const fallbackCategories = buildFallbackCategories();
  const visibleCategories = categories.length ? categories : fallbackCategories;
  const visibleBrandsMap = new Map<string, WebCatalogFilterOption>();
  productList.filters.brands.forEach((item) => {
    const value = item.value.trim();
    const label = item.label.trim() || value;
    if (!value || !label) return;
    const normalizedValue = value.toLowerCase();
    const existing = visibleBrandsMap.get(normalizedValue);
    if (existing) {
      existing.count = Math.max(existing.count, Number(item.count || 0));
      return;
    }
    visibleBrandsMap.set(normalizedValue, {
      value,
      label,
      count: Number(item.count || 0),
    });
  });
  selectedBrands.forEach((selectedBrand) => {
    const normalizedValue = selectedBrand.trim().toLowerCase();
    if (!normalizedValue || visibleBrandsMap.has(normalizedValue)) return;
    const fallbackBrand = productList.filters.brands.find(
      (item) => item.value.trim().toLowerCase() === normalizedValue
    );
    visibleBrandsMap.set(normalizedValue, {
      value: fallbackBrand?.value || fallbackBrand?.label || selectedBrand,
      label: fallbackBrand?.label || selectedBrand,
      count: 0,
    });
  });
  const visibleBrands = Array.from(visibleBrandsMap.values())
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.label.localeCompare(b.label, "es");
    });
  const categoryFilterMap = new Map(
    productList.filters.categories.map((item) => [item.value, item])
  );
  const selectedFilterCategory = productList.filters.categories.find((item) => item.value === category) || null;
  const selectedParentFilterCategory =
    selectedFilterCategory?.parent_value
      ? categoryFilterMap.get(selectedFilterCategory.parent_value) || null
      : null;
  const totalPages = Math.max(1, Math.ceil((productList.total || 0) / Math.max(1, productList.page_size || 24)));
  const selectedCategoryName =
    visibleCategories.find((item) => item.path === category)?.name ||
    productList.filters.categories.find((item) => item.value === category)?.label ||
    "";
  const derivedMaxPriceFromItems = productList.items.reduce((currentMax, item) => {
    const numericPrice =
      typeof item.price === "number" && Number.isFinite(item.price) ? Math.round(item.price) : 0;
    return Math.max(currentMax, numericPrice);
  }, 0);
  const derivedMinPriceFromItems = productList.items.reduce((currentMin, item) => {
    const numericPrice =
      typeof item.price === "number" && Number.isFinite(item.price) ? Math.round(item.price) : Number.POSITIVE_INFINITY;
    return Math.min(currentMin, numericPrice);
  }, Number.POSITIVE_INFINITY);
  const safeDerivedMinPrice = Number.isFinite(derivedMinPriceFromItems) ? derivedMinPriceFromItems : 0;
  const backendMinPrice = Math.max(Number(productList.filters.price_min || 0), 0);
  const effectiveAvailableMinPrice = Math.max(
    0,
    Math.min(
      backendMinPrice > 0 ? backendMinPrice : safeDerivedMinPrice,
      minPrice > 0 ? minPrice : Number.POSITIVE_INFINITY
    )
  );
  const backendMaxPrice = Math.max(Number(productList.filters.price_max || 0), 0);
  const effectiveAvailableMaxPrice = Math.max(
    backendMaxPrice,
    derivedMaxPriceFromItems,
    maxPrice > 0 ? maxPrice : 0
  );
  const catalogHeaderTitle = category && selectedCategoryName ? selectedCategoryName : "Catalogo";
  const catalogHeaderSubtitle =
    category && selectedParentFilterCategory
      ? `Subcategoria de ${selectedParentFilterCategory.label}`
      : category
      ? "Categoria del catalogo"
      : "Todos los productos disponibles";
  const hasPagination = productList.items.length > 0 && totalPages > 1;
  const paginationTokens = buildPaginationTokens(page, totalPages);

  return (
    <main
      className={`site-shell internal-page section-space catalog-page-shell ${
        hasPagination ? "catalog-page-with-pagination" : "catalog-page-no-pagination"
      }`}
    >
      <section className="catalog-context-strip" aria-label="Contexto del catálogo">
        <div className="catalog-context-top">
          <nav className="catalog-context-breadcrumbs" aria-label="Breadcrumb">
            <Link href="/">Inicio</Link>
            <span>/</span>
            <span>Catalogo</span>
            {category && selectedCategoryName ? (
              <>
                <span>/</span>
                <span>{selectedCategoryName}</span>
              </>
            ) : null}
          </nav>
          <p className="catalog-context-summary">
            {productList.total} productos
          </p>
        </div>
        <div className="catalog-context-banner" aria-label="Encabezado de categoría">
          <div className="catalog-context-banner-copy">
            <h1 className="catalog-context-title">{catalogHeaderTitle}</h1>
            <p className="catalog-context-subtitle">{catalogHeaderSubtitle}</p>
          </div>
        </div>
      </section>

      <section className="catalog-store-layout">
        <aside className="catalog-sidebar">
          <CatalogFiltersSidebar
            query={localQ}
            sort={sort}
            minPrice={minPrice}
            maxPrice={maxPrice > 0 ? maxPrice : effectiveAvailableMaxPrice}
            availableMinPrice={effectiveAvailableMinPrice}
            availableMaxPrice={effectiveAvailableMaxPrice}
            selectedBrands={selectedBrands}
            brands={visibleBrands}
          />
        </aside>

        <div className="catalog-store-content">
          {productList.items.length ? (
            <>
              <section className="catalog-product-grid storefront-grid">
                {productList.items.map((product) => (
                  <CatalogProductCard
                    key={product.id}
                    product={product}
                    catalogReturnTo={currentCatalogPath}
                  />
                ))}
              </section>
              {hasPagination ? (
                <section className="catalog-pagination-shell" aria-label="Navegación de páginas">
                  <nav className="catalog-pagination" aria-label="Paginación de catálogo">
                    <Link
                      href={buildCatalogHref({
                        q: globalQ || undefined,
                        local_q: localQ || undefined,
                        category: category || undefined,
                        brand: selectedBrands,
                        sort,
                        min_price: minPrice > 0 ? String(minPrice) : undefined,
                        max_price: maxPrice > 0 ? String(maxPrice) : undefined,
                        page: page > 1 ? String(page - 1) : undefined,
                      })}
                      className={`catalog-pagination-nav${page <= 1 ? " is-disabled" : ""}`}
                      aria-disabled={page <= 1}
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
                              href={buildCatalogHref({
                                q: globalQ || undefined,
                                local_q: localQ || undefined,
                                category: category || undefined,
                                brand: selectedBrands,
                                sort,
                                min_price: minPrice > 0 ? String(minPrice) : undefined,
                                max_price: maxPrice > 0 ? String(maxPrice) : undefined,
                                page: itemPage > 1 ? String(itemPage) : undefined,
                              })}
                              className={itemPage === page ? "catalog-pagination-page is-active" : "catalog-pagination-page"}
                              aria-current={itemPage === page ? "page" : undefined}
                            >
                              <span>{itemPage}</span>
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                    <Link
                      href={buildCatalogHref({
                        q: globalQ || undefined,
                        local_q: localQ || undefined,
                        category: category || undefined,
                        brand: selectedBrands,
                        sort,
                        min_price: minPrice > 0 ? String(minPrice) : undefined,
                        max_price: maxPrice > 0 ? String(maxPrice) : undefined,
                        page: page < totalPages ? String(page + 1) : String(totalPages),
                      })}
                      className={`catalog-pagination-nav${page >= totalPages ? " is-disabled" : ""}`}
                      aria-disabled={page >= totalPages}
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
                <span className="catalog-filter-label">Tienda en actualizacion</span>
                <h2>No hay productos en esta sección por ahora.</h2>
                <p>Estamos actualizando el catálogo. Si necesitas ayuda, escríbenos por WhatsApp.</p>
              </div>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}
