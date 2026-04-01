type JsonObject = Record<string, unknown>;

function getApiBaseUrl(): string | null {
  const value = process.env.METRIK_API_BASE_URL?.trim();
  if (!value) return null;
  return value.replace(/\/$/, "");
}

function resolveAssetUrl(baseUrl: string | null, value: unknown): unknown {
  if (typeof value !== "string" || !value.trim()) return value;
  if (!baseUrl) return value;

  try {
    return new URL(value, `${baseUrl}/`).toString();
  } catch {
    return value;
  }
}

function normalizeCartItem(baseUrl: string | null, item: unknown): unknown {
  if (!item || typeof item !== "object") return item;
  const payload = item as JsonObject;
  return {
    ...payload,
    image_url: resolveAssetUrl(baseUrl, payload.image_url),
  };
}

export function normalizeCartPayload(body: unknown): unknown {
  if (!body || typeof body !== "object") return body;
  const payload = body as JsonObject;
  if (!Array.isArray(payload.items)) return body;

  const baseUrl = getApiBaseUrl();
  return {
    ...payload,
    items: payload.items.map((item) => normalizeCartItem(baseUrl, item)),
  };
}
