import Link from "next/link";
import CatalogProductGallery from "@/app/catalogo/CatalogProductGallery";
import AddToCartButton from "@/app/components/AddToCartButton";
import {
  formatCatalogPrice,
  getStockLabel,
  type WebCatalogProductCard,
} from "@/app/lib/metrikCatalog";

function getDiscountBadgeText(product: WebCatalogProductCard): string | null {
  if (product.price_mode !== "visible") return null;

  if (product.web_price_source === "discount_percent") {
    const rawPercent =
      typeof product.web_price_value === "string"
        ? Number(product.web_price_value.replace(/[^\d,.-]/g, "").replace(",", ".") || "0")
        : Number(product.web_price_value ?? 0);
    const safePercent = Math.round(Math.min(100, Math.max(0, Number.isFinite(rawPercent) ? rawPercent : 0)));
    if (safePercent > 0) {
      return `Descuento ${safePercent}%`;
    }
  }

  if (typeof product.price !== "number" || typeof product.compare_price !== "number") return null;
  if (product.compare_price <= product.price || product.compare_price <= 0) return null;
  const fallbackPercent = Math.round(((product.compare_price - product.price) / product.compare_price) * 100);
  if (fallbackPercent <= 0) return null;
  return `Descuento ${fallbackPercent}%`;
}

export default function CatalogProductCard({
  product,
  catalogReturnTo,
  showAddToCart = true,
}: {
  product: WebCatalogProductCard;
  catalogReturnTo?: string;
  showAddToCart?: boolean;
}) {
  const discountBadge = getDiscountBadgeText(product);
  const commercialBadge = product.badge_text?.trim() || null;
  const stockBadgeLabel = product.stock_status === "out_of_stock" ? "Agotado" : getStockLabel(product.stock_status);
  const isUnavailable = product.stock_status === "out_of_stock" || product.stock_status === "service" || product.stock_status === "consultar";
  const stockToneClass =
    product.stock_status === "in_stock"
      ? "is-in-stock"
      : product.stock_status === "low_stock"
      ? "is-low-stock"
      : "is-out-stock";
  const detailHref = catalogReturnTo
    ? `/catalogo/${product.slug}?returnTo=${encodeURIComponent(catalogReturnTo)}`
    : `/catalogo/${product.slug}`;

  return (
    <article className="catalog-product-card-live storefront-card storefront-card-pro">
      <div className="catalog-product-card-media storefront-card-media catalog-hover-gallery">
        <CatalogProductGallery
          detailHref={detailHref}
          gallery={product.gallery}
          imageUrl={product.image_url}
          imageThumbUrl={product.image_thumb_url}
        />
        {product.stock_status !== "in_stock" || product.featured || discountBadge || commercialBadge ? (
          <div className="catalog-badge-stack" aria-hidden="true">
            {product.stock_status !== "in_stock" ? (
              <span className={`catalog-stock-badge stock-${product.stock_status}`}>
                {stockBadgeLabel}
              </span>
            ) : null}
            {product.featured ? <span className="catalog-featured-badge">Destacado</span> : null}
            {discountBadge ? <span className="catalog-discount-badge">{discountBadge}</span> : null}
            {commercialBadge ? <span className="catalog-commercial-badge">{commercialBadge}</span> : null}
          </div>
        ) : null}
      </div>
      <div className="catalog-product-card-body storefront-card-body">
        <Link
          href={detailHref}
          className="catalog-product-card-body-link"
          aria-label={`Ver detalle de ${product.name}`}
        >
          <div className="catalog-product-meta storefront-meta">
            {product.category_name ? (
              <span className="catalog-meta-chip">{product.category_name}</span>
            ) : (
              <span>Sin categoria</span>
            )}
            {product.brand ? (
              <span>{product.brand}</span>
            ) : (
              <span className="catalog-meta-ghost" aria-hidden="true">
                &nbsp;
              </span>
            )}
          </div>
          <h3>{product.name}</h3>

          <div className={`catalog-product-compare-price${product.compare_price ? "" : " is-empty"}`}>
            {product.compare_price ? <del>{formatCatalogPrice(product.compare_price)}</del> : null}
          </div>

          <div className="catalog-product-price-row">
            <strong>{formatCatalogPrice(product.price)}</strong>
            <span className={product.sku ? undefined : "is-empty"}>
              {product.sku ? `SKU ${product.sku}` : "\u00A0"}
            </span>
          </div>
        </Link>
        <div className={`catalog-product-stock-line ${stockToneClass}`}>
          <span className="catalog-product-stock-dot" aria-hidden="true" />
          <span>{getStockLabel(product.stock_status)}</span>
        </div>
        {showAddToCart ? (
          <div className="catalog-product-card-cta">
            <AddToCartButton
              productId={product.id}
              productName={product.name}
              productSlug={product.slug}
              productSku={product.sku}
              imageUrl={product.image_thumb_url || product.image_url}
              brand={product.brand}
              stockStatus={product.stock_status}
              unitPrice={product.price ?? 0}
              comparePrice={product.compare_price}
              showCartIcon={false}
              wrapClassName="catalog-product-card-cta-wrap"
              buttonClassName={isUnavailable ? "catalog-product-card-cta-disabled" : "catalog-product-card-cta-button"}
            />
          </div>
        ) : null}
      </div>
    </article>
  );
}
