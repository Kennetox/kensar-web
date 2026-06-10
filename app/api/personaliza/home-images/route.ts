import { NextResponse } from "next/server";
import { fetchMetrikApi, parseJsonSafe } from "@/app/lib/metrikServer";

type HomeImageEntry = {
  before_image_url?: string | null;
  after_image_url?: string | null;
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
  if (!baseUrl) return trimmed;
  try {
    return new URL(trimmed, `${baseUrl}/`).toString();
  } catch {
    return trimmed;
  }
}

export async function GET() {
  try {
    const response = await fetchMetrikApi("/web/catalog/personalization/home-images");
    if (!response.ok) {
      return NextResponse.json({ detail: "No se pudo cargar la configuración." }, { status: 200 });
    }
    const payload = await parseJsonSafe<Record<string, HomeImageEntry>>(response);
    const baseUrl = getApiBaseUrl();
    const normalized = Object.entries(payload || {}).reduce<Record<string, HomeImageEntry>>(
      (acc, [key, value]) => {
        acc[key] = {
          before_image_url: resolveAssetUrl(baseUrl, value?.before_image_url),
          after_image_url: resolveAssetUrl(baseUrl, value?.after_image_url),
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
