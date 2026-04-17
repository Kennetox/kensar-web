import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  buildWebCustomerCookieOptions,
  fetchMetrikApi,
  getWebCustomerTokenCookieName,
  parseJsonSafe,
} from "@/app/lib/metrikServer";

function unauthorizedResponse() {
  return NextResponse.json({ detail: "Debes iniciar sesión para iniciar el pago." }, { status: 401 });
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(getWebCustomerTokenCookieName())?.value;
  if (!token) return unauthorizedResponse();

  const payload = await request.json().catch(() => null);
  if (!payload) {
    return NextResponse.json({ detail: "Payload inválido" }, { status: 400 });
  }

  const response = await fetchMetrikApi("/web/payments/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 401) {
    cookieStore.set(getWebCustomerTokenCookieName(), "", buildWebCustomerCookieOptions(new Date(0)));
    return unauthorizedResponse();
  }

  const body = await parseJsonSafe<unknown>(response);
  return NextResponse.json(body, { status: response.status });
}
