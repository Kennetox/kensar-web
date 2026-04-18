import CatalogoPage from "@/app/catalogo/page";

type SubcategoryCatalogPageProps = {
  params: Promise<{ category: string; subcategory: string }>;
  searchParams?: Promise<{
    q?: string;
    brand?: string | string[];
    sort?: string;
    min_price?: string;
    max_price?: string;
    page?: string;
  }>;
};

export default async function SubcategoryCatalogPage({
  params,
  searchParams,
}: SubcategoryCatalogPageProps) {
  const route = await params;
  const parentCategory = route.category;
  const query = (await searchParams) || {};
  const selectedCategory = route.subcategory || parentCategory;
  return CatalogoPage({
    searchParams: Promise.resolve({
      ...query,
      category: selectedCategory,
    }),
  });
}
