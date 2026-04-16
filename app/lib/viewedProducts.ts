export type ViewedProductEntry = {
  id: number;
  slug: string;
  name: string;
  image_url: string | null;
  price: number | null;
  compare_price: number | null;
  brand: string | null;
  viewed_at: string;
};

export const VIEWED_PRODUCTS_MAX_ITEMS = 40;

export function getViewedProductsStorageKey(customerId: number) {
  return `kensar_web_viewed_products_${customerId}`;
}
