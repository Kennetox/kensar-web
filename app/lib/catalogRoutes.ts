export function buildCatalogCategoryHref(input: {
  categoryPath?: string | null;
  parentCategoryPath?: string | null;
  categorySegments?: Array<string | null | undefined>;
}) {
  const categorySegments = (input.categorySegments || [])
    .map((segment) => (segment || "").trim().toLowerCase())
    .filter(Boolean);
  if (categorySegments.length > 0) {
    return `/catalogo/categoria/${categorySegments.map((segment) => encodeURIComponent(segment)).join("/")}`;
  }
  const categoryPath = (input.categoryPath || "").trim().toLowerCase();
  if (!categoryPath) return "/catalogo";
  const parentCategoryPath = (input.parentCategoryPath || "").trim().toLowerCase();
  if (parentCategoryPath && parentCategoryPath !== categoryPath) {
    return `/catalogo/categoria/${encodeURIComponent(parentCategoryPath)}/${encodeURIComponent(categoryPath)}`;
  }
  return `/catalogo/categoria/${encodeURIComponent(categoryPath)}`;
}
