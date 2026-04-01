import { NextResponse } from "next/server";
import { getCatalogProducts } from "@/app/lib/metrikCatalog";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();

    if (q.length < 2) {
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    const rows = await getCatalogProducts({ q, page: 1 });
    const items = rows.items.slice(0, 6).map((item) => ({
      id: item.id,
      slug: item.slug,
      name: item.name,
      price: item.price,
      compare_price: item.compare_price,
      brand: item.brand,
      image_url: item.image_url,
      image_thumb_url: item.image_thumb_url,
    }));

    return NextResponse.json({ items }, { status: 200 });
  } catch {
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}

