import { NextResponse } from "next/server";
import { getCatalogProducts } from "@/app/lib/metrikCatalog";

function normalizeTerm(value: string | null | undefined): string {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function buildSearchScore(
  q: string,
  product: {
    name: string;
    brand: string | null;
    sku: string | null;
  }
): number {
  const term = normalizeTerm(q);
  const name = normalizeTerm(product.name);
  const brand = normalizeTerm(product.brand);
  const sku = normalizeTerm(product.sku);

  if (!term) return 0;

  let score = 0;
  if (name.startsWith(term)) score += 8;
  if (name.includes(term)) score += 5;
  if (brand.startsWith(term)) score += 4;
  if (brand.includes(term)) score += 3;
  if (sku.startsWith(term)) score += 6;
  if (sku.includes(term)) score += 4;
  return score;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();

    if (q.length < 2) {
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    const rows = await getCatalogProducts({ q, page: 1 });
    const ranked = rows.items
      .map((item) => ({
        item,
        score: buildSearchScore(q, {
          name: item.name,
          brand: item.brand,
          sku: item.sku,
        }),
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.item.name.localeCompare(b.item.name, "es");
      })
      .slice(0, 6);

    const items = ranked.map(({ item }) => ({
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
