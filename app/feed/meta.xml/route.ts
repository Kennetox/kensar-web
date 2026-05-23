import type { WebCatalogProductCard, WebCatalogProductList } from "@/app/lib/metrikCatalog";

export const revalidate = 300;

const SITE_ORIGIN = "https://kensarelectronic.com";
const FEED_TITLE = "Kensar Electronic - Meta Catalog Feed";
const FEED_DESCRIPTION = "Catalogo de productos de Kensar Electronic para Meta Commerce Manager.";
const PAGE_SIZE = 60;

type FeedFetchError = Error & {
  endpoint?: string;
  status?: number;
  responseBody?: string;
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function sanitizeText(value: string | null | undefined): string {
  return (value || "").replace(/\s+/g, " ").trim();
}

function resolveProductLink(slug: string): string {
  return `${SITE_ORIGIN}/catalogo/${encodeURIComponent(slug)}`;
}

function getApiBaseUrl(): string {
  const baseUrl = (process.env.METRIK_API_BASE_URL || "").trim();
  if (!baseUrl) {
    throw new Error("Missing METRIK_API_BASE_URL");
  }
  return baseUrl.replace(/\/$/, "");
}

function resolveCatalogAssetUrl(baseUrl: string, value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value, `${baseUrl}/`).toString();
  } catch {
    return value;
  }
}

function normalizeCatalogProductCard(baseUrl: string, item: WebCatalogProductCard): WebCatalogProductCard {
  return {
    ...item,
    image_url: resolveCatalogAssetUrl(baseUrl, item.image_url),
    image_thumb_url: resolveCatalogAssetUrl(baseUrl, item.image_thumb_url),
    gallery: (item.gallery || []).map((image) => resolveCatalogAssetUrl(baseUrl, image) || image),
    video_url: resolveCatalogAssetUrl(baseUrl, item.video_url || null),
  };
}

function resolveAvailability(stockStatus: WebCatalogProductCard["stock_status"]): "in stock" | "out of stock" {
  if (stockStatus === "out_of_stock") return "out of stock";
  return "in stock";
}

function isMetaFeedEligible(product: WebCatalogProductCard): boolean {
  if (!product?.id || !product.slug) return false;
  if (product.price_mode !== "visible") return false;
  if (typeof product.price !== "number" || !Number.isFinite(product.price) || product.price <= 0) return false;
  if (!sanitizeText(product.image_url)) return false;
  return true;
}

function buildMetaItemXml(product: WebCatalogProductCard): string {
  const title = sanitizeText(product.name);
  const description = sanitizeText(product.short_description || product.long_description || product.name);
  const brand = sanitizeText(product.brand) || "Kensar Electronic";
  const productType = sanitizeText(product.category_name || product.category_path || "Catalogo");
  const imageLink = sanitizeText(product.image_url);
  const price = `${Math.round(product.price || 0)} COP`;
  const availability = resolveAvailability(product.stock_status);
  const productId = String(product.id);
  const sku = sanitizeText(product.sku);

  return [
    "<item>",
    `<g:id>${escapeXml(productId)}</g:id>`,
    `<g:title>${escapeXml(title)}</g:title>`,
    `<g:description>${escapeXml(description)}</g:description>`,
    `<g:availability>${availability}</g:availability>`,
    "<g:condition>new</g:condition>",
    `<g:price>${price}</g:price>`,
    `<g:link>${escapeXml(resolveProductLink(product.slug))}</g:link>`,
    `<g:image_link>${escapeXml(imageLink)}</g:image_link>`,
    `<g:brand>${escapeXml(brand)}</g:brand>`,
    `<g:product_type>${escapeXml(productType)}</g:product_type>`,
    sku ? `<g:retailer_part_no>${escapeXml(sku)}</g:retailer_part_no>` : "",
    sku ? `<g:sku>${escapeXml(sku)}</g:sku>` : "",
    "</item>",
  ]
    .filter(Boolean)
    .join("");
}

async function fetchAllCatalogProducts(): Promise<WebCatalogProductCard[]> {
  const items: WebCatalogProductCard[] = [];
  let page = 1;
  let totalPages = 1;
  const baseUrl = getApiBaseUrl();

  while (page <= totalPages) {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("page_size", String(PAGE_SIZE));
    params.set("sort", "recommended");
    const endpoint = `${baseUrl}/web/catalog/products?${params.toString()}`;
    const response = await fetch(endpoint, {
      next: { revalidate },
    });

    if (!response.ok) {
      const body = await response.text();
      const error = new Error(`Catalog request failed: ${response.status}`) as FeedFetchError;
      error.endpoint = endpoint;
      error.status = response.status;
      error.responseBody = body;
      throw error;
    }

    const data = (await response.json()) as WebCatalogProductList;
    const currentItems = Array.isArray(data.items) ? data.items : [];
    items.push(...currentItems.map((item) => normalizeCatalogProductCard(baseUrl, item)));
    totalPages = Math.max(1, Math.ceil((data.total || 0) / (data.page_size || PAGE_SIZE)));
    page += 1;
  }

  return items;
}

function buildXmlDocument(products: WebCatalogProductCard[]): string {
  const now = new Date().toUTCString();
  const entries = products.filter(isMetaFeedEligible).map(buildMetaItemXml).join("");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">',
    "<channel>",
    `<title>${escapeXml(FEED_TITLE)}</title>`,
    `<link>${SITE_ORIGIN}</link>`,
    `<description>${escapeXml(FEED_DESCRIPTION)}</description>`,
    `<lastBuildDate>${now}</lastBuildDate>`,
    entries,
    "</channel>",
    "</rss>",
  ].join("");
}

export async function GET() {
  try {
    const products = await fetchAllCatalogProducts();
    const xml = buildXmlDocument(products);

    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    const typed = error as FeedFetchError;
    const message = typed?.message || "Unknown error";
    const endpoint = typed?.endpoint || "";
    const status = typed?.status ? String(typed.status) : "";
    const responseBody = typed?.responseBody || "";
    return new Response(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        "<error>",
        `<message>${escapeXml(message)}</message>`,
        endpoint ? `<endpoint>${escapeXml(endpoint)}</endpoint>` : "",
        status ? `<status>${escapeXml(status)}</status>` : "",
        responseBody ? `<response_body>${escapeXml(responseBody)}</response_body>` : "",
        "</error>",
      ]
        .filter(Boolean)
        .join(""),
      {
      status: 500,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "no-store",
      },
      }
    );
  }
}
