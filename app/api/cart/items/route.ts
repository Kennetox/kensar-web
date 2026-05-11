import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  buildWebCustomerCookieOptions,
  fetchMetrikApi,
  getWebCustomerTokenCookieName,
  parseJsonSafe,
} from "@/app/lib/metrikServer";
import { normalizeCartPayload } from "@/app/api/cart/_lib/normalizeCartPayload";

const CART_MAX_UNITS_PER_ITEM = 3;

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(getWebCustomerTokenCookieName())?.value;

  if (!token) {
    return NextResponse.json({ detail: "Debes iniciar sesión para agregar productos." }, { status: 401 });
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

  const response = await fetchMetrikApi("/web/cart/items", {
    method: "POST",
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
