import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  buildWebCustomerCookieOptions,
  fetchMetrikApi,
  getWebCustomerTokenCookieName,
  parseJsonSafe,
} from "@/app/lib/metrikServer";
import type { WebCustomer, WebCustomerSession } from "@/app/lib/webCustomer";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getWebCustomerTokenCookieName())?.value;

  if (!token) {
    return NextResponse.json<WebCustomerSession>({
      authenticated: false,
      customer: null,
      expires_at: null,
    });
  }

  const backendResponse = await fetchMetrikApi("/web/customers/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!backendResponse.ok) {
    cookieStore.set(getWebCustomerTokenCookieName(), "", buildWebCustomerCookieOptions(new Date(0)));
    return NextResponse.json<WebCustomerSession>({
      authenticated: false,
      customer: null,
      expires_at: null,
    });
  }

  const customer = await parseJsonSafe<WebCustomer>(backendResponse);
  if (!customer) {
    return NextResponse.json<WebCustomerSession>({
      authenticated: false,
      customer: null,
      expires_at: null,
    });
  }

  return NextResponse.json<WebCustomerSession>({
    authenticated: true,
    customer,
    expires_at: null,
  });
}
