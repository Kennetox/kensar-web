import Link from "next/link";
import AddToCartButton from "@/app/components/AddToCartButton";
import {
  formatCatalogPrice,
  getCatalogCategories,
  getCatalogProducts,
  getStockLabel,
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

function buildWhatsAppHref(productName: string) {
  const message = encodeURIComponent(`Hola, quiero consultar este producto de Kensar: ${productName}`);
  return `https://wa.me/573185657508?text=${message}`;
}

export default async function CatalogoPage({ searchParams }: CatalogPageProps) {
  const params = (await searchParams) ?? {};
  const q = params.q?.trim() || "";
  const category = params.category?.trim() || "";
  const brand = params.brand?.trim() || "";
  const page = Math.max(Number(params.page) || 1, 1);
  const fallbackCategories = [
    { name: "Audio profesional", path: "" },
    { name: "Microfonos", path: "" },
    { name: "Seguridad", path: "" },
    { name: "Accesorios", path: "" },
  ];

  try {
    const [categories, productList] = await Promise.all([
      getCatalogCategories(),
      getCatalogProducts({
        q: q || undefined,
        category: category || undefined,
        brand: brand || undefined,
        page,
      }),
    ]);
    const visibleCategories = categories.length ? categories.slice(0, 10) : fallbackCategories;
    const visibleBrands = productList.filters.brands.slice(0, 10);
    const activeFilterCount = [q, category, brand].filter(Boolean).length;

    return (
      <main className="site-shell internal-page section-space catalog-page-shell">
        <section className="page-hero catalog-page-hero">
          <div className="catalog-hero-copy">
            <p className="section-label">Tienda Kensar</p>
            <h1 className="page-title">Equipos, accesorios y soluciones listas para cotizar o comprar desde la web.</h1>
            <p className="section-intro">
              Explora la seleccion de referencias publicadas por Kensar. Filtra por categoria o marca, revisa el
              detalle del producto y si necesitas una referencia adicional te la conseguimos por WhatsApp.
            </p>
            <div className="catalog-hero-pills">
              <span>Audio</span>
              <span>Seguridad</span>
              <span>Instrumentos</span>
              <span>Accesorios</span>
            </div>
          </div>
          <div className="catalog-hero-highlight">
            <span className="catalog-hero-highlight-label">Compra guiada</span>
            <strong>{productList.total ? `${productList.total} referencias visibles` : "Catalogo en crecimiento"}</strong>
            <p>
              {productList.total
                ? "Selecciona una referencia, revisa el detalle y agregala al carrito o cotizala por WhatsApp."
                : "Estamos cargando referencias destacadas. Mientras tanto puedes escribirnos y te ayudamos a ubicar cualquier producto."}
            </p>
            <Link
              href="https://wa.me/573185657508?text=Hola%2C%20quiero%20asesoria%20para%20encontrar%20un%20producto%20en%20la%20tienda%20web."
              target="_blank"
              rel="noreferrer"
              className="catalog-primary-action"
            >
              Pedir asesoria
            </Link>
          </div>
        </section>

        <section className="catalog-toolbar">
          <div className="catalog-toolbar-results">
            <strong>{productList.total ? `${productList.total} resultados` : "Sin productos publicados aun"}</strong>
            <span>
              {activeFilterCount
                ? `${activeFilterCount} filtro${activeFilterCount > 1 ? "s" : ""} activo${activeFilterCount > 1 ? "s" : ""}`
                : "Explora por categoria, marca o busqueda"}
            </span>
          </div>
          <div className="catalog-toolbar-actions">
            {q ? <span className="catalog-chip catalog-chip-active">“{q}”</span> : null}
            {category ? (
              <span className="catalog-chip catalog-chip-active">
                {categories.find((item) => item.path === category)?.name ?? category}
              </span>
            ) : null}
            {brand ? <span className="catalog-chip catalog-chip-active">{brand}</span> : null}
            {(q || category || brand) ? (
              <Link href="/catalogo" className="catalog-reset-link">
                Limpiar
              </Link>
            ) : null}
          </div>
        </section>

        <section className="catalog-store-layout">
          <aside className="catalog-sidebar">
            <div className="catalog-filter-panel">
              <div className="catalog-filter-block">
                <p className="catalog-filter-label">Categorias</p>
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
                      href={item.path ? buildCatalogHref({
                        q: q || undefined,
                        category: item.path,
                        brand: brand || undefined,
                      }) : "/catalogo"}
                      className={item.path && item.path === category ? "catalog-filter-link is-active" : "catalog-filter-link"}
                    >
                      <span>{item.name}</span>
                      {"product_count" in item ? <small>{item.product_count}</small> : null}
                    </Link>
                  ))}
                </div>
              </div>

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

              <div className="catalog-support-card">
                <p className="catalog-filter-label">Ayuda de compra</p>
                <h2>No encuentras la referencia?</h2>
                <p>
                  Te ayudamos a ubicar equipos, repuestos y accesorios aunque todavia no esten publicados en la web.
                </p>
                <Link
                  href="https://wa.me/573185657508?text=Hola%2C%20quiero%20ayuda%20para%20encontrar%20un%20producto%20en%20la%20tienda%20web."
                  target="_blank"
                  rel="noreferrer"
                  className="catalog-primary-action"
                >
                  Escribir por WhatsApp
                </Link>
              </div>
            </div>
          </aside>

          <div className="catalog-store-content">
            {productList.items.length ? (
              <section className="catalog-product-grid storefront-grid">
                {productList.items.map((product) => (
                  <article key={product.id} className="catalog-product-card-live storefront-card">
                    <Link href={`/catalogo/${product.slug}`} className="catalog-product-card-media storefront-card-media">
                      <div
                        className="storefront-media-image"
                        style={{
                          backgroundImage: product.image_url
                            ? `url('${product.image_url}')`
                            : "linear-gradient(135deg, #eef2f7 0%, #dce5f2 100%)",
                        }}
                      />
                      <span className={`catalog-stock-badge stock-${product.stock_status}`}>{getStockLabel(product.stock_status)}</span>
                      {product.featured ? <span className="catalog-featured-badge">Destacado</span> : null}
                    </Link>

                    <div className="catalog-product-card-body storefront-card-body">
                      <div className="catalog-product-meta storefront-meta">
                        <span>{product.brand || "Kensar"}</span>
                        <span>{product.category_name || "Catalogo"}</span>
                      </div>

                      <h3>
                        <Link href={`/catalogo/${product.slug}`} className="catalog-product-detail-link">
                          {product.name}
                        </Link>
                      </h3>

                      <p className="catalog-product-description">
                        {product.short_description || "Consulta disponibilidad, precio y configuracion con el equipo de Kensar."}
                      </p>

                      <div className="catalog-product-price-row storefront-price-row">
                        <strong>{formatCatalogPrice(product.price)}</strong>
                        {product.sku ? <span>SKU {product.sku}</span> : <span>Consulta directa</span>}
                      </div>

                      <div className="catalog-product-actions storefront-actions">
                        <AddToCartButton productId={product.id} />
                        <Link href={`/catalogo/${product.slug}`} className="catalog-secondary-action">
                          Ver detalle
                        </Link>
                        <Link
                          href={buildWhatsAppHref(product.name)}
                          target="_blank"
                          rel="noreferrer"
                          className="catalog-whatsapp-link"
                        >
                          Cotizar
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </section>
            ) : (
              <section className="catalog-empty-state storefront-empty-state">
                <div className="storefront-empty-copy">
                  <span className="catalog-filter-label">Tienda en actualizacion</span>
                  <h2>Estamos preparando esta vitrina con productos destacados de Kensar.</h2>
                  <p>
                    Muy pronto veras aqui referencias listas para comprar o cotizar. Si necesitas algo hoy, escribenos
                    y te ayudamos a conseguirlo.
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
                      {"product_count" in item ? <span>{item.product_count} refs.</span> : <span>Proximamente</span>}
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
  } catch {
    return (
      <main className="site-shell internal-page section-space catalog-page-shell">
        <section className="page-hero catalog-page-hero">
          <div>
            <p className="section-label">Catalogo</p>
            <h1 className="page-title">No fue posible cargar el catalogo conectado en este momento.</h1>
            <p className="section-intro">
              Revisa la variable `METRIK_API_BASE_URL` y la conectividad con el backend. Mientras tanto, puedes seguir
              atendiendo consultas por WhatsApp.
            </p>
          </div>
        </section>
      </main>
    );
  }
}
