export type WebCatalogCategory = {
  id: string;
  path: string;
  name: string;
  parent_path?: string | null;
  level?: number;
  has_children?: boolean;
  image_url: string | null;
  tile_color: string | null;
  is_active?: boolean;
  home_featured: boolean;
  home_featured_order: number;
  product_count: number;
};

export type WebCatalogHomeSliderLinkType =
  | "sin_link"
  | "catalogo"
  | "categoria"
  | "subcategoria"
  | "personalizacion"
  | "contacto"
  | "url_interna";

export type WebCatalogHomeSlider = {
  slot: number;
  image_url: string | null;
  alt_text: string | null;
  cta_label: string | null;
  cta_x_percent: number;
  cta_y_percent: number;
  link_type: WebCatalogHomeSliderLinkType;
  link_value: string | null;
  sort_order: number;
};

export type WebCatalogFilterOption = {
  value: string;
  label: string;
  count: number;
  level?: number;
  parent_value?: string | null;
};

export type WebCatalogProductCard = {
  id: number;
  sku: string | null;
  slug: string;
  name: string;
  short_description: string | null;
  long_description?: string | null;
  brand: string | null;
  group_name: string | null;
  category_path: string | null;
  category_name: string | null;
  image_url: string | null;
  image_thumb_url: string | null;
  gallery: string[];
  badge_text?: string | null;
  price_mode: "visible" | "consultar";
  price: number | null;
  compare_price: number | null;
  web_price_source?: "base" | "fixed" | "discount_percent" | null;
  web_price_value?: number | string | null;
  stock_status: "in_stock" | "low_stock" | "out_of_stock" | "service" | "consultar";
  featured: boolean;
};

export type WebCatalogProductList = {
  items: WebCatalogProductCard[];
  total: number;
  page: number;
  page_size: number;
  filters: {
    categories: WebCatalogFilterOption[];
    brands: WebCatalogFilterOption[];
    price_min?: number | null;
    price_max?: number | null;
  };
};

export type WebCatalogBestSellerList = {
  items: WebCatalogProductCard[];
  updated_at: string;
};

export type WebCatalogProductDetail = {
  id: number;
  sku: string | null;
  slug: string;
  name: string;
  badge_text: string | null;
  featured?: boolean;
  short_description: string | null;
  long_description: string | null;
  brand: string | null;
  group_name: string | null;
  category_path: string | null;
  category_name: string | null;
  image_url: string | null;
  image_thumb_url: string | null;
  gallery: string[];
  price_mode: "visible" | "consultar";
  price: number | null;
  compare_price: number | null;
  stock_status: "in_stock" | "low_stock" | "out_of_stock" | "service" | "consultar";
  warranty_text?: string | null;
  specs: Record<string, string>;
  whatsapp_message: string | null;
};

export type BackofficeCatalogProduct = {
  id: number;
  sku: string | null;
  name: string;
  web_name?: string | null;
  web_slug?: string | null;
  image_url?: string | null;
  image_thumb_url?: string | null;
  brand?: string | null;
  service?: boolean;
  active?: boolean;
  price?: number | null;
  web_compare_price?: number | null;
};

function getApiBaseUrl() {
  const baseUrl = process.env.METRIK_API_BASE_URL?.trim();
  if (!baseUrl) {
    throw new Error("Missing METRIK_API_BASE_URL");
  }
  return baseUrl.replace(/\/$/, "");
}

const CATALOG_REVALIDATE_SECONDS = 60;

function resolveCatalogAssetUrl(baseUrl: string, value: string | null): string | null {
  if (!value) return null;

  try {
    return new URL(value, `${baseUrl}/`).toString();
  } catch {
    return value;
  }
}

function normalizeCatalogCategory(baseUrl: string, item: WebCatalogCategory): WebCatalogCategory {
  return {
    ...item,
    image_url: resolveCatalogAssetUrl(baseUrl, item.image_url),
  };
}

function normalizeCatalogProductCard(
  baseUrl: string,
  item: WebCatalogProductCard
): WebCatalogProductCard {
  const itemWithLegacyBadge = item as WebCatalogProductCard & {
    web_badge_text?: string | null;
    web_short_description?: string | null;
    web_long_description?: string | null;
  };
  return {
    ...item,
    short_description: item.short_description ?? itemWithLegacyBadge.web_short_description ?? null,
    long_description: item.long_description ?? itemWithLegacyBadge.web_long_description ?? null,
    badge_text: item.badge_text ?? itemWithLegacyBadge.web_badge_text ?? null,
    image_url: resolveCatalogAssetUrl(baseUrl, item.image_url),
    image_thumb_url: resolveCatalogAssetUrl(baseUrl, item.image_thumb_url),
    gallery: item.gallery.map((image) => resolveCatalogAssetUrl(baseUrl, image) || image),
  };
}

function normalizeCatalogProductDetail(
  baseUrl: string,
  item: WebCatalogProductDetail
): WebCatalogProductDetail {
  const detailWithLegacyWarranty = item as WebCatalogProductDetail & {
    web_warranty_text?: string | null;
  };
  return {
    ...item,
    warranty_text: item.warranty_text ?? detailWithLegacyWarranty.web_warranty_text ?? null,
    image_url: resolveCatalogAssetUrl(baseUrl, item.image_url),
    image_thumb_url: resolveCatalogAssetUrl(baseUrl, item.image_thumb_url),
    gallery: item.gallery.map((image) => resolveCatalogAssetUrl(baseUrl, image) || image),
  };
}

async function fetchCatalog<T>(path: string, params?: URLSearchParams): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const query = params && params.toString() ? `?${params.toString()}` : "";
  const response = await fetch(`${baseUrl}${path}${query}`, {
    next: { revalidate: CATALOG_REVALIDATE_SECONDS },
  });

  if (!response.ok) {
    throw new Error(`Catalog request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function fetchCatalogOptional<T>(path: string): Promise<T | null> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, {
    next: { revalidate: CATALOG_REVALIDATE_SECONDS },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Catalog request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getCatalogCategories() {
  const baseUrl = getApiBaseUrl();
  const response = await fetchCatalog<{ items: WebCatalogCategory[] }>("/web/catalog/categories");
  return response.items.map((item) => normalizeCatalogCategory(baseUrl, item));
}

export async function getHomeSliders() {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/web/catalog/home-sliders`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Catalog request failed: ${response.status}`);
  }
  const data = (await response.json()) as { items: WebCatalogHomeSlider[] };
  return data.items
    .slice()
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || (a.slot || 0) - (b.slot || 0))
    .map((item) => ({
      ...item,
      image_url: resolveCatalogAssetUrl(baseUrl, item.image_url),
    }));
}

export async function getCatalogProducts(input: {
  q?: string;
  category?: string;
  brand?: string | string[];
  sort?: "recommended" | "name_asc" | "name_desc" | "price_asc" | "price_desc";
  min_price?: number;
  max_price?: number;
  page?: number;
  page_size?: number;
}) {
  const params = new URLSearchParams();

  if (input.q) params.set("q", input.q);
  if (input.category) params.set("category", input.category);
  if (Array.isArray(input.brand)) {
    input.brand.forEach((value) => {
      const normalized = value?.trim();
      if (normalized) params.append("brand", normalized);
    });
  } else if (input.brand) {
    params.append("brand", input.brand);
  }
  if (input.sort) params.set("sort", input.sort);
  if (typeof input.min_price === "number" && Number.isFinite(input.min_price)) {
    params.set("min_price", String(Math.max(0, input.min_price)));
  }
  if (typeof input.max_price === "number" && Number.isFinite(input.max_price)) {
    params.set("max_price", String(Math.max(0, input.max_price)));
  }
  if (input.page && input.page > 1) params.set("page", String(input.page));
  if (input.page_size && input.page_size > 0) params.set("page_size", String(input.page_size));

  const baseUrl = getApiBaseUrl();
  const response = await fetchCatalog<WebCatalogProductList>("/web/catalog/products", params);
  return {
    ...response,
    items: response.items.map((item) => normalizeCatalogProductCard(baseUrl, item)),
  };
}

export async function getCatalogBestSellers(input?: { limit?: number; days?: number }) {
  const params = new URLSearchParams();
  if (input?.limit && input.limit > 0) params.set("limit", String(input.limit));
  if (input?.days && input.days > 0) params.set("days", String(input.days));
  const baseUrl = getApiBaseUrl();
  const response = await fetchCatalog<WebCatalogBestSellerList>("/web/catalog/best-sellers", params);
  return {
    ...response,
    items: response.items.map((item) => normalizeCatalogProductCard(baseUrl, item)),
  };
}

export async function getCatalogProduct(slug: string) {
  const baseUrl = getApiBaseUrl();
  const response = await fetchCatalogOptional<WebCatalogProductDetail>(`/web/catalog/products/${slug}`);
  return response ? normalizeCatalogProductDetail(baseUrl, response) : null;
}

export async function getPersonalizationServiceBySku(sku: string) {
  const params = new URLSearchParams();
  params.set("sku", sku);
  const baseUrl = getApiBaseUrl();
  const response = await fetchCatalogOptional<BackofficeCatalogProduct>(
    `/web/catalog/personalization/service-by-sku?${params.toString()}`
  );
  if (!response) return null;
  return {
    ...response,
    image_url: resolveCatalogAssetUrl(baseUrl, response.image_url || null),
    image_thumb_url: resolveCatalogAssetUrl(baseUrl, response.image_thumb_url || null),
  };
}

export function formatCatalogPrice(value: number | null) {
  if (value === null) {
    return "Consultar precio";
  }

  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function getStockLabel(status: WebCatalogProductCard["stock_status"]) {
  switch (status) {
    case "in_stock":
      return "Disponible";
    case "low_stock":
      return "Pocas unidades";
    case "out_of_stock":
      return "Sin stock";
    case "service":
      return "Servicio";
    default:
      return "Consultar";
  }
}
