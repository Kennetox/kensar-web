import { NextResponse } from "next/server";
import { fetchMetrikApi, parseJsonSafe } from "@/app/lib/metrikServer";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  if (!payload) {
    return NextResponse.json({ detail: "Payload inválido" }, { status: 400 });
  }

  const response = await fetchMetrikApi("/web/catalog/coupon/preview", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await parseJsonSafe<unknown>(response);
  return NextResponse.json(body, { status: response.status });
}
