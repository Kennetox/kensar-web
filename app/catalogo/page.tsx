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

    return (
      <main className="site-shell internal-page section-space catalog-page-shell">
        <section className="page-hero catalog-page-hero">
          <div>
            <p className="section-label">Catalogo</p>
            <h1 className="page-title">
              Vitrina conectada a Metrik con productos publicados, stock comercial y consulta directa.
            </h1>
            <p className="section-intro">
              Kensar no publica todo su inventario. Aqui ves la seleccion activa en web, conectada con la operacion
              real de tienda y lista para filtrar por categoria, marca o busqueda.
            </p>
          </div>
          <div className="catalog-hero-stats">
            <article>
              <strong>{productList.total}</strong>
              <span>productos publicados</span>
            </article>
            <article>
              <strong>{categories.length}</strong>
              <span>categorias activas</span>
            </article>
            <article>
              <strong>{productList.filters.brands.length}</strong>
              <span>marcas visibles</span>
            </article>
          </div>
        </section>

        <section className="catalog-filter-panel">
          <div className="catalog-filter-block">
            <p className="catalog-filter-label">Busqueda actual</p>
            <div className="catalog-filter-row">
              {q ? <span className="catalog-chip catalog-chip-active">“{q}”</span> : <span className="catalog-chip">Sin termino</span>}
              {category ? (
                <span className="catalog-chip catalog-chip-active">
                  Categoria: {categories.find((item) => item.path === category)?.name ?? category}
                </span>
              ) : null}
              {brand ? <span className="catalog-chip catalog-chip-active">Marca: {brand}</span> : null}
              {(q || category || brand) ? (
                <Link href="/catalogo" className="catalog-reset-link">
                  Limpiar filtros
                </Link>
              ) : null}
            </div>
          </div>

          <div className="catalog-filter-block">
            <p className="catalog-filter-label">Categorias</p>
            <div className="catalog-filter-row">
              <Link
                href={buildCatalogHref({ q: q || undefined, brand: brand || undefined })}
                className={!category ? "catalog-chip catalog-chip-active" : "catalog-chip"}
              >
                Todas
              </Link>
              {categories.map((item) => (
                <Link
                  key={item.path}
                  href={buildCatalogHref({
                    q: q || undefined,
                    category: item.path,
                    brand: brand || undefined,
                  })}
                  className={item.path === category ? "catalog-chip catalog-chip-active" : "catalog-chip"}
                >
                  {item.name}
                  <small>{item.product_count}</small>
                </Link>
              ))}
            </div>
          </div>

          {productList.filters.brands.length > 0 ? (
            <div className="catalog-filter-block">
              <p className="catalog-filter-label">Marcas</p>
              <div className="catalog-filter-row">
                <Link
                  href={buildCatalogHref({ q: q || undefined, category: category || undefined })}
                  className={!brand ? "catalog-chip catalog-chip-active" : "catalog-chip"}
                >
                  Todas
                </Link>
                {productList.filters.brands.slice(0, 14).map((item) => (
                  <Link
                    key={item.value}
                    href={buildCatalogHref({
                      q: q || undefined,
                      category: category || undefined,
                      brand: item.value,
                    })}
                    className={item.value === brand ? "catalog-chip catalog-chip-active" : "catalog-chip"}
                  >
                    {item.label}
                    <small>{item.count}</small>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <section className="catalog-results-head">
          <div>
            <p className="catalog-results-kicker">Resultados</p>
            <h2>{productList.total ? `${productList.total} referencias publicadas` : "No hay productos para mostrar"}</h2>
          </div>
          <p className="catalog-results-copy">
            Si no ves una referencia especifica, te la cotizamos por WhatsApp con disponibilidad en tienda o por pedido.
          </p>
        </section>

        {productList.items.length ? (
          <section className="catalog-product-grid">
            {productList.items.map((product) => (
              <article key={product.id} className="catalog-product-card-live">
                <div
                  className="catalog-product-card-media"
                  style={{
                    backgroundImage: product.image_url
                      ? `linear-gradient(180deg, rgba(15,23,42,0.08), rgba(15,23,42,0.18)), url('${product.image_url}')`
                      : "linear-gradient(135deg, #e8eef8 0%, #d9e2f1 100%)",
                  }}
                >
                  <span className={`catalog-stock-badge stock-${product.stock_status}`}>{getStockLabel(product.stock_status)}</span>
                  {product.featured ? <span className="catalog-featured-badge">Destacado</span> : null}
                </div>

                <div className="catalog-product-card-body">
                  <div className="catalog-product-meta">
                    <span>{product.brand || "Kensar"}</span>
                    <span>{product.category_name || "Catalogo"}</span>
                  </div>

                  <h3>
                    <Link href={`/catalogo/${product.slug}`} className="catalog-product-detail-link">
                      {product.name}
                    </Link>
                  </h3>
                  <p className="catalog-product-description">
                    {product.short_description || "Consulta disponibilidad, precio y configuracion comercial con el equipo de Kensar."}
                  </p>

                  <div className="catalog-product-price-row">
                    <strong>{formatCatalogPrice(product.price)}</strong>
                    {product.sku ? <span>SKU {product.sku}</span> : <span>Consulta directa</span>}
                  </div>

                  <div className="catalog-product-actions">
                    <Link href={`/catalogo/${product.slug}`} className="catalog-secondary-action">
                      Ver detalle
                    </Link>
                    <Link
                      href={buildWhatsAppHref(product.name)}
                      target="_blank"
                      rel="noreferrer"
                      className="catalog-primary-action"
                    >
                      Consultar por WhatsApp
                    </Link>
                    <AddToCartButton productId={product.id} />
                    {product.category_path ? (
                      <Link
                        href={buildCatalogHref({
                          q: q || undefined,
                          category: product.category_path,
                          brand: brand || undefined,
                        })}
                        className="catalog-secondary-action"
                      >
                        Ver categoria
                      </Link>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="catalog-empty-state">
            <h2>No encontramos referencias con esos filtros.</h2>
            <p>
              Ajusta la busqueda o escribenos por WhatsApp. Kensar maneja miles de referencias y no todas estan
              publicadas en la web.
            </p>
            <div className="catalog-empty-actions">
              <Link href="/catalogo" className="catalog-secondary-action">
                Ver todo el catalogo publicado
              </Link>
              <Link
                href="https://wa.me/573185657508?text=Hola%2C%20quiero%20consultar%20un%20producto%20que%20no%20encuentro%20en%20el%20catalogo."
                target="_blank"
                rel="noreferrer"
                className="catalog-primary-action"
              >
                Consultar producto
              </Link>
            </div>
          </section>
        )}
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
