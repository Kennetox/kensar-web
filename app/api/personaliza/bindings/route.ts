import { NextResponse } from "next/server";
import { fetchMetrikApi, parseJsonSafe } from "@/app/lib/metrikServer";

export async function GET() {
  try {
    const response = await fetchMetrikApi("/web/catalog/personalization/bindings");
    if (!response.ok) {
      return NextResponse.json({ detail: "No se pudo cargar la configuración." }, { status: 200 });
    }
    const payload = await parseJsonSafe<Record<string, unknown>>(response);
    return NextResponse.json(payload || {});
  } catch {
    return NextResponse.json({});
  }
}

