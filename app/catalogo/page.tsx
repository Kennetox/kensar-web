import Link from "next/link";
import CatalogProductCard from "@/app/catalogo/CatalogProductCard";
import CatalogFiltersSidebar from "@/app/catalogo/CatalogFiltersSidebar";
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
    brand?: string | string[];
    sort?: string;
    min_price?: string;
    max_price?: string;
    page?: string;
  }>;
};

function buildCatalogHref(input: {
  q?: string;
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

  const { categories, productList, hasError } = await loadCatalogData({
    q,
    category,
    brands: selectedBrands,
    sort,
    min_price: minPrice > 0 ? minPrice : undefined,
    max_price: maxPrice > 0 ? maxPrice : undefined,
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
  const catalogHeaderTitle = category && selectedCategoryName ? selectedCategoryName : "Catalogo";
  const catalogHeaderSubtitle =
    category && selectedParentFilterCategory
      ? `Subcategoria de ${selectedParentFilterCategory.label}`
      : category
      ? "Categoria del catalogo"
      : "Todos los productos disponibles";

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
            sort={sort}
            minPrice={minPrice}
            maxPrice={maxPrice > 0 ? maxPrice : Number(productList.filters.price_max || 0)}
            availableMaxPrice={Number(productList.filters.price_max || 0)}
            selectedBrands={selectedBrands}
            brands={visibleBrands}
          />
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
                      brand: selectedBrands,
                      sort,
                      min_price: minPrice > 0 ? String(minPrice) : undefined,
                      max_price: maxPrice > 0 ? String(maxPrice) : undefined,
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
                              brand: selectedBrands,
                              sort,
                              min_price: minPrice > 0 ? String(minPrice) : undefined,
                              max_price: maxPrice > 0 ? String(maxPrice) : undefined,
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
                      brand: selectedBrands,
                      sort,
                      min_price: minPrice > 0 ? String(minPrice) : undefined,
                      max_price: maxPrice > 0 ? String(maxPrice) : undefined,
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
