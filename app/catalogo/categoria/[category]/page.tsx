import CatalogoPage from "@/app/catalogo/page";

type CategoryCatalogPageProps = {
  params: Promise<{ category: string }>;
  searchParams?: Promise<{
    q?: string;
    brand?: string | string[];
    sort?: string;
    min_price?: string;
    max_price?: string;
    page?: string;
  }>;
};

export default async function CategoryCatalogPage({ params, searchParams }: CategoryCatalogPageProps) {
  const route = await params;
  const query = (await searchParams) || {};
  return CatalogoPage({
    searchParams: Promise.resolve({
      ...query,
      category: route.category,
    }),
  });
}
