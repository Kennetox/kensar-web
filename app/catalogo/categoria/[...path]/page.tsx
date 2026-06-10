import { notFound } from "next/navigation";
import CatalogoPage from "@/app/catalogo/page";
import { getCatalogCategories } from "@/app/lib/metrikCatalog";
import { resolveCatalogCategoryBySegments } from "@/app/lib/catalogCategoryTree";

type CategoryCatalogPageProps = {
  params: Promise<{ path: string[] }>;
  searchParams?: Promise<{
    q?: string;
    local_q?: string;
    brand?: string | string[];
    sort?: string;
    min_price?: string;
    max_price?: string;
    page?: string;
    view?: string;
  }>;
};

export default async function CategoryCatalogPage({ params, searchParams }: CategoryCatalogPageProps) {
  const route = await params;
  const pathSegments = Array.isArray(route.path) ? route.path.map((segment) => segment.trim()).filter(Boolean) : [];
  if (!pathSegments.length) {
    notFound();
  }

  const categories = await getCatalogCategories();
  const resolved = resolveCatalogCategoryBySegments(categories, pathSegments);
  if (!resolved) {
    notFound();
  }

  const query = (await searchParams) || {};
  return CatalogoPage({
    searchParams: Promise.resolve({
      ...query,
      category: resolved.category.path,
    }),
    categoryPathSegments: resolved.segments,
  });
}
