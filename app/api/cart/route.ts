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
  if (!token) {
    return { token: null, cookieStore };
  }
  return { token, cookieStore };
}

function unauthorizedResponse() {
  return NextResponse.json({ detail: "Debes iniciar sesión para usar el carrito." }, { status: 401 });
}

export async function GET() {
  const { token, cookieStore } = await requireToken();
  if (!token) return unauthorizedResponse();

  const response = await fetchMetrikApi("/web/cart", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 401) {
    cookieStore.set(getWebCustomerTokenCookieName(), "", buildWebCustomerCookieOptions(new Date(0)));
    return unauthorizedResponse();
  }

  const body = await parseJsonSafe<unknown>(response);
  return NextResponse.json(body, { status: response.status });
}

export async function DELETE() {
  const { token, cookieStore } = await requireToken();
  if (!token) return unauthorizedResponse();

  const response = await fetchMetrikApi("/web/cart", {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 401) {
    cookieStore.set(getWebCustomerTokenCookieName(), "", buildWebCustomerCookieOptions(new Date(0)));
    return unauthorizedResponse();
  }

  return new NextResponse(null, { status: response.status });
}
