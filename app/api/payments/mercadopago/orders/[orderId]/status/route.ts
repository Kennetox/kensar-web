import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  buildWebCustomerCookieOptions,
  fetchMetrikApi,
  getWebCustomerTokenCookieName,
  parseJsonSafe,
} from "@/app/lib/metrikServer";

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

const GUEST_ORDER_TOKEN_COOKIE_PREFIX = "kensar_web_guest_order_token_";

function unauthorizedResponse() {
  return NextResponse.json({ detail: "Debes iniciar sesión para consultar el estado del pago." }, { status: 401 });
}

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

function normalizeStatusPayload(body: unknown): unknown {
  if (!body || typeof body !== "object") return body;
  const payload = body as { items?: unknown };
  if (!Array.isArray(payload.items)) return body;
  const baseUrl = getApiBaseUrl();
  return {
    ...(body as Record<string, unknown>),
    items: payload.items.map((rawItem) => {
      if (!rawItem || typeof rawItem !== "object") return rawItem;
      const item = rawItem as Record<string, unknown>;
      return {
        ...item,
        image_url: resolveAssetUrl(baseUrl, item.image_url),
      };
    }),
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const { orderId } = await context.params;
  const requestUrl = new URL(_request.url);
  let accessToken = (requestUrl.searchParams.get("accessToken") || "").trim();
  const paymentHint = (requestUrl.searchParams.get("payment") || "").trim().toLowerCase();
  const paymentQuery = paymentHint ? `&payment=${encodeURIComponent(paymentHint)}` : "";

  const cookieStore = await cookies();
  if (!accessToken) {
    accessToken = (
      cookieStore.get(`${GUEST_ORDER_TOKEN_COOKIE_PREFIX}${orderId}`)?.value || ""
    ).trim();
  }

  if (accessToken) {
    const response = await fetchMetrikApi(
      `/web/payments/mercadopago/guest/orders/${orderId}/status?access_token=${encodeURIComponent(accessToken)}${paymentQuery}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    const body = await parseJsonSafe<unknown>(response);
    return NextResponse.json(normalizeStatusPayload(body), { status: response.status });
  }

  const token = cookieStore.get(getWebCustomerTokenCookieName())?.value;
  if (!token) return unauthorizedResponse();

  const response = await fetchMetrikApi(`/web/payments/mercadopago/orders/${orderId}/status${paymentHint ? `?payment=${encodeURIComponent(paymentHint)}` : ""}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    cookieStore.set(getWebCustomerTokenCookieName(), "", buildWebCustomerCookieOptions(new Date(0)));
    return unauthorizedResponse();
  }

  const body = await parseJsonSafe<unknown>(response);
  return NextResponse.json(normalizeStatusPayload(body), { status: response.status });
}
