import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import CatalogProductCard from "@/app/catalogo/CatalogProductCard";
import ComboCard from "../ComboCard";
import ComboPurchaseCta from "../ComboPurchaseCta";
import ComboShareCard from "../ComboShareCard";
import ProductBackToCatalogLink from "@/app/catalogo/ProductBackToCatalogLink";
import ProductDetailGallery from "@/app/catalogo/ProductDetailGallery";
import ProductHorizontalDragScroll from "@/app/catalogo/ProductHorizontalDragScroll";
import ProductKoraAssistLink from "@/app/catalogo/ProductKoraAssistLink";
import ProductPaymentMethods from "@/app/catalogo/ProductPaymentMethods";
import ProductViewTracker from "@/app/catalogo/ProductViewTracker";
import KoraPageContextBridge from "@/app/components/KoraPageContextBridge";
import { buildWhatsAppPrefill } from "@/app/lib/kora/whatsapp-handoff";
import {
  formatCatalogPrice,
  getCatalogCombo,
  getCatalogCombos,
  getCatalogProduct,
  getCatalogProducts,
  type WebCatalogProductCard,
  type WebCatalogCombo,
} from "@/app/lib/metrikCatalog";
import { humanizeComboCategoryKey, normalizeComboFilterKey } from "../comboUtils";

export const dynamic = "force-dynamic";

type ComboDetailPageProps = {
  params: Promise<{ slug: string }>;
};

function getComboDescription(combo: WebCatalogCombo) {
  return (combo.long_description || combo.short_description || "").trim();
}

function getDiscountBadgeText(combo: WebCatalogCombo): string | null {
  if (typeof combo.price !== "number" || typeof combo.compare_price !== "number") return null;
  if (combo.compare_price <= combo.price || combo.compare_price <= 0) return null;
  const percent = Math.round(((combo.compare_price - combo.price) / combo.compare_price) * 100);
  return percent > 0 ? `Descuento ${percent}%` : null;
}

const DEFAULT_COMBO_BADGE_COLOR = "#475569";

function normalizeHexColor(value: string | null | undefined): string {
  const trimmed = (value || "").trim();
  return /^#([0-9a-fA-F]{6})$/.test(trimmed) ? trimmed : DEFAULT_COMBO_BADGE_COLOR;
}

function getReadableTextColor(hexColor: string): string {
  const normalized = normalizeHexColor(hexColor).slice(1);
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;
  return luminance >= 150 ? "#111827" : "#ffffff";
}

type SuggestedItem =
  | { kind: "combo"; key: string; combo: WebCatalogCombo }
  | { kind: "product"; key: string; product: WebCatalogProductCard };

async function getRelatedCombos(currentCombo: WebCatalogCombo): Promise<WebCatalogCombo[]> {
  const RELATED_LIMIT = 5;
  try {
    const combos = await getCatalogCombos();
    const currentKey = normalizeComboFilterKey(currentCombo.category_key || "");
    const related = combos
      .filter((combo) => combo.id !== currentCombo.id)
      .sort((a, b) => {
        const aSame = normalizeComboFilterKey(a.category_key || "") === currentKey ? 1 : 0;
        const bSame = normalizeComboFilterKey(b.category_key || "") === currentKey ? 1 : 0;
        return (
          bSame - aSame ||
          Number(b.featured ? 1 : 0) - Number(a.featured ? 1 : 0) ||
          Number(a.sort_order || 0) - Number(b.sort_order || 0) ||
          a.name.localeCompare(b.name, "es")
        );
      });
    return related.slice(0, RELATED_LIMIT);
  } catch {
    return [];
  }
}

async function getSuggestedProductsFromComboItems(currentCombo: WebCatalogCombo): Promise<WebCatalogProductCard[]> {
  const excludedSlugs = new Set<string>();
  const seedSlugs: string[] = [];
  const seedQueries: string[] = [];

  for (const item of currentCombo.items) {
    const slug = item.product_slug?.trim();
    if (slug) {
      excludedSlugs.add(slug);
      seedSlugs.push(slug);
    }

    const name = item.product_name?.trim();
    if (name) seedQueries.push(name);

    const brand = item.product_brand?.trim();
    if (brand) seedQueries.push(brand);
  }

  const seedDetails = await Promise.all(seedSlugs.map((slug) => getCatalogProduct(slug).catch(() => null)));
  const seedCategories = Array.from(
    new Set(
      seedDetails
        .map((item) => item?.category_path?.trim())
        .filter((value): value is string => Boolean(value))
    )
  );

  const queries = Array.from(
    new Set(
      [
        currentCombo.name?.trim(),
        currentCombo.short_description?.trim(),
        currentCombo.long_description?.trim(),
        ...seedQueries,
      ].filter((value): value is string => Boolean(value))
    )
  ).slice(0, 4);

  const merged: WebCatalogProductCard[] = [];

  const appendProducts = (products: WebCatalogProductCard[]) => {
    for (const product of products) {
      if (excludedSlugs.has(product.slug)) continue;
      if (merged.some((item) => item.id === product.id)) continue;
      merged.push(product);
      if (merged.length >= 8) return;
    }
  };

  const categoryBuckets = await Promise.all(
    seedCategories.map((categoryPath) =>
      getCatalogProducts({ category: categoryPath, page: 1, page_size: 8 }).catch(() => ({ items: [] }))
    )
  );
  for (const bucket of categoryBuckets) {
    appendProducts(bucket.items);
    if (merged.length >= 8) return merged;
  }

  const queryBuckets = await Promise.all(
    queries.map((query) => getCatalogProducts({ q: query, page: 1, page_size: 8 }).catch(() => ({ items: [] })))
  );
  for (const bucket of queryBuckets) {
    appendProducts(bucket.items);
    if (merged.length >= 8) return merged;
  }

  if (!merged.length) {
    const comboFallback = await getCatalogProducts({
      q: currentCombo.name,
      page: 1,
      page_size: 8,
    }).catch(() => ({ items: [] }));
    appendProducts(comboFallback.items);
  }

  return merged;
}

async function buildComboSuggestions(currentCombo: WebCatalogCombo): Promise<SuggestedItem[]> {
  const relatedCombos = await getRelatedCombos(currentCombo);
  const suggestions: SuggestedItem[] = relatedCombos.map((combo) => ({
    kind: "combo",
    key: `combo-${combo.id}`,
    combo,
  }));

  if (suggestions.length >= 5) return suggestions.slice(0, 5);

  const relatedProducts = await getSuggestedProductsFromComboItems(currentCombo);
  for (const product of relatedProducts) {
    if (suggestions.length >= 5) break;
    suggestions.push({
      kind: "product",
      key: `product-${product.id}`,
      product,
    });
  }

  return suggestions.slice(0, 5);
}

export async function generateMetadata({ params }: ComboDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const combo = await getCatalogCombo(slug);
  if (!combo) return {};

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://kensarelectronic.com").replace(/\/+$/, "");
  const baseUrl = `${siteUrl}/combos/${combo.slug}`;
  const description = getComboDescription(combo) || "Combo disponible en Kensar Electronic.";
  const previewImage = combo.image_url || combo.image_thumb_url || combo.gallery_urls[0] || null;

  return {
    title: `${combo.name} | Kensar Electronic`,
    description,
    alternates: {
      canonical: baseUrl,
    },
    openGraph: {
      title: `${combo.name} | Kensar Electronic`,
      description,
      url: baseUrl,
      type: "website",
      images: previewImage
        ? [
            {
              url: previewImage,
              width: 1200,
              height: 630,
              alt: combo.name,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${combo.name} | Kensar Electronic`,
      description,
      images: previewImage ? [previewImage] : undefined,
    },
  };
}

export default async function ComboDetailPage({ params }: ComboDetailPageProps) {
  const { slug } = await params;
  const combo = await getCatalogCombo(slug);

  if (!combo) notFound();

  const relatedSuggestions = await buildComboSuggestions(combo);
  const hasRelatedSuggestions = relatedSuggestions.length > 0;
  const comboDescription = getComboDescription(combo);
  const discountBadge = getDiscountBadgeText(combo);
  const categoryLabel = humanizeComboCategoryKey(combo.category_key || "");
  const itemsLabel = `${combo.items.length} producto${combo.items.length === 1 ? "" : "s"}`;
  const comboBadgeColor = normalizeHexColor(combo.badge_color);
  const comboBadgeStyle = combo.badge_text
    ? {
        backgroundColor: comboBadgeColor,
        borderColor: "rgba(255, 255, 255, 0.22)",
        color: getReadableTextColor(comboBadgeColor),
      }
    : undefined;
  const gallery = [combo.image_url, combo.image_thumb_url, ...combo.gallery_urls].filter(
    (image, index, list): image is string => Boolean(image) && list.indexOf(image) === index
  );
  const pageUrl = `https://kensarelectronic.com/combos/${combo.slug}`;
  const whatsappHref = buildWhatsAppPrefill({
    origin: "product_page_whatsapp",
    need: "cotizacion",
    intent: "quotation_request",
    currentPath: `/combos/${combo.slug}`,
    currentUrl: pageUrl,
    productName: combo.name,
    productSlug: combo.slug,
    productPrice: typeof combo.price === "number" ? combo.price : undefined,
    categoryName: combo.category_key || undefined,
    latestInput: `Quiero consultar el combo ${combo.name}.`,
  }).href;
  const shippingWhatsAppHref = whatsappHref;
  const fallbackCatalogHref = "/combos";
  const hasComparePrice = typeof combo.compare_price === "number" && combo.compare_price > combo.price;
  const comboUnavailable = combo.items.some(
    (item) => item.stock_status === "out_of_stock" || item.stock_status === "service" || item.stock_status === "consultar"
  );
  const includedItemsText = combo.items.map((item) => item.product_name).filter(Boolean);
  const includedProductsBlock = (
    <section className="product-combo-items-block" aria-label="Productos incluidos en el combo">
      <h2>Productos incluidos</h2>
      <div className="product-combo-items-list">
        {combo.items.map((item) => {
          const itemMetaParts = [item.product_brand?.trim(), item.product_sku?.trim()].filter(
            (value): value is string => Boolean(value)
          );
          return (
            <div key={item.id} className="product-combo-item-row">
              <div className="product-combo-item-main">
                <strong>{item.product_name}</strong>
                {itemMetaParts.length ? <p>{itemMetaParts.join(" · ")}</p> : null}
              </div>
              <div className="product-combo-item-side">
                <span className="product-combo-item-qty">x{item.quantity}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );

  return (
    <main className="site-shell internal-page section-space product-page-shell product-detail-page">
      <KoraPageContextBridge
        pageContext={{
          pageType: "product",
          categoryName: categoryLabel || combo.category_key || undefined,
          productId: combo.id,
          productName: combo.name,
          productPrice: typeof combo.price === "number" ? combo.price : undefined,
          productCategory: categoryLabel || combo.category_key || undefined,
          productDescription: comboDescription || undefined,
          productAttributes: {
            combo_slug: combo.slug,
            combo_category_key: combo.category_key,
            published: combo.published,
            active: combo.active,
            featured: combo.featured,
            stock_mode: combo.stock_mode,
            included_items: combo.items.length,
          },
        }}
      />

      <section className="catalog-breadcrumbs">
        <ProductBackToCatalogLink fallbackHref={fallbackCatalogHref}>← Volver a combos</ProductBackToCatalogLink>
        <span>Combos</span>
        {categoryLabel ? <span>{categoryLabel}</span> : null}
        <span>{combo.name}</span>
      </section>

      <section className="product-detail-grid">
        <article className="product-visual-card">
          <ProductDetailGallery productName={combo.name} gallery={gallery} videoUrl={combo.video_url || null} />

          <div className="product-rich-description product-rich-description-desktop">
            <h2>Descripción</h2>
            {comboDescription ? (
              <p className="product-rich-description-raw">{comboDescription}</p>
            ) : (
              <p>
                Este combo está conectado al catálogo operativo de Kensar. Si necesitas una validación técnica o
                comercial adicional, te ayudamos por WhatsApp.
              </p>
            )}
            {combo.technical_specs.length ? (
              <div className="product-combo-specs">
                {combo.technical_specs.map((spec, index) => (
                  <p key={`${spec.type}-${index}`}>
                    <strong>{spec.type}:</strong> {spec.value}
                  </p>
                ))}
              </div>
            ) : null}

            {includedProductsBlock}
          </div>
        </article>

        <aside className="product-info-card product-commerce-panel">
          <div className="product-commerce-panel-inner">
            <div className="product-commerce-split">
              <section className="product-summary-panel">
                <div className="product-info-head">
                  {discountBadge || combo.featured || combo.badge_text || comboUnavailable ? (
                    <div className="product-badge-stack" aria-hidden="true">
                      {comboUnavailable ? (
                        <span className="product-stock-badge stock-out_of_stock">Sin stock</span>
                      ) : null}
                      {combo.featured ? <span className="product-featured-badge">Destacado</span> : null}
                      {discountBadge ? <span className="product-discount-badge">{discountBadge}</span> : null}
                      {combo.badge_text ? (
                        <span className="product-commercial-badge" style={comboBadgeStyle}>
                          {combo.badge_text}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  <p className="product-info-meta">
                    <span className="is-category">{categoryLabel || "Combos"}</span>
                    <span className="is-brand">Combo</span>
                    <span className="is-sku">{itemsLabel}</span>
                  </p>
                  <h1>{combo.name}</h1>
                </div>

                <div className="product-price-block">
                  <strong>{formatCatalogPrice(combo.price)}</strong>
                  {hasComparePrice ? <del>{formatCatalogPrice(combo.compare_price)}</del> : null}
                </div>
                <p className="product-mobile-tax-note">
                  Productos agrupados con precio final. <span>Los gastos de envío</span> se calcularán al momento de
                  confirmar la compra.
                </p>
                {combo.warranty_text?.trim() ? (
                  <>
                    <p className="product-warranty-copy">
                      <span className="product-warranty-check" aria-hidden="true">
                        ✓
                      </span>
                      <span>{combo.warranty_text.trim()}</span>
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

                <div className="product-shipping-copy" aria-label="Qué incluye el combo">
                  <p className="product-shipping-headline">
                    <span aria-hidden="true">📦</span>
                    <span>Incluye {itemsLabel}</span>
                  </p>
                  {includedItemsText.slice(0, 5).map((itemName) => (
                    <p key={itemName}>{itemName}</p>
                  ))}
                  {combo.items.length > 5 ? <p>Y otros productos del combo.</p> : null}
                </div>

                <div className="product-pickup-copy">
                  <p className="product-pickup-main">
                    <span className="product-pickup-check" aria-hidden="true">
                      ✓
                    </span>
                    <span>
                      Consulta disponibilidad y ajustes de este combo por <strong>WhatsApp</strong>
                    </span>
                  </p>
                  <p className="product-pickup-sub">Te confirmamos detalle, stock y entrega antes de despachar</p>
                  <Link href="/combos" className="product-pickup-link">
                    Ver todos los combos
                  </Link>
                </div>

                <div className="product-pickup-copy">
                  <p className="product-pickup-main">
                    <span className="product-warranty-check" aria-hidden="true">
                      ✓
                    </span>
                    <span>¿Necesitas ayuda? Te orientamos para elegir el combo ideal.</span>
                  </p>
                  <ProductKoraAssistLink
                    className="product-pickup-link"
                    prompt={`Quiero asesoría para el combo ${combo.name}${combo.slug ? ` (SKU ${combo.slug})` : ""}`}
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

                <div className="product-actions-copy">
                  <strong>Compra directa</strong>
                  <p>Agrega este combo como productos individuales con el precio prorrateado del combo.</p>
                </div>

                <ComboPurchaseCta combo={combo} checkoutHref={`/pago?returnTo=${encodeURIComponent(`/combos/${combo.slug}`)}`} />

                <ProductPaymentMethods />
                <ComboShareCard
                  title={combo.name}
                  url={pageUrl}
                  className="product-share-card-inline"
                />
              </section>
            </div>
          </div>
        </aside>
      </section>

      <section className="product-rich-description product-rich-description-mobile">
        <h2>Descripción</h2>
        {comboDescription ? (
          <p className="product-rich-description-raw">{comboDescription}</p>
        ) : (
          <p>
            Este combo está conectado al catálogo operativo de Kensar. Si necesitas una validación técnica o comercial
            adicional, te ayudamos por WhatsApp.
          </p>
        )}
      </section>

      <section className="product-rich-description product-rich-description-mobile product-combo-mobile-description">
        <h2>Productos incluidos</h2>
        <div className="product-combo-items-list">
          {combo.items.map((item) => {
            const itemMetaParts = [item.product_brand?.trim(), item.product_sku?.trim()].filter(
              (value): value is string => Boolean(value)
            );
            return (
              <div key={item.id} className="product-combo-item-row">
                <div className="product-combo-item-main">
                  <strong>{item.product_name}</strong>
                  {itemMetaParts.length ? <p>{itemMetaParts.join(" · ")}</p> : null}
                </div>
                <div className="product-combo-item-side">
                  <span className="product-combo-item-qty">x{item.quantity}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {hasRelatedSuggestions ? (
        <section className="product-related-section product-related-mobile-scope">
          <h2>También te podría interesar</h2>
          <ProductHorizontalDragScroll className="catalog-product-grid storefront-grid product-related-grid product-related-mobile-carousel">
            {relatedSuggestions.map((suggestion) => (
              suggestion.kind === "combo" ? (
                <ComboCard key={suggestion.key} combo={suggestion.combo} />
              ) : (
                <CatalogProductCard key={suggestion.key} product={suggestion.product} />
              )
            ))}
          </ProductHorizontalDragScroll>
        </section>
      ) : (
        <section className="product-related-section product-related-mobile-scope">
          <h2>También te podría interesar</h2>
          <p className="product-related-empty-state">
            Todavía estamos cargando sugerencias relacionadas para este combo.
          </p>
        </section>
      )}

      <ProductViewTracker
        product={{
          id: combo.id,
          slug: combo.slug,
          name: combo.name,
          image_url: combo.image_url,
          price: combo.price,
          compare_price: combo.compare_price,
          brand: null,
          category: categoryLabel || combo.category_key || null,
          sku: null,
        }}
      />
    </main>
  );
}
