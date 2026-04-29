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
  if (!personalizationProduct) {
    return NextResponse.json(
      {
        detail:
          `No encontramos el servicio de personalización SKU ${personalizationSku} en catálogo web. ` +
          "Configura y publica correctamente el servicio en catálogo web.",
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
    personalization: mapCatalogCardToCheckoutItem(personalizationProduct),
  });
}
