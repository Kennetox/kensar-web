import Link from "next/link";
import { notFound } from "next/navigation";
import CatalogProductCard from "@/app/catalogo/CatalogProductCard";
import ProductDetailGallery from "@/app/catalogo/ProductDetailGallery";
import ProductPurchaseCta from "@/app/catalogo/ProductPurchaseCta";
import ProductKoraAssistLink from "@/app/catalogo/ProductKoraAssistLink";
import ProductViewTracker from "@/app/catalogo/ProductViewTracker";
import {
  formatCatalogPrice,
  getCatalogProduct,
  getCatalogProducts,
  getStockLabel,
  type WebCatalogProductCard,
  type WebCatalogProductDetail,
} from "@/app/lib/metrikCatalog";

type CatalogProductDetailPageProps = {
  params: Promise<{ slug: string }>;
};

function extractDescriptionSections(text: string | null): {
  paragraphs: string[];
  bulletItems: string[];
} {
  if (!text) return { paragraphs: [], bulletItems: [] };
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const bulletItems: string[] = [];
  const paragraphs: string[] = [];
  for (const line of lines) {
    if (/^[-*•]\s+/.test(line)) {
      bulletItems.push(line.replace(/^[-*•]\s+/, "").trim());
    } else {
      paragraphs.push(line);
    }
  }
  return { paragraphs, bulletItems };
}

async function getRelatedProducts(
  currentProductId: number,
  categoryPath?: string | null
): Promise<WebCatalogProductCard[]> {
  try {
    const categoryRows = await getCatalogProducts({
      category: categoryPath || undefined,
      page: 1,
    });
    const related = categoryRows.items.filter((item) => item.id !== currentProductId).slice(0, 4);
    if (related.length >= 4) return related;

    const fallbackRows = await getCatalogProducts({ page: 1 });
    const merged = [...related];
    for (const item of fallbackRows.items) {
      if (item.id === currentProductId || merged.some((row) => row.id === item.id)) continue;
      merged.push(item);
      if (merged.length >= 4) break;
    }
    return merged;
  } catch {
    return [];
  }
}

function getDetailDiscountBadgeText(product: WebCatalogProductDetail): string | null {
  if (product.price_mode !== "visible") return null;
  if (typeof product.price !== "number" || typeof product.compare_price !== "number") return null;
  if (product.compare_price <= product.price || product.compare_price <= 0) return null;
  const percent = Math.round(((product.compare_price - product.price) / product.compare_price) * 100);
  return percent > 0 ? `Descuento ${percent}%` : null;
}

export default async function CatalogProductDetailPage({
  params,
}: CatalogProductDetailPageProps) {
  const { slug } = await params;
  const product = await getCatalogProduct(slug);

  if (!product) notFound();

  const gallery = [product.image_url, product.image_thumb_url, ...product.gallery].filter(
    (image, index, list): image is string => Boolean(image) && list.indexOf(image) === index
  );
  const { paragraphs, bulletItems } = extractDescriptionSections(
    product.long_description || product.short_description
  );
  const relatedProducts = await getRelatedProducts(product.id, product.category_path);
  const discountBadge = getDetailDiscountBadgeText(product);
  const commercialBadge = product.badge_text?.trim() || null;

  return (
    <main className="site-shell internal-page section-space product-page-shell">
      <section className="catalog-breadcrumbs">
        <Link href="/catalogo">← Volver al catálogo</Link>
        <span>Catálogo</span>
        {product.category_path ? <span>{product.category_name || "Categoría"}</span> : null}
        <span>{product.name}</span>
      </section>

      <section className="product-detail-grid">
        <article className="product-visual-card">
          <ProductDetailGallery productName={product.name} gallery={gallery} />

          <div className="product-rich-description">
            <h2>Descripción</h2>
            {paragraphs.length ? (
              paragraphs.map((paragraph, index) => <p key={`paragraph-${index}`}>{paragraph}</p>)
            ) : (
              <p>
                Esta referencia está conectada al catálogo operativo de Kensar. Si necesitas una
                validación técnica o comercial adicional, te ayudamos por WhatsApp.
              </p>
            )}
            {bulletItems.length ? (
              <ul>
                {bulletItems.map((item, index) => (
                  <li key={`bullet-${index}`}>{item}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </article>

        <aside className="product-info-card product-commerce-panel">
          <div className="product-commerce-panel-inner">
            <div className="product-commerce-split">
              <section className="product-summary-panel">
                <div className="product-info-head">
                  {product.stock_status !== "in_stock" || product.featured || discountBadge || commercialBadge ? (
                    <div className="product-badge-stack" aria-hidden="true">
                      {product.stock_status !== "in_stock" ? (
                        <span className={`product-stock-badge stock-${product.stock_status}`}>
                          {getStockLabel(product.stock_status)}
                        </span>
                      ) : null}
                      {product.featured ? <span className="product-featured-badge">Destacado</span> : null}
                      {discountBadge ? <span className="product-discount-badge">{discountBadge}</span> : null}
                      {commercialBadge ? <span className="product-commercial-badge">{commercialBadge}</span> : null}
                    </div>
                  ) : null}
                  <p className="product-info-meta">
                    <span className="is-category">{product.category_name || "Catálogo"}</span>
                    {product.brand ? <span className="is-brand">{product.brand}</span> : null}
                    {product.sku ? <span className="is-sku">SKU {product.sku}</span> : null}
                  </p>
                  <h1>{product.name}</h1>
                </div>

                <div className="product-price-block">
                  <strong>{formatCatalogPrice(product.price)}</strong>
                  {product.compare_price ? <del>{formatCatalogPrice(product.compare_price)}</del> : null}
                </div>
                {product.short_description?.trim() ? (
                  <p className="product-summary-short-copy">{product.short_description.trim()}</p>
                ) : null}
                {product.warranty_text?.trim() ? (
                  <>
                    <p className="product-warranty-copy">
                      <span className="product-warranty-check" aria-hidden="true">
                        ✓
                      </span>
                      <span>{product.warranty_text.trim()}</span>
                    </p>
                    <Link href="/politicas-de-garantia" className="product-warranty-policy-link">
                      Políticas de garantía
                    </Link>
                  </>
                ) : null}
                <p className="product-tax-copy">
                  Impuestos incluidos.{" "}
                  <span>Los gastos de envío</span> se calcularán al momento de pagar.
                </p>
                <div className="product-pickup-copy">
                  <p className="product-pickup-main">
                    <span className="product-pickup-check" aria-hidden="true">
                      ✓
                    </span>
                    <span>
                      Retiro disponible en <strong>Cra 24 #30-75, Palmira</strong>
                    </span>
                  </p>
                  <p className="product-pickup-sub">Suele estar listo el mismo día</p>
                  <Link href="/empresa" className="product-pickup-link">
                    Ver información de la tienda
                  </Link>
                </div>
                <div className="product-pickup-copy">
                  <p className="product-pickup-main">
                    <span className="product-warranty-check" aria-hidden="true">
                      ✓
                    </span>
                    <span>¿Necesitas ayuda? Te orientamos para elegir el producto ideal.</span>
                  </p>
                  <ProductKoraAssistLink
                    className="product-pickup-link"
                    prompt={`Quiero asesoría para ${product.name}${product.sku ? ` (SKU ${product.sku})` : ""}`}
                  >
                    Solicitar asesoría
                  </ProductKoraAssistLink>
                </div>
              </section>

              <section className="product-actions-panel">
                <div className="product-actions-copy">
                  <strong>Opciones de compra</strong>
                  <p>Recibe acompañamiento por WhatsApp para confirmar disponibilidad y entrega.</p>
                </div>

                <ProductPurchaseCta
                  productId={product.id}
                  stockStatus={product.stock_status}
                  productName={product.name}
                  productSlug={product.slug}
                  productSku={product.sku}
                  imageUrl={product.image_url}
                  brand={product.brand}
                  unitPrice={product.price ?? 0}
                  comparePrice={product.compare_price}
                />

              </section>
            </div>
          </div>
        </aside>
      </section>

      {relatedProducts.length ? (
        <section className="product-related-section">
          <h2>También te podría interesar</h2>
          <div className="catalog-product-grid storefront-grid product-related-grid">
            {relatedProducts.map((related) => (
              <CatalogProductCard key={`related-${related.id}`} product={related} />
            ))}
          </div>
        </section>
      ) : null}
      <ProductViewTracker
        product={{
          id: product.id,
          slug: product.slug,
          name: product.name,
          image_url: product.image_url,
          price: product.price,
          compare_price: product.compare_price,
          brand: product.brand,
        }}
      />
    </main>
  );
}
