"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import ModelPreview3D, { type PaintConfig, type TextLayer3D } from "../ModelPreview3D";

type ProductType = "campana" | "guiro" | "maraca";

type PersonalizationPreviewPayload = {
  product?: {
    id?: ProductType;
    campana_type?: "clasica" | "cromada" | null;
    campana_bell_type?: "abierta" | "cerrada" | null;
  };
  paint?: PaintConfig;
  text_layers?: Array<{
    id?: string;
    text?: string;
    color?: string;
    font_family?: string;
    font_weight?: number;
    face?: "front_up" | "front_down" | "left" | "right";
    transform?: {
      scaleX?: number;
      scaleY?: number;
      offsetX?: number;
      offsetY?: number;
      rotation?: number;
    };
  }>;
  summary?: string;
};

function decodePayload(input: string): PersonalizationPreviewPayload | null {
  const raw = input.trim();
  if (!raw) return null;
  let decodedUri = raw;
  try {
    decodedUri = decodeURIComponent(raw);
  } catch {
    decodedUri = raw;
  }
  const candidates = [
    raw,
    decodedUri,
    raw.replace(/-/g, "+").replace(/_/g, "/"),
    decodedUri.replace(/-/g, "+").replace(/_/g, "/"),
  ];
  for (const candidate of candidates) {
    try {
      const withPadding = `${candidate}${"===".slice((candidate.length + 3) % 4)}`;
      const json = atob(withPadding);
      const parsed = JSON.parse(json);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as PersonalizationPreviewPayload;
      }
    } catch {
      // Continue trying candidate
    }
  }
  return null;
}

function VisorContent() {
  const searchParams = useSearchParams();
  const dataParam = searchParams.get("data") || "";
  const payload = useMemo(() => decodePayload(dataParam), [dataParam]);

  const product = (payload?.product?.id || "campana") as ProductType;
  const campanaType = payload?.product?.campana_type === "cromada" ? "cromada" : "clasica";
  const campanaBellType = payload?.product?.campana_bell_type === "cerrada" ? "cerrada" : "abierta";
  const paintConfig: PaintConfig = payload?.paint?.mode === "gradient"
    ? {
        mode: "gradient",
        startColor: payload.paint.startColor || "#f97316",
        endColor: payload.paint.endColor || "#dc2626",
        angle: Number(payload.paint.angle) || 90,
        position: Number(payload.paint.position) || 50,
      }
    : {
        mode: "solid",
        color: payload?.paint && "color" in payload.paint ? payload.paint.color || "#1f2937" : "#1f2937",
      };
  const textLayers: TextLayer3D[] = (payload?.text_layers || []).map((layer, index) => ({
    id: layer.id || `layer-${index + 1}`,
    text: layer.text || "",
    textColor: layer.color || "#ffffff",
    textFontFamily: layer.font_family || "Arial, sans-serif",
    textFontWeight: Number(layer.font_weight) || 700,
    face: layer.face || "front_up",
    textTransform: {
      scaleX: Number(layer.transform?.scaleX) || 100,
      scaleY: Number(layer.transform?.scaleY) || 100,
      offsetX: Number(layer.transform?.offsetX) || 0,
      offsetY: Number(layer.transform?.offsetY) || 0,
      rotation: Number(layer.transform?.rotation) || 0,
    },
  }));

  return (
    <main style={{ minHeight: "100vh", background: "#f1f5f9", margin: 0, padding: 0 }}>
      <ModelPreview3D
        product={product}
        campanaType={campanaType}
        campanaBellType={campanaBellType}
        paintConfig={paintConfig}
        textLayers={textLayers}
      />
    </main>
  );
}

export default function PersonalizaVisorPage() {
  return (
    <Suspense fallback={<main style={{ padding: "16px" }}>Cargando visor...</main>}>
      <VisorContent />
    </Suspense>
  );
}
