export type WebCatalogCategory = {
  id: string;
  path: string;
  name: string;
  image_url: string | null;
  tile_color: string | null;
  is_active?: boolean;
  home_featured: boolean;
  home_featured_order: number;
  product_count: number;
};

export type WebCatalogFilterOption = {
  value: string;
  label: string;
  count: number;
};

export type WebCatalogProductCard = {
  id: number;
  sku: string | null;
  slug: string;
  name: string;
  short_description: string | null;
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
  };
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

function getApiBaseUrl() {
  const baseUrl = process.env.METRIK_API_BASE_URL?.trim();
  if (!baseUrl) {
    throw new Error("Missing METRIK_API_BASE_URL");
  }
  return baseUrl.replace(/\/$/, "");
}

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
  };
  return {
    ...item,
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
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Catalog request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function fetchCatalogOptional<T>(path: string): Promise<T | null> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, {
    cache: "no-store",
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

export async function getCatalogProducts(input: {
  q?: string;
  category?: string;
  brand?: string;
  page?: number;
}) {
  const params = new URLSearchParams();

  if (input.q) params.set("q", input.q);
  if (input.category) params.set("category", input.category);
  if (input.brand) params.set("brand", input.brand);
  if (input.page && input.page > 1) params.set("page", String(input.page));

  const baseUrl = getApiBaseUrl();
  const response = await fetchCatalog<WebCatalogProductList>("/web/catalog/products", params);
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
