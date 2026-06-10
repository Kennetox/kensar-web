type CatalogCategoryLike = {
  id?: string | number;
  path: string;
  parent_path?: string | null;
  name?: string;
};

export type CatalogCategoryTrailNode<T extends CatalogCategoryLike = CatalogCategoryLike> = {
  category: T;
  segments: string[];
  trail: T[];
};

function normalizeSegment(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

export function buildCatalogCategoryMap<T extends CatalogCategoryLike>(categories: T[]) {
  return categories.reduce<Record<string, T>>((acc, category) => {
    const key = normalizeSegment(category.path);
    if (!key) return acc;
    acc[key] = category;
    return acc;
  }, {});
}

export function buildCatalogCategoryChildrenMap<T extends CatalogCategoryLike>(categories: T[]) {
  return categories.reduce<Record<string, T[]>>((acc, category) => {
    const parentKey = normalizeSegment(category.parent_path);
    if (!parentKey) return acc;
    if (!acc[parentKey]) acc[parentKey] = [];
    acc[parentKey].push(category);
    return acc;
  }, {});
}

export function getCatalogCategoryTrail<T extends CatalogCategoryLike>(
  category: T,
  categoryMap: Record<string, T>
): CatalogCategoryTrailNode<T> {
  const visited = new Set<string>();
  const trail: T[] = [];
  let current: T | undefined = category;

  while (current) {
    const currentKey = normalizeSegment(current.path);
    if (!currentKey || visited.has(currentKey)) break;
    visited.add(currentKey);
    trail.push(current);

    const parentKey = normalizeSegment(current.parent_path);
    if (!parentKey) break;
    current = categoryMap[parentKey];
  }

  const orderedTrail = trail.reverse();
  return {
    category: orderedTrail[orderedTrail.length - 1] || category,
    segments: orderedTrail.map((item) => item.path.trim()).filter(Boolean),
    trail: orderedTrail,
  };
}

export function buildCatalogCategoryTrailFromKey(
  categoryKey: string | null | undefined,
  categoryMap: Record<string, CatalogCategoryLike>
): CatalogCategoryTrailNode | null {
  const normalizedKey = normalizeSegment(categoryKey);
  if (!normalizedKey) return null;
  const category = categoryMap[normalizedKey];
  if (!category) return null;
  return getCatalogCategoryTrail(category, categoryMap);
}

export function resolveCatalogCategoryBySegments(
  categories: CatalogCategoryLike[],
  segments: string[]
): CatalogCategoryTrailNode | null {
  const normalizedSegments = segments.map((segment) => normalizeSegment(segment)).filter(Boolean);
  if (!normalizedSegments.length) return null;

  const childrenMap = buildCatalogCategoryChildrenMap(categories);
  const roots = categories.filter((category) => !normalizeSegment(category.parent_path));
  let currentLevel = roots;
  const trail: CatalogCategoryLike[] = [];

  for (const segment of normalizedSegments) {
    const nextCategory = currentLevel.find((category) => normalizeSegment(category.path) === segment);
    if (!nextCategory) return null;
    trail.push(nextCategory);
    currentLevel = childrenMap[normalizeSegment(nextCategory.path)] || [];
  }

  return {
    category: trail[trail.length - 1],
    segments: trail.map((item) => item.path.trim()).filter(Boolean),
    trail,
  };
}

export function buildCatalogCategoryHrefFromSegments(segments: string[]) {
  const normalizedSegments = segments.map((segment) => normalizeSegment(segment)).filter(Boolean);
  if (!normalizedSegments.length) return "/catalogo";
  return `/catalogo/categoria/${normalizedSegments.map((segment) => encodeURIComponent(segment)).join("/")}`;
}

export function normalizeCatalogCategorySegment(value: string | null | undefined) {
  return normalizeSegment(value);
}
