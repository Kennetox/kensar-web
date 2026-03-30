export type WebCatalogCategory = {
  id: string;
  path: string;
  name: string;
  image_url: string | null;
  tile_color: string | null;
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
  category_path: string | null;
  category_name: string | null;
  image_url: string | null;
  image_thumb_url: string | null;
  price_mode: "visible" | "consultar";
  price: number | null;
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
  short_description: string | null;
  long_description: string | null;
  brand: string | null;
  category_path: string | null;
  category_name: string | null;
  image_url: string | null;
  image_thumb_url: string | null;
  gallery: string[];
  price_mode: "visible" | "consultar";
  price: number | null;
  compare_price: number | null;
  stock_status: "in_stock" | "low_stock" | "out_of_stock" | "service" | "consultar";
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
  const response = await fetchCatalog<{ items: WebCatalogCategory[] }>("/web/catalog/categories");
  return response.items;
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

  return fetchCatalog<WebCatalogProductList>("/web/catalog/products", params);
}

export async function getCatalogProduct(slug: string) {
  return fetchCatalogOptional<WebCatalogProductDetail>(`/web/catalog/products/${slug}`);
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
