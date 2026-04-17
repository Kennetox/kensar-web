import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  buildWebCustomerCookieOptions,
  fetchMetrikApi,
  getWebCustomerTokenCookieName,
  parseJsonSafe,
} from "@/app/lib/metrikServer";

function unauthorizedResponse() {
  return NextResponse.json(
    { detail: "Debes iniciar sesión para consultar bancos PSE." },
    { status: 401 }
  );
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getWebCustomerTokenCookieName())?.value;
  if (!token) return unauthorizedResponse();

  const response = await fetchMetrikApi("/web/payments/wompi/pse/financial-institutions", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    cookieStore.set(getWebCustomerTokenCookieName(), "", buildWebCustomerCookieOptions(new Date(0)));
    return unauthorizedResponse();
  }

  const body = await parseJsonSafe<unknown>(response);
  return NextResponse.json(body, { status: response.status });
}
