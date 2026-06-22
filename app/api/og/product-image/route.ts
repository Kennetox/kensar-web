import { NextResponse } from "next/server";
import { getCatalogProduct } from "@/app/lib/metrikCatalog";

export const revalidate = 300;

function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://kensarelectronic.com").replace(/\/+$/, "");
}

function resolveFallbackLogoUrl() {
  return `${getSiteUrl()}/branding/kensar-logo.png`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = (searchParams.get("slug") || "").trim();
  if (!slug) {
    return NextResponse.redirect(resolveFallbackLogoUrl(), 302);
  }

  const product = await getCatalogProduct(slug).catch(() => null);
  const imageUrl = (product?.image_thumb_url || product?.image_url || "").trim();

  if (!imageUrl) {
    return NextResponse.redirect(resolveFallbackLogoUrl(), 302);
  }

  return NextResponse.redirect(imageUrl, 302);
}
