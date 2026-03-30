import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  buildWebCustomerCookieOptions,
  fetchMetrikApi,
  getWebCustomerTokenCookieName,
  parseJsonSafe,
} from "@/app/lib/metrikServer";

async function requireToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getWebCustomerTokenCookieName())?.value;
  return { cookieStore, token };
}

function unauthorizedResponse() {
  return NextResponse.json({ detail: "Debes iniciar sesión para operar órdenes web." }, { status: 401 });
}

export async function GET() {
  const { cookieStore, token } = await requireToken();
  if (!token) return unauthorizedResponse();

  const response = await fetchMetrikApi("/web/orders", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 401) {
    cookieStore.set(getWebCustomerTokenCookieName(), "", buildWebCustomerCookieOptions(new Date(0)));
    return unauthorizedResponse();
  }

  const body = await parseJsonSafe<unknown>(response);
  return NextResponse.json(body, { status: response.status });
}

export async function POST(request: Request) {
  const { cookieStore, token } = await requireToken();
  if (!token) return unauthorizedResponse();

  const payload = await request.json().catch(() => ({}));
  const response = await fetchMetrikApi("/web/orders", {
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
