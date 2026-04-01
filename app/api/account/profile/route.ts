import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  buildWebCustomerCookieOptions,
  fetchMetrikApi,
  getWebCustomerTokenCookieName,
  parseJsonSafe,
} from "@/app/lib/metrikServer";
import type { WebCustomer } from "@/app/lib/webCustomer";

type BackendError = { detail?: string };

export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(getWebCustomerTokenCookieName())?.value;
  if (!token) {
    return NextResponse.json({ detail: "Debes iniciar sesión para actualizar tu perfil." }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ detail: "Payload inválido" }, { status: 400 });
  }

  const backendResponse = await fetchMetrikApi("/web/customers/me", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (backendResponse.status === 401) {
    cookieStore.set(getWebCustomerTokenCookieName(), "", buildWebCustomerCookieOptions(new Date(0)));
    return NextResponse.json({ detail: "Sesión expirada. Vuelve a iniciar sesión." }, { status: 401 });
  }

  const customer = await parseJsonSafe<WebCustomer | BackendError>(backendResponse);
  if (!backendResponse.ok || !customer || !("id" in customer)) {
    const detail = customer && "detail" in customer && typeof customer.detail === "string"
      ? customer.detail
      : "No se pudo actualizar el perfil";
    return NextResponse.json({ detail }, { status: backendResponse.status || 500 });
  }

  return NextResponse.json({
    authenticated: true,
    customer,
    expires_at: null,
  });
}
