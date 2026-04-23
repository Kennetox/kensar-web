import { NextResponse } from "next/server";
import {
  getCatalogProduct,
  getCatalogProducts,
  type WebCatalogProductCard,
} from "@/app/lib/metrikCatalog";

type CheckoutItemsPayload = {
  base_slug?: string;
  personalization_sku?: string;
};

type CheckoutItemResponse = {
  id: number;
  name: string;
  slug: string;
  sku: string | null;
  image_url: string | null;
  brand: string | null;
  stock_status: WebCatalogProductCard["stock_status"];
  price: number;
  compare_price: number | null;
};

function mapCatalogCardToCheckoutItem(product: WebCatalogProductCard): CheckoutItemResponse {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    image_url: product.image_thumb_url || product.image_url,
    brand: product.brand,
    stock_status: product.stock_status,
    price: Number(product.price) || 0,
    compare_price: typeof product.compare_price === "number" ? product.compare_price : null,
  };
}

function parsePositiveIntEnv(value: string | undefined): number | null {
  const raw = (value || "").trim();
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function parseNonNegativeNumberEnv(value: string | undefined): number | null {
  const raw = (value || "").trim();
  if (!raw) return null;
  const normalized = raw.replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

function resolvePersonalizationFallbackBySku(sku: string): CheckoutItemResponse | null {
  if (sku === "3740") {
    const productId = parsePositiveIntEnv(process.env.PERSONALIZA_SERVICE_CAMPANA_PRODUCT_ID);
    if (!productId) return null;
    const unitPrice =
      parseNonNegativeNumberEnv(process.env.PERSONALIZA_SERVICE_CAMPANA_PRICE) ?? 20000;
    return {
      id: productId,
      name: (process.env.PERSONALIZA_SERVICE_CAMPANA_PRODUCT_NAME || "Personalización de Campana").trim(),
      slug: (process.env.PERSONALIZA_SERVICE_CAMPANA_PRODUCT_SLUG || "personalizacion-de-campana").trim(),
      sku,
      image_url: null,
      brand: null,
      stock_status: "service",
      price: unitPrice,
      compare_price: null,
    };
  }
  if (sku === "3741") {
    const productId = parsePositiveIntEnv(process.env.PERSONALIZA_SERVICE_GUIRO_PRODUCT_ID);
    if (!productId) return null;
    const unitPrice =
      parseNonNegativeNumberEnv(process.env.PERSONALIZA_SERVICE_GUIRO_PRICE) ?? 20000;
    return {
      id: productId,
      name: (process.env.PERSONALIZA_SERVICE_GUIRO_PRODUCT_NAME || "Personalización de Guiro").trim(),
      slug: (process.env.PERSONALIZA_SERVICE_GUIRO_PRODUCT_SLUG || "personalizacion-de-guiro").trim(),
      sku,
      image_url: null,
      brand: null,
      stock_status: "service",
      price: unitPrice,
      compare_price: null,
    };
  }
  return null;
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as CheckoutItemsPayload;
  const baseSlug = (payload.base_slug || "").trim();
  const personalizationSku = (payload.personalization_sku || "").trim();

  if (!baseSlug || !personalizationSku) {
    return NextResponse.json(
      { detail: "Faltan datos para resolver los productos de personalización." },
      { status: 400 }
    );
  }

  const [baseProduct, searchBySku] = await Promise.all([
    getCatalogProduct(baseSlug),
    getCatalogProducts({ q: personalizationSku, page_size: 60 }),
  ]);

  if (!baseProduct) {
    return NextResponse.json(
      { detail: `No encontramos el producto base (${baseSlug}) en catálogo web.` },
      { status: 404 }
    );
  }

  const personalizationProduct =
    searchBySku.items.find((item) => (item.sku || "").trim() === personalizationSku) || null;

  const fallbackPersonalization = resolvePersonalizationFallbackBySku(personalizationSku);

  if (!personalizationProduct && !fallbackPersonalization) {
    return NextResponse.json(
      {
        detail:
          `No encontramos el servicio de personalización SKU ${personalizationSku} en catálogo web. ` +
          "Configura su product_id en variables de entorno del frontend.",
      },
      { status: 404 }
    );
  }

  const base: CheckoutItemResponse = {
    id: baseProduct.id,
    name: baseProduct.name,
    slug: baseProduct.slug,
    sku: baseProduct.sku,
    image_url: baseProduct.image_thumb_url || baseProduct.image_url,
    brand: baseProduct.brand,
    stock_status: baseProduct.stock_status,
    price: Number(baseProduct.price) || 0,
    compare_price: typeof baseProduct.compare_price === "number" ? baseProduct.compare_price : null,
  };

  return NextResponse.json({
    base,
    personalization: personalizationProduct
      ? mapCatalogCardToCheckoutItem(personalizationProduct)
      : fallbackPersonalization!,
  });
}
