import type { MetadataRoute } from "next";
import { buildCatalogCategoryHref } from "@/app/lib/catalogRoutes";
import {
  buildCatalogCategoryHrefFromSegments,
  buildCatalogCategoryMap,
  buildCatalogCategoryTrailFromKey,
} from "@/app/lib/catalogCategoryTree";
import { getCatalogCategories, getCatalogProducts, type WebCatalogProductCard } from "@/app/lib/metrikCatalog";

export const revalidate = 600;

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://kensarelectronic.com").replace(/\/+$/, "");
const SITEMAP_PAGE_SIZE = 60;

function toAbsoluteUrl(pathname: string) {
  return new URL(pathname, `${SITE_URL}/`).toString();
}

function normalizeBrandKey(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function fetchAllPublishedProducts(): Promise<WebCatalogProductCard[]> {
  const items: WebCatalogProductCard[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const response = await getCatalogProducts({
      page,
      page_size: SITEMAP_PAGE_SIZE,
      sort: "recommended",
    });

    items.push(...response.items);
    totalPages = Math.max(1, Math.ceil((response.total || 0) / Math.max(1, response.page_size || SITEMAP_PAGE_SIZE)));
    page += 1;
  }

  return items;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    {
      url: toAbsoluteUrl("/"),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];

  let categories: Awaited<ReturnType<typeof getCatalogCategories>> = [];
  let products: WebCatalogProductCard[] = [];
  try {
    [categories, products] = await Promise.all([getCatalogCategories(), fetchAllPublishedProducts()]);
  } catch {
    return entries;
  }

  const categoryMap = buildCatalogCategoryMap(categories);

  const categoryEntries = categories
    .filter((category) => category.path?.trim())
    .map((category) => ({
      url: toAbsoluteUrl(
        buildCatalogCategoryTrailFromKey(category.path, categoryMap)?.segments.length
          ? buildCatalogCategoryHrefFromSegments(
              buildCatalogCategoryTrailFromKey(category.path, categoryMap)?.segments || [category.path]
            )
          : buildCatalogCategoryHref({
              categoryPath: category.path,
              parentCategoryPath: category.parent_path,
            })
      ),
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: category.parent_path ? 0.65 : 0.75,
    }));

  const brandMap = new Map<string, string>();
  for (const product of products) {
    const brand = (product.brand || "").trim();
    if (!brand) continue;
    const key = normalizeBrandKey(brand);
    if (!key || brandMap.has(key)) continue;
    brandMap.set(key, brand);
  }

  const brandEntries = Array.from(brandMap.values()).map((brand) => ({
    url: toAbsoluteUrl(`/catalogo?brand=${encodeURIComponent(brand)}`),
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  const productEntries = products
    .filter((product) => product.slug?.trim())
    .map((product) => ({
      url: toAbsoluteUrl(`/catalogo/${encodeURIComponent(product.slug)}`),
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: product.featured ? 0.85 : 0.8,
    }));

  entries.push(...categoryEntries, ...brandEntries, ...productEntries);
  return entries;
}
