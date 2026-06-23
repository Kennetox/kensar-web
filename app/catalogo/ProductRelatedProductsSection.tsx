import ProductHorizontalDragScroll from "@/app/catalogo/ProductHorizontalDragScroll";
import CatalogProductCard from "@/app/catalogo/CatalogProductCard";
import { getCatalogProducts } from "@/app/lib/metrikCatalog";

type ProductRelatedProductsSectionProps = {
  currentProductId: number;
  currentProductSlug: string;
  categoryPath?: string | null;
  brand?: string | null;
};

async function loadRelatedProducts({
  currentProductId,
  currentProductSlug,
  categoryPath,
  brand,
}: ProductRelatedProductsSectionProps) {
  const normalizedCategoryPath = categoryPath?.trim() || "";
  const normalizedBrand = brand?.trim() || "";

  if (!normalizedCategoryPath && !normalizedBrand) {
    return [];
  }

  const primaryResponse = normalizedCategoryPath
    ? await getCatalogProducts({
        category: normalizedCategoryPath,
        sort: "recommended",
        page_size: 6,
      }).catch(() => null)
    : await getCatalogProducts({
        brand: normalizedBrand,
        sort: "recommended",
        page_size: 6,
      }).catch(() => null);

  const primaryItems = primaryResponse?.items || [];
  const primarySuggestions = primaryItems.filter(
    (item) => item.id !== currentProductId && item.slug !== currentProductSlug
  );

  if (primarySuggestions.length >= 4 || !normalizedBrand || normalizedBrand === normalizedCategoryPath) {
    return primarySuggestions.slice(0, 5);
  }

  const secondaryResponse = await getCatalogProducts({
    brand: normalizedBrand,
    sort: "recommended",
    page_size: 6,
  }).catch(() => null);

  const mergedSuggestions = [...primarySuggestions];
  for (const item of secondaryResponse?.items || []) {
    if (item.id === currentProductId || item.slug === currentProductSlug) continue;
    if (mergedSuggestions.some((suggestion) => suggestion.id === item.id || suggestion.slug === item.slug)) {
      continue;
    }
    mergedSuggestions.push(item);
    if (mergedSuggestions.length >= 5) break;
  }

  return mergedSuggestions.slice(0, 5);
}

export default async function ProductRelatedProductsSection(props: ProductRelatedProductsSectionProps) {
  const suggestions = await loadRelatedProducts(props);

  if (!suggestions.length) {
    return null;
  }

  return (
    <section className="product-related-section product-related-mobile-scope" aria-labelledby="related-products-title">
      <h2 id="related-products-title">También te podría interesar</h2>
      <ProductHorizontalDragScroll className="catalog-product-grid storefront-grid product-related-grid product-related-mobile-carousel">
        {suggestions.map((product) => (
          <CatalogProductCard key={product.id} product={product} />
        ))}
      </ProductHorizontalDragScroll>
    </section>
  );
}
