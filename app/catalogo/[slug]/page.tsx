import Link from "next/link";
import { notFound } from "next/navigation";
import AddToCartButton from "@/app/components/AddToCartButton";
import {
  formatCatalogPrice,
  getCatalogProduct,
  getStockLabel,
} from "@/app/lib/metrikCatalog";

type CatalogProductDetailPageProps = {
  params: Promise<{ slug: string }>;
};

function buildWhatsAppHref(productName: string, customMessage?: string | null) {
  const message = encodeURIComponent(
    customMessage?.trim() || `Hola, quiero consultar este producto de Kensar: ${productName}`
  );
  return `https://wa.me/573185657508?text=${message}`;
}

export default async function CatalogProductDetailPage({
  params,
}: CatalogProductDetailPageProps) {
  const { slug } = await params;
  const product = await getCatalogProduct(slug);

  if (!product) {
    notFound();
  }

  const heroImage = product.image_url || product.image_thumb_url || product.gallery[0] || null;
  const specEntries = Object.entries(product.specs || {});

  return (
    <main className="site-shell internal-page section-space product-page-shell">
      <section className="catalog-breadcrumbs">
        <Link href="/catalogo">Catálogo</Link>
        {product.category_path ? (
          <Link href={`/catalogo?category=${encodeURIComponent(product.category_path)}`}>
            {product.category_name || "Categoría"}
          </Link>
        ) : null}
        <span>{product.name}</span>
      </section>

      <section className="product-detail-grid">
        <article className="product-visual-card">
          <div
            className="product-main-visual"
            style={{
              backgroundImage: heroImage
                ? `linear-gradient(180deg, rgba(15,23,42,0.04), rgba(15,23,42,0.16)), url('${heroImage}')`
                : "linear-gradient(135deg, #e8eef8 0%, #d9e2f1 100%)",
            }}
          >
            <span className={`catalog-stock-badge stock-${product.stock_status}`}>
              {getStockLabel(product.stock_status)}
            </span>
            {product.badge_text ? <span className="catalog-featured-badge">{product.badge_text}</span> : null}
          </div>
          {product.gallery.length > 1 ? (
            <div className="product-gallery-strip">
              {product.gallery.map((image, index) => (
                <div
                  key={`${image}-${index}`}
                  className="product-gallery-thumb"
                  style={{ backgroundImage: `url('${image}')` }}
                  aria-hidden="true"
                />
              ))}
            </div>
          ) : null}
        </article>

        <article className="product-info-card">
          <div className="product-info-head">
            <p className="product-info-meta">
              <span>{product.brand || "Kensar"}</span>
              <span>{product.category_name || "Catálogo"}</span>
              {product.sku ? <span>SKU {product.sku}</span> : null}
            </p>
            <h1>{product.name}</h1>
            <p className="product-info-copy">
              {product.short_description ||
                "Consulta disponibilidad, precio y configuración comercial con el equipo de Kensar."}
            </p>
          </div>

          <div className="product-price-block">
            <strong>{formatCatalogPrice(product.price)}</strong>
            {product.compare_price ? <del>{formatCatalogPrice(product.compare_price)}</del> : null}
          </div>

          <div className="product-cta-row">
            <Link
              href={buildWhatsAppHref(product.name, product.whatsapp_message)}
              target="_blank"
              rel="noreferrer"
              className="catalog-primary-action"
            >
              Consultar por WhatsApp
            </Link>
            <AddToCartButton productId={product.id} />
          </div>

          <div className="product-context-block">
            <h2>Contexto comercial</h2>
            <div className="product-context-grid">
              <div>
                <span>Disponibilidad</span>
                <strong>{getStockLabel(product.stock_status)}</strong>
              </div>
              <div>
                <span>Precio</span>
                <strong>{product.price_mode === "visible" ? "Visible" : "Consultar"}</strong>
              </div>
              <div>
                <span>Marca</span>
                <strong>{product.brand || "Kensar"}</strong>
              </div>
              <div>
                <span>Categoría</span>
                <strong>{product.category_name || "Catálogo"}</strong>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="product-detail-sections">
        <article className="product-detail-panel">
          <h2>Descripción</h2>
          <p>
            {product.long_description ||
              product.short_description ||
              "Esta referencia está conectada al catálogo operativo de Kensar. Si necesitas una validación técnica o comercial adicional, te ayudamos por WhatsApp."}
          </p>
        </article>

        <article className="product-detail-panel">
          <h2>Especificaciones</h2>
          {specEntries.length ? (
            <div className="product-spec-grid">
              {specEntries.map(([key, value]) => (
                <div key={key} className="product-spec-row">
                  <span>{key}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p>No hay especificaciones publicadas todavía para esta referencia.</p>
          )}
        </article>
      </section>
    </main>
  );
}
