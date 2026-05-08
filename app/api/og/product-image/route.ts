import { NextResponse } from "next/server";
import { getCatalogProduct } from "@/app/lib/metrikCatalog";

export const revalidate = 300;

function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://kensarelectronic.com").replace(/\/+$/, "");
}

function resolveFallbackLogoUrl() {
  return `${getSiteUrl()}/branding/kensar-logo.png`;
}

async function fetchImageAsResponse(imageUrl: string): Promise<Response | null> {
  try {
    const upstream = await fetch(imageUrl, {
      next: { revalidate },
    });
    if (!upstream.ok) return null;
    const contentType = upstream.headers.get("content-type") || "image/png";
    const bytes = await upstream.arrayBuffer();
    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
      },
    });
  } catch {
    return null;
  }
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

  const proxied = await fetchImageAsResponse(imageUrl);
  if (proxied) return proxied;

  return NextResponse.redirect(resolveFallbackLogoUrl(), 302);
}
