import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  buildWebCustomerCookieOptions,
  fetchMetrikApi,
  getWebCustomerTokenCookieName,
  parseJsonSafe,
} from "@/app/lib/metrikServer";
import { normalizeCartPayload } from "@/app/api/cart/_lib/normalizeCartPayload";

type RouteContext = {
  params: Promise<{ productId: string }>;
};
const CART_MAX_UNITS_PER_ITEM = 3;

async function getToken() {
  const cookieStore = await cookies();
  return {
    cookieStore,
    token: cookieStore.get(getWebCustomerTokenCookieName())?.value,
  };
}

export async function PUT(request: Request, context: RouteContext) {
  const { cookieStore, token } = await getToken();
  if (!token) {
    return NextResponse.json({ detail: "Debes iniciar sesión para editar el carrito." }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  if (!payload) {
    return NextResponse.json({ detail: "Payload inválido" }, { status: 400 });
  }
  const quantity = Number(payload.quantity);
  if (!Number.isFinite(quantity) || quantity < 1 || quantity > CART_MAX_UNITS_PER_ITEM) {
    return NextResponse.json(
      { detail: `La cantidad por producto debe estar entre 1 y ${CART_MAX_UNITS_PER_ITEM}.` },
      { status: 400 }
    );
  }
  const { productId } = await context.params;
  const response = await fetchMetrikApi(`/web/cart/items/${productId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      ...payload,
      quantity,
    }),
  });

  if (response.status === 401) {
    cookieStore.set(getWebCustomerTokenCookieName(), "", buildWebCustomerCookieOptions(new Date(0)));
  }

  const body = await parseJsonSafe<unknown>(response);
  return NextResponse.json(normalizeCartPayload(body), { status: response.status });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { cookieStore, token } = await getToken();
  if (!token) {
    return NextResponse.json({ detail: "Debes iniciar sesión para editar el carrito." }, { status: 401 });
  }

  const { productId } = await context.params;
  const response = await fetchMetrikApi(`/web/cart/items/${productId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    cookieStore.set(getWebCustomerTokenCookieName(), "", buildWebCustomerCookieOptions(new Date(0)));
  }

  const body = await parseJsonSafe<unknown>(response);
  return NextResponse.json(normalizeCartPayload(body), { status: response.status });
}
