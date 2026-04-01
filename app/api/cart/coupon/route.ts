import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  buildWebCustomerCookieOptions,
  fetchMetrikApi,
  getWebCustomerTokenCookieName,
  parseJsonSafe,
} from "@/app/lib/metrikServer";
import { normalizeCartPayload } from "@/app/api/cart/_lib/normalizeCartPayload";

async function requireToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getWebCustomerTokenCookieName())?.value;
  return { cookieStore, token };
}

function unauthorizedResponse() {
  return NextResponse.json({ detail: "Debes iniciar sesión para aplicar cupones." }, { status: 401 });
}

export async function PUT(request: Request) {
  const { cookieStore, token } = await requireToken();
  if (!token) return unauthorizedResponse();

  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ detail: "Payload inválido" }, { status: 400 });
  }

  const response = await fetchMetrikApi("/web/cart/coupon", {
    method: "PUT",
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
  return NextResponse.json(normalizeCartPayload(body), { status: response.status });
}

export async function DELETE() {
  const { cookieStore, token } = await requireToken();
  if (!token) return unauthorizedResponse();

  const response = await fetchMetrikApi("/web/cart/coupon", {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    cookieStore.set(getWebCustomerTokenCookieName(), "", buildWebCustomerCookieOptions(new Date(0)));
    return unauthorizedResponse();
  }

  const body = await parseJsonSafe<unknown>(response);
  return NextResponse.json(normalizeCartPayload(body), { status: response.status });
}
