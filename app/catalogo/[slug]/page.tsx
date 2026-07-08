import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ProductBackToCatalogLink from "@/app/catalogo/ProductBackToCatalogLink";
import ProductDetailGallery from "@/app/catalogo/ProductDetailGallery";
import ProductPurchaseCta from "@/app/catalogo/ProductPurchaseCta";
import ProductKoraAssistLink from "@/app/catalogo/ProductKoraAssistLink";
import ProductRelatedProductsSection from "@/app/catalogo/ProductRelatedProductsSection";
import ProductViewTracker from "@/app/catalogo/ProductViewTracker";
import KoraPageContextBridge from "@/app/components/KoraPageContextBridge";
import RelatedProductsSkeleton from "@/app/components/skeleton/RelatedProductsSkeleton";
import {
  buildCatalogCategoryHrefFromSegments,
  buildCatalogCategoryMap,
  buildCatalogCategoryTrailFromKey,
} from "@/app/lib/catalogCategoryTree";
import { buildWhatsAppPrefill } from "@/app/lib/kora/whatsapp-handoff";
import {
  formatCatalogPrice,
  getCatalogCategoryHierarchy,
  getCatalogProduct,
  getStockLabel,
  type WebCatalogProductDetail,
} from "@/app/lib/metrikCatalog";

export const revalidate = 900;

type CatalogProductDetailPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function pickSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string
): string {
  const raw = searchParams[key];
  if (Array.isArray(raw)) return String(raw[0] || "").trim();
  return String(raw || "").trim();
}

export async function generateMetadata({ params, searchParams }: CatalogProductDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const query = (await searchParams) || {};
  const product = await getCatalogProduct(slug);
  if (!product) {
    return {};
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://kensarelectronic.com").replace(/\/+$/, "");
  const baseProductUrl = `${siteUrl}/catalogo/${product.slug}`;
  const shareSource = pickSearchParam(query, "src");
  const shareVersion = pickSearchParam(query, "v");
  const metadataUrl = new URL(baseProductUrl);
  if (shareSource) metadataUrl.searchParams.set("src", shareSource);
  if (shareVersion) metadataUrl.searchParams.set("v", shareVersion);
  const productUrl = metadataUrl.toString();
  const description = (product.short_description || product.long_description || "").trim();
  const fallbackDescription = "Producto disponible en Kensar Electronic.";
  const previewImageUrl = product.image_thumb_url || product.image_url || `${siteUrl}/api/og/product-image?slug=${encodeURIComponent(product.slug)}`;
  const imageSet = previewImageUrl
    ? [
        {
          url: previewImageUrl,
          secureUrl: previewImageUrl,
          width: 1200,
          height: 630,
          alt: product.name,
        },
      ]
    : undefined;

  return {
    title: `${product.name} | Kensar Electronic`,
    description: description || fallbackDescription,
    alternates: {
      canonical: baseProductUrl,
    },
    openGraph: {
      title: `${product.name} | Kensar Electronic`,
      description: description || fallbackDescription,
      url: productUrl,
      type: "website",
      images: imageSet,
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} | Kensar Electronic`,
      description: description || fallbackDescription,
      images: previewImageUrl ? [previewImageUrl] : undefined,
    },
  };
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
  const [product, categories] = await Promise.all([
    getCatalogProduct(slug),
    getCatalogCategoryHierarchy().catch(() => []),
  ]);

  if (!product) notFound();

  const categoryMap = buildCatalogCategoryMap(categories);
  const categoryTrail = product.category_path
    ? buildCatalogCategoryTrailFromKey(product.category_path, categoryMap)
    : null;
  const gallery = [product.image_url, product.image_thumb_url, ...product.gallery].filter(
    (image, index, list): image is string => Boolean(image) && list.indexOf(image) === index
  );
  const descriptionText = (product.long_description || product.short_description || "").trim();
  const discountBadge = getDetailDiscountBadgeText(product);
  const commercialBadge = product.badge_text?.trim() || null;
  const fallbackCatalogHref = categoryTrail
    ? buildCatalogCategoryHrefFromSegments(categoryTrail.segments)
    : "/catalogo";
  const shippingWhatsAppHref = buildWhatsAppPrefill({
    origin: "product_page_whatsapp",
    need: "envio",
    intent: "shipping_question",
    currentPath: `/catalogo/${product.slug}`,
    currentUrl: `https://kensarelectronic.com/catalogo/${product.slug}`,
    productName: product.name,
    productSlug: product.slug,
    productSku: product.sku || undefined,
    productPrice: typeof product.price === "number" ? product.price : undefined,
    categoryName: product.category_name || undefined,
    categorySlug: product.category_path || undefined,
    latestInput: `Quiero saber el costo de envío de ${product.name} a [mi ciudad].`,
  }).href;

  return (
    <main className="site-shell internal-page section-space product-page-shell product-detail-page">
      <KoraPageContextBridge
        pageContext={{
          pageType: "product",
          categorySlug: product.category_path || undefined,
          categoryName: product.category_name || undefined,
          productId: product.id,
          productName: product.name,
          productPrice: typeof product.price === "number" ? product.price : undefined,
          productBrand: product.brand || undefined,
          productCategory: product.category_name || product.category_path || undefined,
          productDescription: (product.long_description || product.short_description || "").trim() || undefined,
          productAttributes: {
            product_slug: product.slug,
            product_sku: product.sku || null,
            stock_status: product.stock_status,
            price_mode: product.price_mode,
            featured: product.featured,
            has_warranty: Boolean(product.warranty_text?.trim()),
          },
        }}
      />
      <section className="catalog-breadcrumbs">
        <ProductBackToCatalogLink fallbackHref={fallbackCatalogHref} />
        <span>Catálogo</span>
        {product.category_path ? <span>{product.category_name || product.category_path}</span> : null}
        <span>{product.name}</span>
      </section>

      <section className="product-detail-grid">
        <article className="product-visual-card">
          <ProductDetailGallery productName={product.name} gallery={gallery} videoUrl={product.video_url || null} />

          <div className="product-rich-description product-rich-description-desktop">
            <h2>Descripción</h2>
            {descriptionText ? (
              <p className="product-rich-description-raw">{descriptionText}</p>
            ) : (
              <p>
                Esta referencia está conectada al catálogo operativo de Kensar. Si necesitas una
                validación técnica o comercial adicional, te ayudamos por WhatsApp.
              </p>
            )}
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
                <p className="product-mobile-tax-note">
                  Impuestos incluidos. <span>Los gastos de envío</span> se calcularán al momento de pagar.
                </p>
                {product.warranty_text?.trim() ? (
                  <>
                    <p className="product-warranty-copy">
                      <span className="product-warranty-check" aria-hidden="true">
                        ✓
                      </span>
                      <span>{product.warranty_text.trim()}</span>
                    </p>
                    <Link
                      href="/legal/cambios-devoluciones-garantias#garantias"
                      className="product-warranty-policy-link"
                    >
                      Políticas de garantía
                    </Link>
                  </>
                ) : null}
                <div className="product-shipping-copy" aria-label="Condiciones de envío y contraentrega">
                  <p className="product-shipping-headline">
                    <span aria-hidden="true">🚚</span>
                    <span>Envíos a todo Colombia</span>
                  </p>
                  <div className="product-shipping-group">
                    <p className="product-shipping-group-title">
                      <span aria-hidden="true">🟢</span>
                      <strong>Palmira y Cali:</strong>
                    </p>
                    <p>Envío GRATIS en compras desde $100.000</p>
                    <p>Pago contraentrega disponible</p>
                  </div>
                  <div className="product-shipping-group">
                    <p className="product-shipping-group-title">
                      <span aria-hidden="true">📦</span>
                      <strong>Otras ciudades:</strong>
                    </p>
                    <p>Envío por transportadora</p>
                    <p>Pago anticipado o contraentrega bajo validación</p>
                  </div>
                  <p className="product-shipping-whatsapp-note">
                    <span aria-hidden="true">📲</span>
                    <span>Confirmamos detalles de envío por WhatsApp antes de despachar</span>
                  </p>
                  <a
                    href={shippingWhatsAppHref}
                    target="_blank"
                    rel="noreferrer"
                    className="product-shipping-whatsapp-btn"
                  >
                    Consultar envío por WhatsApp
                  </a>
                </div>
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
                  category={product.category_name || product.category_path || null}
                  unitPrice={product.price ?? 0}
                  comparePrice={product.compare_price}
                />

              </section>
            </div>
          </div>
        </aside>
      </section>

      <section className="product-rich-description product-rich-description-mobile">
        <h2>Descripción</h2>
        {descriptionText ? (
          <p className="product-rich-description-raw">{descriptionText}</p>
        ) : (
          <p>
            Esta referencia está conectada al catálogo operativo de Kensar. Si necesitas una validación técnica o
            comercial adicional, te ayudamos por WhatsApp.
          </p>
        )}
      </section>

      <Suspense fallback={<RelatedProductsSkeleton />}>
        <ProductRelatedProductsSection
          currentProductId={product.id}
          currentProductSlug={product.slug}
          categoryPath={product.category_path}
          brand={product.brand}
        />
      </Suspense>

      <ProductViewTracker
        product={{
          id: product.id,
          slug: product.slug,
          name: product.name,
          image_url: product.image_url,
          price: product.price,
          compare_price: product.compare_price,
          brand: product.brand,
          category: product.category_name || product.category_path || null,
          sku: product.sku,
        }}
      />
    </main>
  );
}
