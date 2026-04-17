import { NextResponse } from "next/server";
import { fetchMetrikApi, parseJsonSafe } from "@/app/lib/metrikServer";

const GUEST_ORDER_TOKEN_COOKIE_PREFIX = "kensar_web_guest_order_token_";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  if (!payload) {
    return NextResponse.json({ detail: "Payload inválido" }, { status: 400 });
  }

  const response = await fetchMetrikApi("/web/payments/wompi/guest-checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await parseJsonSafe<Record<string, unknown>>(response);
  const nextResponse = NextResponse.json(body, { status: response.status });

  if (response.ok && body) {
    const rawOrderId = Number(body.order_id);
    const accessToken =
      typeof body.order_access_token === "string" ? body.order_access_token.trim() : "";
    if (rawOrderId > 0 && accessToken) {
      nextResponse.cookies.set(
        `${GUEST_ORDER_TOKEN_COOKIE_PREFIX}${rawOrderId}`,
        accessToken,
        {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 60 * 60 * 24 * 7,
        }
      );
    }
  }

  return nextResponse;
}
