import { NextResponse } from "next/server";
import { getCatalogCategories } from "@/app/lib/metrikCatalog";

const FALLBACK_CATEGORIES = [
  { path: "audio-profesional", name: "Audio / Sonido", product_count: 0 },
  { path: "camaras", name: "Seguridad", product_count: 0 },
  { path: "instrumentos", name: "Instrumentos", product_count: 0 },
  { path: "accesorios", name: "Accesorios", product_count: 0 },
  { path: "tecnologia", name: "Hogar y entretenimiento", product_count: 0 },
];

export async function GET() {
  try {
    const categories = await getCatalogCategories();
    const items = categories
      .filter((category) => category.path)
      .sort((a, b) => b.product_count - a.product_count)
      .slice(0, 8)
      .map((category) => ({
        path: category.path,
        name: category.name,
        product_count: category.product_count,
      }));

    if (!items.length) {
      return NextResponse.json({ items: FALLBACK_CATEGORIES }, { status: 200 });
    }

    return NextResponse.json({ items }, { status: 200 });
  } catch {
    return NextResponse.json({ items: FALLBACK_CATEGORIES }, { status: 200 });
  }
}
