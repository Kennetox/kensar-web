import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  buildWebCustomerCookieOptions,
  fetchMetrikApi,
  getWebCustomerTokenCookieName,
  parseJsonSafe,
} from "@/app/lib/metrikServer";
import type { WebCustomerSession } from "@/app/lib/webCustomer";

type BackendAuthResponse = {
  token: string;
  customer: WebCustomerSession["customer"];
  expires_at: string;
};

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);

  if (!payload) {
    return NextResponse.json({ detail: "Payload inválido" }, { status: 400 });
  }

  const backendResponse = await fetchMetrikApi("/web/customers/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await parseJsonSafe<BackendAuthResponse | { detail?: string }>(backendResponse);

  if (!backendResponse.ok || !body || !("token" in body)) {
    return NextResponse.json(
      { detail: typeof body?.detail === "string" ? body.detail : "No se pudo registrar la cuenta" },
      { status: backendResponse.status || 500 }
    );
  }

  const cookieStore = await cookies();
  const expiresAt = new Date(body.expires_at);
  cookieStore.set(
    getWebCustomerTokenCookieName(),
    body.token,
    buildWebCustomerCookieOptions(expiresAt)
  );

  return NextResponse.json({
    authenticated: true,
    customer: body.customer,
    expires_at: body.expires_at,
  });
}
