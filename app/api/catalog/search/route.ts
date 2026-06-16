import { NextResponse } from "next/server";
import { getCatalogCombos, getCatalogProducts } from "@/app/lib/metrikCatalog";

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

function buildComboSearchScore(
  q: string,
  combo: {
    name: string;
    badge_text: string | null;
    short_description: string | null;
    category_key: string | null;
    items: Array<{ product_name: string | null; product_brand: string | null }>;
  }
): number {
  const term = normalizeTerm(q);
  const name = normalizeTerm(combo.name);
  const badge = normalizeTerm(combo.badge_text);
  const description = normalizeTerm(combo.short_description);
  const category = normalizeTerm(combo.category_key);
  const itemNames = normalizeTerm(combo.items.map((item) => item.product_name || "").join(" "));
  const itemBrands = normalizeTerm(combo.items.map((item) => item.product_brand || "").join(" "));

  if (!term) return 0;

  let score = 0;
  if (name.startsWith(term)) score += 8;
  if (name.includes(term)) score += 5;
  if (badge.startsWith(term)) score += 4;
  if (badge.includes(term)) score += 3;
  if (description.includes(term)) score += 2;
  if (category.includes(term)) score += 3;
  if (itemNames.includes(term)) score += 4;
  if (itemBrands.includes(term)) score += 2;
  return score;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();

    if (q.length < 2) {
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    const [productRows, comboRows] = await Promise.all([
      getCatalogProducts({ q, page: 1, page_size: 10 }),
      getCatalogCombos({ q }),
    ]);

    const rankedProducts = productRows.items
      .map((item) => ({
        kind: "product" as const,
        item,
        score: buildSearchScore(q, {
          name: item.name,
          brand: item.brand,
          sku: item.sku,
        }),
      }))
      .filter((entry) => entry.score > 0);

    const rankedCombos = comboRows
      .map((item) => ({
        kind: "combo" as const,
        item,
        score: buildComboSearchScore(q, {
          name: item.name,
          badge_text: item.badge_text,
          short_description: item.short_description,
          category_key: item.category_key,
          items: item.items,
        }),
      }))
      .filter((entry) => entry.score > 0);

    const ranked = [...rankedProducts, ...rankedCombos]
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.item.name.localeCompare(b.item.name, "es");
      })
      .slice(0, 6);

    const items = ranked.map(({ kind, item }) => ({
      kind,
      id: item.id,
      slug: item.slug,
      name: item.name,
      price: item.price,
      compare_price: item.compare_price,
      brand: kind === "combo" ? "Combo" : item.brand,
      image_url: item.image_url,
      image_thumb_url: item.image_thumb_url,
    }));

    return NextResponse.json({ items }, { status: 200 });
  } catch {
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}
