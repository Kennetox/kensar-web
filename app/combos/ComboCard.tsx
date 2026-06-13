import Link from "next/link";
import CatalogProductGallery from "@/app/catalogo/CatalogProductGallery";
import { formatCatalogPrice, type WebCatalogCombo } from "@/app/lib/metrikCatalog";
import ComboDetailButton from "./ComboDetailButton";
import { humanizeComboCategoryKey } from "./comboUtils";

function getComboPriceLabel(value: number) {
  return formatCatalogPrice(value);
}

function getDiscountBadgeText(combo: WebCatalogCombo): string | null {
  if (typeof combo.price !== "number" || typeof combo.compare_price !== "number") return null;
  if (combo.compare_price <= combo.price || combo.compare_price <= 0) return null;
  const fallbackPercent = Math.round(((combo.compare_price - combo.price) / combo.compare_price) * 100);
  if (fallbackPercent <= 0) return null;
  return `Descuento ${fallbackPercent}%`;
}

function hasUnavailableComboItem(combo: WebCatalogCombo): boolean {
  return combo.items.some(
    (item) => item.stock_status === "out_of_stock" || item.stock_status === "service" || item.stock_status === "consultar"
  );
}

export default function ComboCard({
  combo,
  viewMode = "grid",
}: {
  combo: WebCatalogCombo;
  viewMode?: "grid" | "list";
}) {
  const comboHref = `/combos/${combo.slug}`;
  const comboCategory = humanizeComboCategoryKey(combo.category_key || "");
  const priceLabel = getComboPriceLabel(combo.price);
  const hasComparePrice = typeof combo.compare_price === "number" && combo.compare_price > combo.price;
  const discountBadge = getDiscountBadgeText(combo);
  const comboUnavailable = hasUnavailableComboItem(combo);
  const comboStockLabel = comboUnavailable ? "Sin stock" : "Disponible";
  const comboStockToneClass = comboUnavailable ? "is-out-stock" : "is-in-stock";
  const mediaGallery = [combo.image_url, combo.image_thumb_url, ...combo.gallery_urls].filter(
    (value, index, list): value is string => Boolean(value) && list.indexOf(value) === index
  );

  if (viewMode === "list") {
    return (
      <article className="catalog-product-card-live catalog-product-card-list">
        <div className="catalog-product-card-list-media catalog-product-card-media storefront-card-media catalog-hover-gallery">
          <CatalogProductGallery
            detailHref={comboHref}
            gallery={mediaGallery}
            imageUrl={combo.image_url}
            imageThumbUrl={combo.image_thumb_url}
          />
          {combo.featured || discountBadge || combo.badge_text || comboUnavailable ? (
            <div className="catalog-badge-stack" aria-hidden="true">
              {comboUnavailable ? (
                <span className="catalog-stock-badge stock-out_of_stock">Sin stock</span>
              ) : null}
              {combo.featured ? <span className="catalog-featured-badge">Destacado</span> : null}
              {discountBadge ? <span className="catalog-discount-badge">{discountBadge}</span> : null}
              {combo.badge_text ? <span className="catalog-commercial-badge">{combo.badge_text}</span> : null}
            </div>
          ) : null}
        </div>
        <div className="catalog-product-card-list-body catalog-product-card-body storefront-card-body">
          <Link
            href={comboHref}
            prefetch={false}
            className="catalog-product-card-body-link"
            aria-label={`Ver detalle de ${combo.name}`}
          >
            <div className="catalog-product-meta storefront-meta">
              {comboCategory ? <span className="catalog-meta-chip">{comboCategory}</span> : <span>Combo</span>}
            </div>
            <h3>{combo.name}</h3>
          <div className="catalog-product-combo-count">
            <span>{combo.items.length} producto{combo.items.length === 1 ? "" : "s"}</span>
          </div>
          <div className={`catalog-product-compare-price${hasComparePrice ? "" : " is-empty"}`}>
            {hasComparePrice ? <del>{formatCatalogPrice(combo.compare_price)}</del> : null}
          </div>
          <div className="catalog-product-price-row">
            <strong>{priceLabel}</strong>
          </div>
          <div className={`catalog-product-stock-line ${comboStockToneClass}`}>
            <span className="catalog-product-stock-dot" aria-hidden="true" />
            <span>{comboStockLabel}</span>
          </div>
          </Link>
        </div>
        <div className="catalog-product-card-list-actions">
          <ComboDetailButton href={comboHref} label="Ver combo" />
        </div>
      </article>
    );
  }

  return (
    <article className="catalog-product-card-live storefront-card storefront-card-pro">
      <div className="catalog-product-card-media storefront-card-media catalog-hover-gallery">
        <CatalogProductGallery
          detailHref={comboHref}
          gallery={mediaGallery}
          imageUrl={combo.image_url}
          imageThumbUrl={combo.image_thumb_url}
        />
        {combo.featured || discountBadge || combo.badge_text || comboUnavailable ? (
          <div className="catalog-badge-stack" aria-hidden="true">
            {comboUnavailable ? <span className="catalog-stock-badge stock-out_of_stock">Sin stock</span> : null}
            {combo.featured ? <span className="catalog-featured-badge">Destacado</span> : null}
            {discountBadge ? <span className="catalog-discount-badge">{discountBadge}</span> : null}
            {combo.badge_text ? <span className="catalog-commercial-badge">{combo.badge_text}</span> : null}
          </div>
        ) : null}
      </div>
      <div className="catalog-product-card-body storefront-card-body">
        <Link
          href={comboHref}
          prefetch={false}
          className="catalog-product-card-body-link"
          aria-label={`Ver detalle de ${combo.name}`}
        >
          <div className="catalog-product-meta storefront-meta">
            {comboCategory ? <span className="catalog-meta-chip">{comboCategory}</span> : <span>Combo</span>}
          </div>
          <h3>{combo.name}</h3>

          <div className="catalog-product-combo-count">
            <span>{combo.items.length} producto{combo.items.length === 1 ? "" : "s"}</span>
          </div>

          <div className={`catalog-product-compare-price${hasComparePrice ? "" : " is-empty"}`}>
            {hasComparePrice ? <del>{formatCatalogPrice(combo.compare_price)}</del> : null}
          </div>

          <div className="catalog-product-price-row">
            <strong>{priceLabel}</strong>
          </div>
          <div className={`catalog-product-stock-line ${comboStockToneClass}`}>
            <span className="catalog-product-stock-dot" aria-hidden="true" />
            <span>{comboStockLabel}</span>
          </div>
        </Link>
        <div className="catalog-product-card-cta">
          <ComboDetailButton href={comboHref} label="Ver combo" />
        </div>
      </div>
    </article>
  );
}
