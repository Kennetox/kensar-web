import Link from "next/link";
import CatalogProductCard from "@/app/catalogo/CatalogProductCard";
import {
  getCatalogCategories,
  getCatalogProducts,
  type WebCatalogCategory,
  type WebCatalogProductList,
} from "@/app/lib/metrikCatalog";

type CatalogPageProps = {
  searchParams?: Promise<{
    q?: string;
    category?: string;
    brand?: string;
    page?: string;
  }>;
};

function buildCatalogHref(input: {
  q?: string;
  category?: string;
  brand?: string;
  page?: string;
}) {
  const params = new URLSearchParams();

  if (input.q) params.set("q", input.q);
  if (input.category) params.set("category", input.category);
  if (input.brand) params.set("brand", input.brand);
  if (input.page) params.set("page", input.page);

  const query = params.toString();
  return query ? `/catalogo?${query}` : "/catalogo";
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
  brand: string;
  page: number;
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
        brand: input.brand || undefined,
        page: input.page,
      }),
    ]);

    return { categories, productList, hasError: false };
  } catch {
    return { categories: [], productList: null, hasError: true };
  }
}

export default async function CatalogoPage({ searchParams }: CatalogPageProps) {
  const params = (await searchParams) ?? {};
  const q = params.q?.trim() || "";
  const category = params.category?.trim() || "";
  const brand = params.brand?.trim() || "";
  const page = Math.max(Number(params.page) || 1, 1);

  const { categories, productList, hasError } = await loadCatalogData({
    q,
    category,
    brand,
    page,
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
  const visibleBrands = productList.filters.brands.slice(0, 10);
  const selectedFilterCategory = productList.filters.categories.find((item) => item.value === category) || null;
  const categoryContextRoot = selectedFilterCategory?.parent_value || category || "";
  const visibleSubcategories = categoryContextRoot
    ? productList.filters.categories
        .filter((item) => item.parent_value === categoryContextRoot)
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "es"))
    : [];
  const totalPages = Math.max(1, Math.ceil((productList.total || 0) / Math.max(1, productList.page_size || 24)));
  const selectedCategoryName =
    visibleCategories.find((item) => item.path === category)?.name ||
    productList.filters.categories.find((item) => item.value === category)?.label ||
    "";
  const quickCategories = productList.filters.categories
    .filter((item) => item.value && item.value !== category)
    .slice(0, 5);
  const hasActiveFilters = Boolean(q || category || brand);

  return (
    <main className="site-shell internal-page section-space catalog-page-shell">
      <section className="catalog-context-strip" aria-label="Contexto del catálogo">
        <div className="catalog-context-top">
          <nav className="catalog-context-breadcrumbs" aria-label="Breadcrumb">
            <Link href="/">Inicio</Link>
            <span>/</span>
            <Link href="/catalogo">Catalogo</Link>
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

        {quickCategories.length > 0 ? (
          <div className="catalog-context-chips" aria-label="Accesos rápidos por categoría">
            {quickCategories.map((item) => (
              <Link
                key={item.value}
                href={buildCatalogHref({
                  q: q || undefined,
                  category: item.value,
                  brand: brand || undefined,
                })}
                className="catalog-context-chip"
              >
                <span>{item.label}</span>
                <small>{item.count}</small>
              </Link>
            ))}
          </div>
        ) : null}

        {hasActiveFilters ? (
          <div className="catalog-active-filters" aria-label="Filtros activos">
            {q ? (
              <Link
                href={buildCatalogHref({
                  category: category || undefined,
                  brand: brand || undefined,
                })}
                className="catalog-active-filter"
              >
                <span>Busqueda: {q}</span>
                <small>×</small>
              </Link>
            ) : null}
            {category && selectedCategoryName ? (
              <Link
                href={buildCatalogHref({
                  q: q || undefined,
                  brand: brand || undefined,
                })}
                className="catalog-active-filter"
              >
                <span>Categoria: {selectedCategoryName}</span>
                <small>×</small>
              </Link>
            ) : null}
            {brand ? (
              <Link
                href={buildCatalogHref({
                  q: q || undefined,
                  category: category || undefined,
                })}
                className="catalog-active-filter"
              >
                <span>Marca: {brand}</span>
                <small>×</small>
              </Link>
            ) : null}
            <Link href="/catalogo" className="catalog-active-filters-clear">
              Limpiar todo
            </Link>
          </div>
        ) : null}
      </section>

      <section className="catalog-store-layout">
        <aside className="catalog-sidebar">
          <div className="catalog-filter-panel">
            <div className="catalog-filter-block">
              <p className="catalog-filter-label">Categorias</p>
              <form action="/catalogo" className="catalog-sidebar-search">
                {category ? <input type="hidden" name="category" value={category} /> : null}
                {brand ? <input type="hidden" name="brand" value={brand} /> : null}
                <input
                  type="search"
                  name="q"
                  defaultValue={q}
                  placeholder="Buscar producto"
                  aria-label="Buscar producto en el catalogo"
                  className="catalog-sidebar-search-input"
                />
              </form>
              <div className="catalog-filter-stack">
                <Link
                  href={buildCatalogHref({ q: q || undefined, brand: brand || undefined })}
                  className={!category ? "catalog-filter-link is-active" : "catalog-filter-link"}
                >
                  <span>Todas las categorias</span>
                  <small>{productList.total || categories.reduce((sum, item) => sum + item.product_count, 0)}</small>
                </Link>
                {visibleCategories.map((item) => (
                  <Link
                    key={item.path || item.name}
                    href={
                      item.path
                        ? buildCatalogHref({
                            q: q || undefined,
                            category: item.path,
                            brand: brand || undefined,
                          })
                        : "/catalogo"
                    }
                    className={
                      item.path && item.path === category
                        ? "catalog-filter-link is-active"
                        : "catalog-filter-link"
                    }
                  >
                    <span>{item.name}</span>
                    <small>{item.product_count}</small>
                  </Link>
                ))}
              </div>
            </div>

            {visibleSubcategories.length > 0 ? (
              <div className="catalog-filter-block">
                <p className="catalog-filter-label">Subcategorías</p>
                <div className="catalog-filter-stack">
                  {visibleSubcategories.map((item) => (
                    <Link
                      key={item.value}
                      href={buildCatalogHref({
                        q: q || undefined,
                        category: item.value,
                        brand: brand || undefined,
                      })}
                      className={item.value === category ? "catalog-filter-link is-active" : "catalog-filter-link"}
                    >
                      <span>{item.label}</span>
                      <small>{item.count}</small>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            {visibleBrands.length > 0 ? (
              <div className="catalog-filter-block">
                <p className="catalog-filter-label">Marcas</p>
                <div className="catalog-filter-stack">
                  <Link
                    href={buildCatalogHref({ q: q || undefined, category: category || undefined })}
                    className={!brand ? "catalog-filter-link is-active" : "catalog-filter-link"}
                  >
                    <span>Todas las marcas</span>
                  </Link>
                  {visibleBrands.map((item) => (
                    <Link
                      key={item.value}
                      href={buildCatalogHref({
                        q: q || undefined,
                        category: category || undefined,
                        brand: item.value,
                      })}
                      className={item.value === brand ? "catalog-filter-link is-active" : "catalog-filter-link"}
                    >
                      <span>{item.label}</span>
                      <small>{item.count}</small>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

          </div>
        </aside>

        <div className="catalog-store-content">
          {productList.items.length ? (
            <>
              <section className="catalog-product-grid storefront-grid">
                {productList.items.map((product) => (
                  <CatalogProductCard key={product.id} product={product} />
                ))}
              </section>
              {totalPages > 1 ? (
                <nav
                  className="mt-6 flex flex-wrap items-center justify-center gap-2"
                  aria-label="Paginación de catálogo"
                >
                  <Link
                    href={buildCatalogHref({
                      q: q || undefined,
                      category: category || undefined,
                      brand: brand || undefined,
                      page: page > 1 ? String(page - 1) : undefined,
                    })}
                    className={`catalog-filter-link${page <= 1 ? " pointer-events-none opacity-50" : ""}`}
                    aria-disabled={page <= 1}
                  >
                    <span>Anterior</span>
                  </Link>
                  {Array.from({ length: totalPages }, (_, index) => index + 1)
                    .filter((itemPage) => {
                      if (totalPages <= 7) return true;
                      if (itemPage === 1 || itemPage === totalPages) return true;
                      return Math.abs(itemPage - page) <= 1;
                    })
                    .map((itemPage, index, list) => {
                      const previous = list[index - 1];
                      const shouldAddGap = previous && itemPage - previous > 1;
                      return (
                        <div key={`page-wrap-${itemPage}`} className="flex items-center gap-2">
                          {shouldAddGap ? <span className="px-1 text-sm text-slate-400">…</span> : null}
                          <Link
                            href={buildCatalogHref({
                              q: q || undefined,
                              category: category || undefined,
                              brand: brand || undefined,
                              page: itemPage > 1 ? String(itemPage) : undefined,
                            })}
                            className={itemPage === page ? "catalog-filter-link is-active" : "catalog-filter-link"}
                            aria-current={itemPage === page ? "page" : undefined}
                          >
                            <span>{itemPage}</span>
                          </Link>
                        </div>
                      );
                    })}
                  <Link
                    href={buildCatalogHref({
                      q: q || undefined,
                      category: category || undefined,
                      brand: brand || undefined,
                      page: page < totalPages ? String(page + 1) : String(totalPages),
                    })}
                    className={`catalog-filter-link${page >= totalPages ? " pointer-events-none opacity-50" : ""}`}
                    aria-disabled={page >= totalPages}
                  >
                    <span>Siguiente</span>
                  </Link>
                </nav>
              ) : null}
            </>
          ) : (
            <section className="catalog-empty-state storefront-empty-state">
              <div className="storefront-empty-copy">
                <span className="catalog-filter-label">Tienda en actualizacion</span>
                <h2>Estamos preparando esta vitrina con productos destacados de Kensar.</h2>
                <p>
                  Muy pronto veras aqui referencias listas para comprar o cotizar. Si necesitas algo hoy, escribenos y
                  te ayudamos a conseguirlo.
                </p>
              </div>
              <div className="storefront-empty-categories">
                {visibleCategories.slice(0, 6).map((item) => (
                  <Link
                    key={item.path || item.name}
                    href={item.path ? buildCatalogHref({ category: item.path }) : "/catalogo"}
                    className="storefront-category-tile"
                  >
                    <strong>{item.name}</strong>
                    <span>{item.product_count ? `${item.product_count} refs.` : "Proximamente"}</span>
                  </Link>
                ))}
              </div>
              <div className="catalog-empty-actions">
                <Link
                  href="https://wa.me/573185657508?text=Hola%2C%20quiero%20consultar%20un%20producto%20que%20todavia%20no%20veo%20en%20la%20tienda."
                  target="_blank"
                  rel="noreferrer"
                  className="catalog-primary-action"
                >
                  Consultar producto
                </Link>
                <Link href="/empresa" className="catalog-secondary-action">
                  Conocer la tienda
                </Link>
              </div>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}
