import { NextResponse } from "next/server";
import { fetchMetrikApi, parseJsonSafe } from "@/app/lib/metrikServer";

type BrandCollageEntry = {
  image_url?: string | null;
};

function getApiBaseUrl(): string | null {
  const value = process.env.METRIK_API_BASE_URL?.trim();
  if (!value) return null;
  return value.replace(/\/$/, "");
}

function resolveAssetUrl(baseUrl: string | null, value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/brands/")) return trimmed;
  if (!baseUrl) return trimmed;
  try {
    return new URL(trimmed, `${baseUrl}/`).toString();
  } catch {
    return trimmed;
  }
}

export async function GET() {
  try {
    const response = await fetchMetrikApi("/web/catalog/brand-collage");
    if (!response.ok) {
      return NextResponse.json({ detail: "No se pudo cargar la configuración." }, { status: 200 });
    }
    const payload = await parseJsonSafe<Record<string, BrandCollageEntry>>(response);
    const baseUrl = getApiBaseUrl();
    const normalized = Object.entries(payload || {}).reduce<Record<string, BrandCollageEntry>>(
      (acc, [key, value]) => {
        acc[key] = {
          image_url: resolveAssetUrl(baseUrl, value?.image_url),
        };
        return acc;
      },
      {}
    );
    return NextResponse.json(normalized);
  } catch {
    return NextResponse.json({});
  }
}
