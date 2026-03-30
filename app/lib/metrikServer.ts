import "server-only";

const WEB_CUSTOMER_TOKEN_COOKIE = "kensar_web_customer_token";

function getMetrikApiBaseUrl() {
  const baseUrl = process.env.METRIK_API_BASE_URL?.trim();
  if (!baseUrl) {
    throw new Error("Missing METRIK_API_BASE_URL");
  }
  return baseUrl.replace(/\/$/, "");
}

export function getWebCustomerTokenCookieName() {
  return WEB_CUSTOMER_TOKEN_COOKIE;
}

export function buildWebCustomerCookieOptions(expiresAt?: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  };
}

export async function fetchMetrikApi(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const baseUrl = getMetrikApiBaseUrl();
  return fetch(`${baseUrl}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

export async function parseJsonSafe<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
