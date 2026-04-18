export function buildCatalogCategoryHref(input: {
  categoryPath?: string | null;
  parentCategoryPath?: string | null;
}) {
  const categoryPath = (input.categoryPath || "").trim().toLowerCase();
  if (!categoryPath) return "/catalogo";
  const parentCategoryPath = (input.parentCategoryPath || "").trim().toLowerCase();
  if (parentCategoryPath && parentCategoryPath !== categoryPath) {
    return `/catalogo/categoria/${encodeURIComponent(parentCategoryPath)}/${encodeURIComponent(categoryPath)}`;
  }
  return `/catalogo/categoria/${encodeURIComponent(categoryPath)}`;
}
