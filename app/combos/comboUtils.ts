export type ComboSortOption = "recommended" | "name_asc" | "name_desc" | "price_asc" | "price_desc";

export type ComboFilterOption = {
  value: string;
  label: string;
  count: number;
};

export type PaginationToken = number | "ellipsis";

export function normalizeComboFilterKey(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function humanizeComboCategoryKey(value: string | null | undefined) {
  const normalized = normalizeComboFilterKey(value || "");
  if (!normalized) return "";
  return normalized.replace(/\b\w/g, (letter) => letter.toLocaleUpperCase("es"));
}

export function buildCombosHref(input: {
  q?: string;
  local_q?: string;
  category?: string[];
  sort?: string;
  min_price?: string;
  max_price?: string;
  page?: string;
  view?: "grid" | "list";
}) {
  const params = new URLSearchParams();

  if (input.q) params.set("q", input.q);
  if (input.local_q) params.set("local_q", input.local_q);
  (input.category || []).forEach((value) => {
    const normalized = value?.trim();
    if (normalized) params.append("category", normalized);
  });
  if (input.sort && input.sort !== "recommended") params.set("sort", input.sort);
  if (input.min_price && Number(input.min_price) > 0) params.set("min_price", input.min_price);
  if (input.max_price && Number(input.max_price) > 0) params.set("max_price", input.max_price);
  if (input.page && Number(input.page) > 1) params.set("page", input.page);
  if (input.view && input.view !== "grid") params.set("view", input.view);

  const query = params.toString();
  return query ? `/combos?${query}` : "/combos";
}

export function buildPaginationTokens(currentPage: number, totalPages: number): PaginationToken[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const clampedCurrent = Math.min(Math.max(currentPage, 1), totalPages);
  const start = Math.max(2, clampedCurrent - 1);
  const end = Math.min(totalPages - 1, clampedCurrent + 1);
  const tokens: PaginationToken[] = [1];

  if (start > 2) {
    tokens.push("ellipsis");
  }

  for (let page = start; page <= end; page += 1) {
    tokens.push(page);
  }

  if (end < totalPages - 1) {
    tokens.push("ellipsis");
  }

  tokens.push(totalPages);
  return tokens;
}
