"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./personaliza.module.css";
import ModelPreview3D, { type ModelPreview3DHandle, type PaintConfig } from "./ModelPreview3D";
import { useWebCart } from "@/app/components/WebCartProvider";
import {
  CUSTOM_TEXT_MAX_LENGTH,
  DEFAULT_PERSONALIZATION,
  PERSONALIZABLE_PRODUCTS,
  PERSONALIZABLE_SIZES,
  STYLE_PRESETS,
  resolvePersonalizableCheckoutBinding,
  type PersonalizableProductType,
  type PersonalizableSize,
} from "./_config/presets";

type PurchaseStatus = "idle" | "sending" | "success" | "error";
type TextFontOption = {
  id: string;
  label: string;
  family: string;
  weight: number;
};
type TextColorOption = {
  id: string;
  label: string;
  hex: string;
};
type GuiroTextFace = "front_up" | "front_down" | "left" | "right";
type TextLayerState = {
  id: string;
  text: string;
  color: string;
  fontId: string;
  face: GuiroTextFace;
  lockScale: boolean;
  scaleRatio: number;
  transform: {
    scaleX: number;
    scaleY: number;
    offsetX: number;
    offsetY: number;
    rotation: number;
  };
};
type EditorSnapshot = {
  size: PersonalizableSize;
  campanaBellType: "cerrada" | "abierta";
  paintMode: "solid" | "gradient";
  solidColorSource: "preset" | "custom";
  solidPresetId: string;
  solidPaintColor: string;
  gradientPresetId: string;
  gradientStartColor: string;
  gradientEndColor: string;
  gradientPosition: number;
  textLayers: TextLayerState[];
  activeLayerId: string;
  positionPresetId: (typeof POSITION_PRESET_OPTIONS)[number]["id"];
  textColorOptionId: string;
};
type CheckoutItemLookup = {
  id: number;
  name: string;
  slug: string;
  sku: string | null;
  image_url: string | null;
  brand: string | null;
  stock_status: "in_stock" | "low_stock" | "out_of_stock" | "service" | "consultar";
  price: number;
  compare_price: number | null;
};

const WHATSAPP_NUMBER = "573185657508";
const TEXT_FONT_OPTIONS: TextFontOption[] = [
  { id: "vintage-regular", label: "Vintage", family: "\"Vintage\", serif", weight: 400 },
  { id: "arial-bold", label: "Arial Bold", family: "Arial, sans-serif", weight: 700 },
  { id: "charm-regular", label: "Charm", family: "\"Charm\", cursive", weight: 400 },
];
const SOLID_STYLE_PRESETS = STYLE_PRESETS.filter((preset) => preset.kind === "solid");
const GRADIENT_STYLE_PRESETS = STYLE_PRESETS.filter((preset) => preset.kind === "gradient");
const CROMADA_TINT_PRESETS = [
  { id: "cromado-natural", label: "Cromado natural", fill: "#c7ced8" },
  { id: "cromado-azul", label: "Azul acero", fill: "#8fa2bf" },
  { id: "cromado-oro", label: "Oro humo", fill: "#b7a07c" },
  { id: "cromado-bronce", label: "Bronce", fill: "#9c6a3a" },
] as const;
const POSITION_PRESET_OPTIONS = [
  { id: "center", label: "Centrado" },
  { id: "top", label: "Arriba" },
  { id: "bottom", label: "Abajo" },
  { id: "diagonal", label: "Diagonal" },
  { id: "custom", label: "Personalizado" },
] as const;
const TEXT_COLOR_OPTIONS: TextColorOption[] = [
  { id: "white", label: "Blanco", hex: "#ffffff" },
  { id: "black", label: "Negro", hex: "#111827" },
  { id: "gold", label: "Dorado", hex: "#facc15" },
  { id: "silver", label: "Plateado", hex: "#e2e8f0" },
  { id: "red", label: "Rojo", hex: "#ef4444" },
  { id: "blue", label: "Azul", hex: "#60a5fa" },
  { id: "custom", label: "Personalizado", hex: "" },
];
const FIXED_GRADIENT_ANGLE = 90;
const TEXT_OFFSET_X_MIN = -24;
const TEXT_OFFSET_X_MAX = 24;
const TEXT_OFFSET_Y_MIN = -24;
const TEXT_OFFSET_Y_MAX = 40;
const TEXT_SCALE_MIN = 40;
const TEXT_SCALE_MAX = 180;
const TEXT_ROTATION_MIN = -180;
const TEXT_ROTATION_MAX = 180;
const MAX_TEXT_LAYERS = 2;
const MAX_TEXT_LAYERS_GUIRO = 4;
const GUIRO_TEXT_FACE_OPTIONS: Array<{ id: GuiroTextFace; label: string }> = [
  { id: "front_up", label: "Frente superior" },
  { id: "front_down", label: "Frente inferior" },
  { id: "left", label: "Lateral izquierda" },
  { id: "right", label: "Lateral derecha" },
];
const QUICK_SYMBOL_OPTIONS = ["♥", "★", "☆", "✦", "♪", "♫", "✚", "☀", "⚡", "∞"] as const;
const HISTORY_LIMIT = 80;
const HISTORY_COMMIT_IDLE_MS = 900;
const PERSONALIZA_CHECKOUT_CONTEXT_STORAGE_KEY = "kensar_web_personaliza_checkout_context_v1";
const CAMPANA_TYPE_OPTIONS = [
  {
    id: "clasica",
    name: "Campana clásica",
    description: "Perfil tradicional para salsa y timba.",
    cardImage: "/personaliza/cards/campana.png",
  },
  {
    id: "cromada",
    name: "Campana cromada",
    description: "Acabado cromado con brillo más metálico.",
    cardImage: "/personaliza/cards/campana-cromada.png",
  },
] as const;

function formatSelectionMessage(input: {
  product: string;
  size: string;
  style: string;
  text: string;
  productSku?: string;
  productSlug?: string;
  personalizationSku?: string;
}) {
  return [
    "Hola Kensar, quiero solicitar una personalización:",
    `• Producto: ${input.product}`,
    `• Tamaño: ${input.size}`,
    `• Estilo: ${input.style}`,
    `• Texto: ${input.text || "Sin texto"}`,
    input.productSku ? `• SKU producto base: ${input.productSku}` : null,
    input.productSlug ? `• Slug producto base: ${input.productSlug}` : null,
    input.personalizationSku ? `• SKU servicio personalización: ${input.personalizationSku}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function resolve3DPaintColor(fill: string): string {
  const normalized = fill.trim();
  if (normalized.startsWith("#")) return normalized;
  const firstHex = normalized.match(/#(?:[0-9a-fA-F]{3}){1,2}/);
  return firstHex?.[0] || "#1f2937";
}

function parseGradientFromFill(fill: string): { startColor: string; endColor: string; angle: number } {
  const hexMatches = fill.match(/#(?:[0-9a-fA-F]{3}){1,2}/g) || [];
  const startColor = hexMatches[0] || "#dc2626";
  const endColor = hexMatches[hexMatches.length - 1] || "#7f1d1d";
  const angleMatch = fill.match(/(-?\d+(?:\.\d+)?)deg/);
  const angle = angleMatch ? Number(angleMatch[1]) : 135;
  return { startColor, endColor, angle };
}

function clampValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getColorPickerStyle(color: string): React.CSSProperties {
  const normalized = color.replace("#", "").trim();
  const hex =
    normalized.length === 3
      ? `${normalized[0]}${normalized[0]}${normalized[1]}${normalized[1]}${normalized[2]}${normalized[2]}`
      : normalized;
  const isValidHex = /^[0-9a-fA-F]{6}$/.test(hex);
  const r = isValidHex ? Number.parseInt(hex.slice(0, 2), 16) : 17;
  const g = isValidHex ? Number.parseInt(hex.slice(2, 4), 16) : 24;
  const b = isValidHex ? Number.parseInt(hex.slice(4, 6), 16) : 39;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const hasLightFill = luminance >= 0.86;
  return {
    borderColor: "rgba(15, 23, 42, 0.28)",
    boxShadow: `inset 0 0 0 1px ${hasLightFill ? "rgba(15, 23, 42, 0.35)" : "rgba(255, 255, 255, 0.25)"}, 0 0 0 2px ${color}33`,
  };
}

function clampTextLength(value: string): string {
  return Array.from(value).slice(0, CUSTOM_TEXT_MAX_LENGTH).join("");
}

function resolveTextColorOptionId(color: string): string {
  const normalized = color.trim().toLowerCase();
  const matched = TEXT_COLOR_OPTIONS.find(
    (option) => option.id !== "custom" && option.hex.toLowerCase() === normalized
  );
  return matched?.id || "custom";
}

function getNextGuiroFace(currentLayers: TextLayerState[]): GuiroTextFace {
  const usedFaces = new Set(currentLayers.map((layer) => layer.face));
  const available = GUIRO_TEXT_FACE_OPTIONS.find((option) => !usedFaces.has(option.id));
  return available?.id || "front_up";
}

function normalizeHexColor(value: string): string {
  const safe = value.replace("#", "").trim().toLowerCase();
  if (safe.length === 3) return `#${safe[0]}${safe[0]}${safe[1]}${safe[1]}${safe[2]}${safe[2]}`;
  if (/^[0-9a-f]{6}$/.test(safe)) return `#${safe}`;
  return "";
}

function resolveTextColorLabel(value: string): string {
  const normalized = normalizeHexColor(value);
  if (!normalized) return "Personalizado";
  const matched = TEXT_COLOR_OPTIONS.find(
    (option) => option.id !== "custom" && normalizeHexColor(option.hex) === normalized
  );
  return matched?.label || "Personalizado";
}

function cleanTraceLine(value: string): string {
  const line = value.trim().replace(/^[-•\s]+/, "");
  return line;
}

function getDefaultRotationByFace(face: GuiroTextFace): number {
  return face === "left" || face === "right" ? -90 : 0;
}

function persistPersonalizaCheckoutContext(payload: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PERSONALIZA_CHECKOUT_CONTEXT_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage failures (private mode or disabled storage).
  }
}

function readPersonalizaCheckoutContext(): Record<string, unknown> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PERSONALIZA_CHECKOUT_CONTEXT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export default function PersonalizaExperience() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { addItem } = useWebCart();
  const [product, setProduct] = useState<PersonalizableProductType>(DEFAULT_PERSONALIZATION.product);
  const [size, setSize] = useState<PersonalizableSize>(DEFAULT_PERSONALIZATION.size);
  const [campanaBellType, setCampanaBellType] = useState<"cerrada" | "abierta">("abierta");
  const [paintMode, setPaintMode] = useState<"solid" | "gradient">("solid");
  const [solidColorSource, setSolidColorSource] = useState<"preset" | "custom">("preset");
  const [solidPresetId, setSolidPresetId] = useState(SOLID_STYLE_PRESETS[0]?.id || STYLE_PRESETS[0].id);
  const [solidPaintColor, setSolidPaintColor] = useState(
    resolve3DPaintColor(SOLID_STYLE_PRESETS[0]?.fill || STYLE_PRESETS[0].fill)
  );
  const [gradientPresetId, setGradientPresetId] = useState(
    GRADIENT_STYLE_PRESETS[0]?.id || STYLE_PRESETS[0].id
  );
  const [gradientStartColor, setGradientStartColor] = useState("#f97316");
  const [gradientEndColor, setGradientEndColor] = useState("#dc2626");
  const [gradientPosition, setGradientPosition] = useState(50);
  const [textLayers, setTextLayers] = useState<TextLayerState[]>([
    {
      id: "layer-1",
      text: DEFAULT_PERSONALIZATION.text,
      color: STYLE_PRESETS[0]?.textColor || "#ffffff",
      fontId: TEXT_FONT_OPTIONS[0].id,
      face: "front_up",
      lockScale: true,
      scaleRatio: 1,
      transform: {
        scaleX: 100,
        scaleY: 100,
        offsetX: 0,
        offsetY: 0,
        rotation: 0,
      },
    },
  ]);
  const [activeLayerId, setActiveLayerId] = useState("layer-1");
  const [positionPresetId, setPositionPresetId] = useState<(typeof POSITION_PRESET_OPTIONS)[number]["id"]>("center");
  const [textColorOptionId, setTextColorOptionId] = useState<string>("custom");
  const [isDraggingText, setIsDraggingText] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [addToCartStatus, setAddToCartStatus] = useState<PurchaseStatus>("idle");
  const [purchaseStatus, setPurchaseStatus] = useState<PurchaseStatus>("idle");
  const [showCampanaTypes, setShowCampanaTypes] = useState(false);
  const [isTextInputFocused, setIsTextInputFocused] = useState(false);
  const [isDownloadingPreview, setIsDownloadingPreview] = useState(false);
  const [isModelUpsideDown, setIsModelUpsideDown] = useState(false);
  const [isFloatingDockVisible, setIsFloatingDockVisible] = useState(false);
  const [historyPast, setHistoryPast] = useState<EditorSnapshot[]>([]);
  const [historyFuture, setHistoryFuture] = useState<EditorSnapshot[]>([]);
  const selectorGridRef = useRef<HTMLElement | null>(null);
  const campanaCardRef = useRef<HTMLButtonElement | null>(null);
  const campanaTypeSectionRef = useRef<HTMLDivElement | null>(null);
  const dockVisibilityTriggerRef = useRef<HTMLDivElement | null>(null);
  const preview3DRef = useRef<ModelPreview3DHandle | null>(null);
  const isApplyingHistoryRef = useRef(false);
  const lastSnapshotRef = useRef<EditorSnapshot | null>(null);
  const pendingHistoryStartRef = useRef<EditorSnapshot | null>(null);
  const historyCommitTimerRef = useRef<number | null>(null);
  const historyBatchDepthRef = useRef(0);
  const dragStateRef = useRef<{
    pointerId: number | null;
    originOffsetX: number;
    originOffsetY: number;
    startClientX: number;
    startClientY: number;
    surfaceWidth: number;
    surfaceHeight: number;
  }>({
    pointerId: null,
    originOffsetX: 0,
    originOffsetY: 0,
    startClientX: 0,
    startClientY: 0,
    surfaceWidth: 1,
    surfaceHeight: 1,
  });
  const selectedProductFromQuery = (searchParams.get("producto") || "")
    .trim()
    .toLowerCase() as PersonalizableProductType | "";
  const selectedCampanaTypeFromQuery = (searchParams.get("tipoCampana") || "")
    .trim()
    .toLowerCase();
  const selectedCampanaType = selectedCampanaTypeFromQuery === "cromada" ? "cromada" : "clasica";
  const isCromadaVariant = selectedProductFromQuery === "campana" && selectedCampanaType === "cromada";
  const isCampanaVariant = selectedProductFromQuery === "campana";
  const isGuiroVariant = product === "guiro";
  const isProductSelected =
    selectedProductFromQuery === "campana" ||
    selectedProductFromQuery === "guiro" ||
    selectedProductFromQuery === "maraca";
  const maxTextLayers = isGuiroVariant ? MAX_TEXT_LAYERS_GUIRO : MAX_TEXT_LAYERS;
  const query = searchParams.toString();
  const returnTo = `${pathname}${query ? `?${query}` : ""}`;
  const checkoutHref = `/pago?returnTo=${encodeURIComponent(returnTo)}`;

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!isProductSelected) return;
    setProduct(selectedProductFromQuery);
  }, [isProductSelected, selectedProductFromQuery]);

  useEffect(() => {
    if (!showCampanaTypes) return;
    const frameId = window.requestAnimationFrame(() => {
      campanaTypeSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [showCampanaTypes]);

  useEffect(() => {
    if (!showCampanaTypes || isProductSelected) return;

    const handlePointerDownOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Element | null;
      if (!target) return;
      if (campanaCardRef.current?.contains(target)) return;

      const clickedCampanaOption = Boolean(target.closest(`.${styles.campanaTypeCard}`));
      const clickedBackButton = Boolean(target.closest(`.${styles.campanaTypesClose}`));
      if (clickedCampanaOption || clickedBackButton) return;

      closeCampanaTypesAndGoTop();
    };

    document.addEventListener("mousedown", handlePointerDownOutside);
    document.addEventListener("touchstart", handlePointerDownOutside);
    return () => {
      document.removeEventListener("mousedown", handlePointerDownOutside);
      document.removeEventListener("touchstart", handlePointerDownOutside);
    };
  }, [isProductSelected, showCampanaTypes]);

  useEffect(() => {
    if (!isProductSelected) return;
    const trigger = dockVisibilityTriggerRef.current;
    if (!trigger) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsFloatingDockVisible(Boolean(entry?.isIntersecting));
      },
      {
        root: null,
        threshold: 0,
        rootMargin: "0px 0px 8% 0px",
      }
    );

    observer.observe(trigger);
    return () => observer.disconnect();
  }, [isProductSelected]);

  const availableSizes = useMemo(() => {
    if (isCampanaVariant || product === "guiro") {
      return PERSONALIZABLE_SIZES.filter((item) => item.id === "small" || item.id === "large");
    }
    return PERSONALIZABLE_SIZES;
  }, [isCampanaVariant, product]);

  const selectedProduct = useMemo(
    () => PERSONALIZABLE_PRODUCTS.find((item) => item.id === product) || PERSONALIZABLE_PRODUCTS[0],
    [product]
  );

  const selectedSize = useMemo(
    () => availableSizes.find((item) => item.id === size) || availableSizes[0],
    [availableSizes, size]
  );
  const selectedCheckoutBinding = useMemo(
    () => resolvePersonalizableCheckoutBinding(product, selectedSize.id),
    [product, selectedSize.id]
  );
  const availableSolidPresets = useMemo(
    () => (isCromadaVariant ? CROMADA_TINT_PRESETS : SOLID_STYLE_PRESETS),
    [isCromadaVariant]
  );

  const selectedSolidPreset = useMemo(
    () => availableSolidPresets.find((preset) => preset.id === solidPresetId) || availableSolidPresets[0],
    [availableSolidPresets, solidPresetId]
  );
  const selectedGradientPreset = useMemo(
    () => GRADIENT_STYLE_PRESETS.find((preset) => preset.id === gradientPresetId) || GRADIENT_STYLE_PRESETS[0],
    [gradientPresetId]
  );
  const selectedStyleLabel = useMemo(() => {
    if (paintMode === "solid") {
      return solidColorSource === "preset"
        ? selectedSolidPreset?.label || "Color sólido"
        : "Color sólido personalizado";
    }
    return selectedGradientPreset?.label || "Degradado personalizado";
  }, [paintMode, selectedGradientPreset?.label, selectedSolidPreset?.label, solidColorSource]);
  const paintConfig = useMemo<PaintConfig>(() => {
    if (paintMode === "solid") return { mode: "solid", color: solidPaintColor };
    const shouldFlipGradientForGuiro = isGuiroVariant;
    const startColor = shouldFlipGradientForGuiro ? gradientEndColor : gradientStartColor;
    const endColor = shouldFlipGradientForGuiro ? gradientStartColor : gradientEndColor;
    return {
      mode: "gradient",
      startColor,
      endColor,
      angle: FIXED_GRADIENT_ANGLE,
      position: gradientPosition,
    };
  }, [
    gradientEndColor,
    gradientPosition,
    gradientStartColor,
    isGuiroVariant,
    paintMode,
    solidPaintColor,
  ]);
  const editorPaintSurfaceStyle = useMemo(() => {
    if (paintConfig.mode === "solid") return { background: paintConfig.color };
    const blendCenter = Math.min(90, Math.max(10, paintConfig.position));
    const stopA = Math.max(0, blendCenter - 16);
    const stopB = Math.min(100, blendCenter + 16);
    // CSS y canvas usan convenciones de ángulo diferentes:
    // canvas: 0° = derecha, 90° = abajo
    // CSS linear-gradient: 0° = arriba, 90° = derecha
    const cssAngle = ((paintConfig.angle + 90) % 360 + 360) % 360;
    const startColorForEditor =
      product === "guiro" ? paintConfig.endColor : paintConfig.startColor;
    const endColorForEditor =
      product === "guiro" ? paintConfig.startColor : paintConfig.endColor;
    return {
      background: `linear-gradient(${cssAngle}deg, ${startColorForEditor} 0%, ${startColorForEditor} ${stopA}%, ${endColorForEditor} ${stopB}%, ${endColorForEditor} 100%)`,
    };
  }, [paintConfig, product]);

  const liveSummary = useMemo(
    () =>
      formatSelectionMessage({
        product: isCampanaVariant ? `${selectedProduct.name} (${campanaBellType})` : selectedProduct.name,
        size: selectedSize.label,
        style: selectedStyleLabel,
        productSku: selectedCheckoutBinding?.productSku,
        productSlug: selectedCheckoutBinding?.productSlug,
        personalizationSku: selectedCheckoutBinding?.personalizationSku,
        text: textLayers
          .map((layer, index) => {
            const value = layer.text.trim();
            if (!value) return null;
            const faceLabel =
              product === "guiro"
                ? GUIRO_TEXT_FACE_OPTIONS.find((option) => option.id === layer.face)?.label || "Frente"
                : "";
            if (textLayers.length > 1 || product === "guiro") {
              return `Capa ${index + 1}${faceLabel ? ` (${faceLabel})` : ""}: ${value}`;
            }
            return value;
          })
          .filter(Boolean)
          .join(" | "),
      }),
    [
      campanaBellType,
      isCampanaVariant,
      product,
      selectedCheckoutBinding?.personalizationSku,
      selectedCheckoutBinding?.productSku,
      selectedCheckoutBinding?.productSlug,
      selectedProduct.name,
      selectedSize.label,
      selectedStyleLabel,
      textLayers,
    ]
  );

  const whatsappHref = useMemo(
    () => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(liveSummary)}`,
    [liveSummary]
  );

  const activeLayer = useMemo(
    () => textLayers.find((layer) => layer.id === activeLayerId) || textLayers[0],
    [activeLayerId, textLayers]
  );
  const activeLayerText = activeLayer?.text ?? "";
  const activeLayerColor = activeLayer?.color ?? "#ffffff";
  const activeLayerFontId = activeLayer?.fontId ?? TEXT_FONT_OPTIONS[0].id;
  const activeLayerFace = activeLayer?.face ?? "front_up";
  const activeLayerLockScale = activeLayer?.lockScale ?? true;
  const activeLayerTransform = activeLayer?.transform ?? {
    scaleX: 100,
    scaleY: 100,
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
  };
  const visibleEditorLayers = useMemo(
    () =>
      isGuiroVariant
        ? textLayers.filter((layer) => layer.face === activeLayerFace)
        : textLayers,
    [activeLayerFace, isGuiroVariant, textLayers]
  );
  const shouldFocusTextIn3D = isGuiroVariant ? false : isTextInputFocused;
  const designTraceText = useMemo(() => {
    const lines: string[] = [];
    lines.push(`Producto: ${selectedProduct.name}`);
    lines.push(`Tamaño: ${selectedSize.label}`);
    if (product === "campana") {
      lines.push(`Tipo campana: ${selectedCampanaType === "cromada" ? "Cromada" : "Clásica"}`);
      lines.push(`Boquilla: ${campanaBellType === "abierta" ? "Abierta" : "Cerrada"}`);
    }
    lines.push(`Estilo: ${selectedStyleLabel}`);
    if (paintConfig.mode === "solid") {
      lines.push(`Color principal: ${selectedStyleLabel}`);
    } else {
      const gradientPreset = GRADIENT_STYLE_PRESETS.find((preset) => preset.id === gradientPresetId);
      lines.push(`Degradado: ${gradientPreset?.label || "Personalizado"}`);
    }

    const layerLines = textLayers
      .map((layer, index) => {
        const textValue = layer.text.trim();
        if (!textValue) return null;
        const faceLabel =
          product === "guiro"
            ? GUIRO_TEXT_FACE_OPTIONS.find((option) => option.id === layer.face)?.label || "Frente"
            : "Frente";
        const colorLabel = resolveTextColorLabel(layer.color);
        return `Capa ${index + 1} · Cara: ${faceLabel} · Color: ${colorLabel} · Texto: "${textValue}"`;
      })
      .filter(Boolean) as string[];

    if (!layerLines.length) {
      lines.push("Texto por capas: Sin texto");
    } else {
      lines.push("Texto por capas:");
      layerLines.forEach((line) => lines.push(`- ${line}`));
    }

    return lines.join("\n");
  }, [
    campanaBellType,
    gradientPresetId,
    paintConfig.mode,
    product,
    selectedCampanaType,
    selectedProduct.name,
    selectedSize.label,
    selectedStyleLabel,
    textLayers,
  ]);

  const personalizationCheckoutContext = useMemo<Record<string, unknown>>(
    () => ({
      type: "instrumento",
      source: "web_personaliza_instrumento",
      generated_at: new Date().toISOString(),
      product: {
        id: product,
        name: selectedProduct.name,
        size: selectedSize.id,
        size_label: selectedSize.label,
        campana_type: isCampanaVariant ? selectedCampanaType : null,
        campana_bell_type: isCampanaVariant ? campanaBellType : null,
      },
      checkout_binding: selectedCheckoutBinding
        ? {
            product_slug: selectedCheckoutBinding.productSlug,
            product_sku: selectedCheckoutBinding.productSku,
            personalization_sku: selectedCheckoutBinding.personalizationSku,
          }
        : null,
      paint: paintConfig,
      text_layers: textLayers.map((layer) => ({
        id: layer.id,
        text: layer.text,
        color: layer.color,
        font_id: layer.fontId,
        font_family:
          TEXT_FONT_OPTIONS.find((option) => option.id === layer.fontId)?.family || TEXT_FONT_OPTIONS[0].family,
        font_weight:
          TEXT_FONT_OPTIONS.find((option) => option.id === layer.fontId)?.weight || TEXT_FONT_OPTIONS[0].weight,
        face: layer.face,
        lock_scale: layer.lockScale,
        scale_ratio: layer.scaleRatio,
        transform: layer.transform,
      })),
      design_trace_text: designTraceText,
      design_trace_lines: designTraceText
        .split("\n")
        .map(cleanTraceLine)
        .filter(Boolean),
      summary: liveSummary,
    }),
    [
      campanaBellType,
      designTraceText,
      isCampanaVariant,
      liveSummary,
      paintConfig,
      product,
      selectedCampanaType,
      selectedCheckoutBinding,
      selectedProduct.name,
      selectedSize.id,
      selectedSize.label,
      textLayers,
    ]
  );

  useEffect(() => {
    if (!isGuiroVariant || !isTextInputFocused) return;
    preview3DRef.current?.focusGuiroFace(activeLayerFace);
  }, [activeLayerFace, isGuiroVariant, isTextInputFocused]);

  const updateActiveLayer = useCallback(
    (updater: (layer: TextLayerState) => TextLayerState) => {
      setTextLayers((current) => current.map((layer) => (layer.id === activeLayerId ? updater(layer) : layer)));
    },
    [activeLayerId]
  );

  const createEditorSnapshot = useCallback(
    (): EditorSnapshot => ({
      size,
      campanaBellType,
      paintMode,
      solidColorSource,
      solidPresetId,
      solidPaintColor,
      gradientPresetId,
      gradientStartColor,
      gradientEndColor,
      gradientPosition,
      textLayers,
      activeLayerId,
      positionPresetId,
      textColorOptionId,
    }),
    [
      campanaBellType,
      activeLayerId,
      gradientEndColor,
      gradientPosition,
      gradientPresetId,
      gradientStartColor,
      paintMode,
      positionPresetId,
      size,
      solidColorSource,
      solidPaintColor,
      solidPresetId,
      textColorOptionId,
      textLayers,
    ]
  );

  const clearPendingHistoryTimer = useCallback(() => {
    if (historyCommitTimerRef.current !== null) {
      window.clearTimeout(historyCommitTimerRef.current);
      historyCommitTimerRef.current = null;
    }
  }, []);

  const resetEditorProgress = useCallback(() => {
    const defaultSolidPreset = availableSolidPresets[0];
    setIsTextInputFocused(false);
    setSize(availableSizes[0]?.id || DEFAULT_PERSONALIZATION.size);
    setCampanaBellType("abierta");
    setPaintMode("solid");
    setSolidColorSource("preset");
    setSolidPresetId(defaultSolidPreset?.id || STYLE_PRESETS[0].id);
    setSolidPaintColor(resolve3DPaintColor(defaultSolidPreset?.fill || STYLE_PRESETS[0].fill));
    setGradientPresetId(GRADIENT_STYLE_PRESETS[0]?.id || STYLE_PRESETS[0].id);
    setGradientStartColor("#f97316");
    setGradientEndColor("#dc2626");
    setGradientPosition(50);
    setTextLayers([
      {
        id: "layer-1",
        text: "",
        color: STYLE_PRESETS[0]?.textColor || "#ffffff",
        fontId: TEXT_FONT_OPTIONS[0].id,
        face: "front_up",
        lockScale: true,
        scaleRatio: 1,
        transform: {
          scaleX: 100,
          scaleY: 100,
          offsetX: 0,
          offsetY: 0,
          rotation: 0,
        },
      },
    ]);
    setActiveLayerId("layer-1");
    setPositionPresetId("center");
    setTextColorOptionId("custom");
  }, [availableSizes, availableSolidPresets]);

  useEffect(() => {
    if (!isProductSelected) return;
    if (availableSizes.some((item) => item.id === size)) return;
    setSize(availableSizes[0]?.id || DEFAULT_PERSONALIZATION.size);
  }, [availableSizes, isProductSelected, size]);

  const commitPendingHistory = useCallback(() => {
    clearPendingHistoryTimer();
    const pendingStart = pendingHistoryStartRef.current;
    const latest = lastSnapshotRef.current;
    pendingHistoryStartRef.current = null;
    if (!pendingStart || !latest) return;
    const changed = JSON.stringify(pendingStart) !== JSON.stringify(latest);
    if (!changed) return;
    setHistoryPast((prev) => [...prev, pendingStart].slice(-HISTORY_LIMIT));
  }, [clearPendingHistoryTimer]);

  const beginHistoryBatch = useCallback(() => {
    historyBatchDepthRef.current += 1;
    clearPendingHistoryTimer();
    if (!pendingHistoryStartRef.current && lastSnapshotRef.current) {
      pendingHistoryStartRef.current = lastSnapshotRef.current;
      setHistoryFuture([]);
    }
  }, [clearPendingHistoryTimer]);

  const endHistoryBatch = useCallback(() => {
    if (historyBatchDepthRef.current > 0) {
      historyBatchDepthRef.current -= 1;
    }
    if (historyBatchDepthRef.current === 0) {
      commitPendingHistory();
    }
  }, [commitPendingHistory]);

  function applyEditorSnapshot(snapshot: EditorSnapshot) {
    setSize(snapshot.size);
    setCampanaBellType(snapshot.campanaBellType);
    setPaintMode(snapshot.paintMode);
    setSolidColorSource(snapshot.solidColorSource);
    setSolidPresetId(snapshot.solidPresetId);
    setSolidPaintColor(snapshot.solidPaintColor);
    setGradientPresetId(snapshot.gradientPresetId);
    setGradientStartColor(snapshot.gradientStartColor);
    setGradientEndColor(snapshot.gradientEndColor);
    setGradientPosition(snapshot.gradientPosition);
    setTextLayers(snapshot.textLayers);
    setActiveLayerId(snapshot.activeLayerId);
    setPositionPresetId(snapshot.positionPresetId);
    setTextColorOptionId(snapshot.textColorOptionId);
  }

  const handleUndo = useCallback(() => {
    const pendingTarget = pendingHistoryStartRef.current;
    if (pendingTarget) {
      historyBatchDepthRef.current = 0;
      clearPendingHistoryTimer();
      const current = createEditorSnapshot();
      const isSamePending = JSON.stringify(pendingTarget) === JSON.stringify(current);
      pendingHistoryStartRef.current = null;
      if (isSamePending) return;
      isApplyingHistoryRef.current = true;
      applyEditorSnapshot(pendingTarget);
      lastSnapshotRef.current = pendingTarget;
      setHistoryFuture((prev) => [current, ...prev].slice(0, HISTORY_LIMIT));
      queueMicrotask(() => {
        isApplyingHistoryRef.current = false;
      });
      return;
    }
    if (!historyPast.length) return;
    historyBatchDepthRef.current = 0;
    const target = historyPast[historyPast.length - 1];
    const current = createEditorSnapshot();
    isApplyingHistoryRef.current = true;
    applyEditorSnapshot(target);
    lastSnapshotRef.current = target;
    setHistoryPast((prev) => prev.slice(0, -1));
    setHistoryFuture((prev) => [current, ...prev].slice(0, HISTORY_LIMIT));
    queueMicrotask(() => {
      isApplyingHistoryRef.current = false;
    });
  }, [clearPendingHistoryTimer, createEditorSnapshot, historyPast]);

  const handleRedo = useCallback(() => {
    if (!historyFuture.length) return;
    const target = historyFuture[0];
    const current = createEditorSnapshot();
    isApplyingHistoryRef.current = true;
    applyEditorSnapshot(target);
    lastSnapshotRef.current = target;
    setHistoryFuture((prev) => prev.slice(1));
    setHistoryPast((prev) => [...prev, current].slice(-HISTORY_LIMIT));
    queueMicrotask(() => {
      isApplyingHistoryRef.current = false;
    });
  }, [createEditorSnapshot, historyFuture]);

  function handleResetEditor() {
    preview3DRef.current?.resetView();
    setIsModelUpsideDown(false);
    resetEditorProgress();
  }

  async function handleDownloadPreview() {
    if (isDownloadingPreview) return;
    setIsDownloadingPreview(true);
    try {
      const exportedPng = await preview3DRef.current?.downloadSnapshot({ format: "png" });
      if (exportedPng) return;
      await preview3DRef.current?.downloadSnapshot({ format: "jpg" });
    } finally {
      setIsDownloadingPreview(false);
    }
  }

  function handleToggleUpsideDown() {
    preview3DRef.current?.toggleUpsideDown();
    setIsModelUpsideDown((current) => !current);
  }

  function handleFocusCampanaType() {
    preview3DRef.current?.focusCampanaBase();
  }

  function handleBlurCampanaType() {
    preview3DRef.current?.restoreFromCampanaBaseFocus();
  }

  function addSecondTextLayer() {
    if (textLayers.length >= maxTextLayers) return;
    const nextFace = isGuiroVariant ? getNextGuiroFace(textLayers) : "front_up";
    const newLayer: TextLayerState = {
      id: `layer-${Date.now()}`,
      text: "",
      color: "#ffffff",
      fontId: TEXT_FONT_OPTIONS[0].id,
      face: nextFace,
      lockScale: true,
      scaleRatio: 1,
      transform: {
        scaleX: 90,
        scaleY: 90,
        offsetX: 0,
        offsetY: 14,
        rotation: getDefaultRotationByFace(nextFace),
      },
    };
    setTextLayers((current) => [...current, newLayer]);
    setActiveLayerId(newLayer.id);
    setPositionPresetId("custom");
  }

  function removeActiveLayer() {
    if (textLayers.length <= 1) return;
    const remaining = textLayers.filter((layer) => layer.id !== activeLayerId);
    setTextLayers(remaining);
    setActiveLayerId(remaining[0].id);
    setPositionPresetId("custom");
  }

  useEffect(() => {
    if (!textLayers.some((layer) => layer.id === activeLayerId)) {
      setActiveLayerId(textLayers[0]?.id || "layer-1");
    }
  }, [activeLayerId, textLayers]);
  useEffect(() => {
    if (!isGuiroVariant) return;
    if (!activeLayer) return;
    if (activeLayer.face !== "left" && activeLayer.face !== "right") return;
    // Solo migra capas laterales "legadas" que siguen en rotación neutra.
    if (activeLayer.transform.rotation !== 0) return;
    updateActiveLayer((layer) => ({
      ...layer,
      transform: {
        ...layer.transform,
        rotation: -90,
      },
    }));
  }, [activeLayer, activeLayerId, isGuiroVariant, updateActiveLayer]);
  useEffect(() => {
    setTextColorOptionId(resolveTextColorOptionId(activeLayerColor));
  }, [activeLayerColor]);

  useEffect(() => {
    if (!isProductSelected) return;
    isApplyingHistoryRef.current = false;
    lastSnapshotRef.current = null;
    pendingHistoryStartRef.current = null;
    historyBatchDepthRef.current = 0;
    clearPendingHistoryTimer();
    setHistoryPast([]);
    setHistoryFuture([]);
    preview3DRef.current?.resetView();
    setIsModelUpsideDown(false);
    resetEditorProgress();
    // Reset de historial al cambiar de producto/tipo.
  }, [
    clearPendingHistoryTimer,
    isProductSelected,
    resetEditorProgress,
    selectedProductFromQuery,
    selectedCampanaType,
  ]);

  useEffect(() => {
    if (!isCromadaVariant) return;
    if (paintMode !== "solid") {
      setPaintMode("solid");
    }
    if (solidColorSource !== "preset") {
      setSolidColorSource("preset");
    }
    const cromadaPreset = CROMADA_TINT_PRESETS.find((preset) => preset.id === solidPresetId) || CROMADA_TINT_PRESETS[0];
    if (cromadaPreset && solidPresetId !== cromadaPreset.id) {
      setSolidPresetId(cromadaPreset.id);
      setSolidPaintColor(resolve3DPaintColor(cromadaPreset.fill));
    }
  }, [isCromadaVariant, paintMode, solidColorSource, solidPresetId]);

  useEffect(() => {
    if (!isProductSelected) return;
    const current = createEditorSnapshot();
    const previous = lastSnapshotRef.current;
    if (!previous) {
      lastSnapshotRef.current = current;
      return;
    }
    const isSame = JSON.stringify(current) === JSON.stringify(previous);
    if (isSame) return;
    if (isApplyingHistoryRef.current) {
      lastSnapshotRef.current = current;
      return;
    }

    if (!pendingHistoryStartRef.current) {
      pendingHistoryStartRef.current = previous;
      setHistoryFuture([]);
    }
    lastSnapshotRef.current = current;
    if (historyBatchDepthRef.current > 0) return;
    clearPendingHistoryTimer();
    historyCommitTimerRef.current = window.setTimeout(() => {
      historyCommitTimerRef.current = null;
      commitPendingHistory();
    }, HISTORY_COMMIT_IDLE_MS);
  }, [
    activeLayerId,
    campanaBellType,
    clearPendingHistoryTimer,
    commitPendingHistory,
    createEditorSnapshot,
    gradientEndColor,
    gradientPosition,
    gradientPresetId,
    gradientStartColor,
    isProductSelected,
    paintMode,
    positionPresetId,
    size,
    solidColorSource,
    solidPaintColor,
    solidPresetId,
    textColorOptionId,
    textLayers,
  ]);

  useEffect(
    () => () => {
      historyBatchDepthRef.current = 0;
      pendingHistoryStartRef.current = null;
      clearPendingHistoryTimer();
    },
    [clearPendingHistoryTimer]
  );

  useEffect(() => {
    if (!isProductSelected) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.isComposing || event.altKey) return;
      const hasModifier = event.metaKey || event.ctrlKey;
      if (!hasModifier) return;

      const key = event.key.toLowerCase();
      const wantsUndo = key === "z" && !event.shiftKey;
      const wantsRedo =
        (key === "z" && event.shiftKey) || (key === "y" && event.ctrlKey && !event.metaKey);

      if (wantsUndo && (historyPast.length || pendingHistoryStartRef.current)) {
        event.preventDefault();
        handleUndo();
        return;
      }
      if (wantsRedo && historyFuture.length) {
        event.preventDefault();
        handleRedo();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleRedo, handleUndo, historyFuture.length, historyPast.length, isProductSelected]);

  const canUndo = historyPast.length > 0 || Boolean(pendingHistoryStartRef.current);
  const canRedo = historyFuture.length > 0;

  const textTransformFor3D = useMemo(
    () =>
      textLayers.map((layer) => {
        const layerFont = TEXT_FONT_OPTIONS.find((option) => option.id === layer.fontId) || TEXT_FONT_OPTIONS[0];
        return {
          id: layer.id,
          text: layer.text,
          textColor: layer.color,
          textFontFamily: layerFont.family,
          textFontWeight: layerFont.weight,
          face: layer.face,
          textTransform: layer.transform,
        };
      }),
    [textLayers]
  );

  const editorFaceClass = useMemo(() => {
    if (product === "campana") return styles.editorFaceCampana;
    if (product === "guiro") return styles.editorFaceGuiro;
    return styles.editorFaceMaraca;
  }, [product]);
  const editorFaceVariantClass = useMemo(() => {
    if (!isGuiroVariant) return "";
    return activeLayerFace === "left" || activeLayerFace === "right"
      ? styles.editorFaceGuiroLateral
      : "";
  }, [activeLayerFace, isGuiroVariant]);

  function resetTextTransform() {
    updateActiveLayer((layer) => ({
      ...layer,
      transform: {
        scaleX: 100,
        scaleY: 100,
        offsetX: 0,
        offsetY: 0,
        rotation: 0,
      },
    }));
    setPositionPresetId("center");
  }

  function applyTransformPreset(preset: "center" | "top" | "bottom" | "diagonal") {
    if (preset === "center") {
      updateActiveLayer((layer) => ({
        ...layer,
        transform: { ...layer.transform, offsetX: 0, offsetY: 0, rotation: 0 },
      }));
      return;
    }
    if (preset === "top") {
      updateActiveLayer((layer) => ({
        ...layer,
        transform: { ...layer.transform, offsetX: 0, offsetY: -12, rotation: 0 },
      }));
      return;
    }
    if (preset === "bottom") {
      updateActiveLayer((layer) => ({
        ...layer,
        transform: { ...layer.transform, offsetX: 0, offsetY: 12, rotation: 0 },
      }));
      return;
    }
    updateActiveLayer((layer) => ({
      ...layer,
      transform: { ...layer.transform, offsetX: 6, offsetY: 4, rotation: -10 },
    }));
  }

  function handlePositionPresetChange(value: (typeof POSITION_PRESET_OPTIONS)[number]["id"]) {
    setPositionPresetId(value);
    if (value === "custom") return;
    applyTransformPreset(value);
  }

  function handleTextColorOptionChange(value: string) {
    setTextColorOptionId(value);
    const selected = TEXT_COLOR_OPTIONS.find((option) => option.id === value);
    if (!selected || value === "custom" || !selected.hex) return;
    updateActiveLayer((layer) => ({
      ...layer,
      color: selected.hex,
    }));
  }

  function handleScaleChange(axis: "x" | "y", nextValue: number) {
    setPositionPresetId("custom");
    updateActiveLayer((layer) => {
      if (layer.lockScale) {
        const safeRatio = clampValue(Number.isFinite(layer.scaleRatio) ? layer.scaleRatio : 1, 0.25, 4);
        if (axis === "x") {
          const nextScaleY = clampValue(Math.round(nextValue * safeRatio), TEXT_SCALE_MIN, TEXT_SCALE_MAX);
          return {
            ...layer,
            transform: { ...layer.transform, scaleX: nextValue, scaleY: nextScaleY },
          };
        }
        const nextScaleX = clampValue(Math.round(nextValue / safeRatio), TEXT_SCALE_MIN, TEXT_SCALE_MAX);
        return {
          ...layer,
          transform: { ...layer.transform, scaleX: nextScaleX, scaleY: nextValue },
        };
      }
      const nextLayer = {
        ...layer,
        transform: {
          ...layer.transform,
          scaleX: axis === "x" ? nextValue : layer.transform.scaleX,
          scaleY: axis === "y" ? nextValue : layer.transform.scaleY,
        },
      };
      const nextRatio = clampValue(
        nextLayer.transform.scaleY / Math.max(nextLayer.transform.scaleX, 1),
        0.25,
        4
      );
      return {
        ...nextLayer,
        scaleRatio: nextRatio,
      };
    });
  }

  function insertSymbolIntoActiveLayer(symbol: string) {
    updateActiveLayer((layer) => {
      const nextText = clampTextLength(`${layer.text}${symbol}`);
      return {
        ...layer,
        text: nextText,
      };
    });
  }

  function handleEditorPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const surface = event.currentTarget;
    const bounds = surface.getBoundingClientRect();
    dragStateRef.current = {
      pointerId: event.pointerId,
      originOffsetX: activeLayerTransform.offsetX,
      originOffsetY: activeLayerTransform.offsetY,
      startClientX: event.clientX,
      startClientY: event.clientY,
      surfaceWidth: Math.max(bounds.width, 1),
      surfaceHeight: Math.max(bounds.height, 1),
    };
    setIsDraggingText(true);
    surface.setPointerCapture(event.pointerId);
  }

  function handleEditorPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggingText || dragStateRef.current.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - dragStateRef.current.startClientX;
    const deltaY = event.clientY - dragStateRef.current.startClientY;
    const mappedX = dragStateRef.current.originOffsetX + (deltaX / dragStateRef.current.surfaceWidth) * 60;
    const mappedY = dragStateRef.current.originOffsetY + (deltaY / dragStateRef.current.surfaceHeight) * 60;
    setPositionPresetId("custom");
    updateActiveLayer((layer) => ({
      ...layer,
      transform: {
        ...layer.transform,
        offsetX: clampValue(Math.round(mappedX), TEXT_OFFSET_X_MIN, TEXT_OFFSET_X_MAX),
        offsetY: clampValue(Math.round(mappedY), TEXT_OFFSET_Y_MIN, TEXT_OFFSET_Y_MAX),
      },
    }));
  }

  function handleEditorPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (dragStateRef.current.pointerId !== event.pointerId) return;
    setIsDraggingText(false);
    dragStateRef.current.pointerId = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  async function addCurrentPersonalizationToCart() {
    if (!selectedCheckoutBinding) {
      throw new Error("Este instrumento aún no tiene conexión de checkout configurada.");
    }

    const response = await fetch("/api/personaliza/checkout-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        base_slug: selectedCheckoutBinding.productSlug,
        personalization_sku: selectedCheckoutBinding.personalizationSku,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      detail?: string;
      base?: CheckoutItemLookup;
      personalization?: CheckoutItemLookup;
    };

    if (!response.ok || !payload.base || !payload.personalization) {
      throw new Error(payload.detail || "No pudimos preparar los productos para el checkout.");
    }

    await addItem(payload.base.id, 1, {
      product_name: payload.base.name,
      product_slug: payload.base.slug,
      product_sku: payload.base.sku,
      image_url: payload.base.image_url,
      brand: payload.base.brand,
      stock_status: payload.base.stock_status,
      unit_price: payload.base.price,
      compare_price: payload.base.compare_price,
    });

    await addItem(payload.personalization.id, 1, {
      product_name: payload.personalization.name,
      product_slug: payload.personalization.slug,
      product_sku: payload.personalization.sku,
      image_url: payload.personalization.image_url,
      brand: payload.personalization.brand,
      stock_status: payload.personalization.stock_status,
      unit_price: payload.personalization.price,
      compare_price: payload.personalization.compare_price,
    });

    let personalizationPreviewImages: Record<string, string> | null = null;
    try {
      const capturePreviewView = async (
        view: "front" | "left" | "right",
        avoidDataUrls: string[] = []
      ): Promise<string> => {
        let fallback = "";
        for (let attempt = 0; attempt < 2; attempt += 1) {
          const snapshot = await preview3DRef.current?.captureSnapshotDataUrl({
            format: "jpg",
            view,
            watermark: false,
            maxWidth: 720,
            quality: 0.78,
          });
          const normalized = (snapshot || "").trim();
          if (!normalized) continue;
          fallback = normalized;
          if (!avoidDataUrls.includes(normalized)) return normalized;
          await new Promise<void>((resolve) => window.setTimeout(() => resolve(), 120));
        }
        return fallback;
      };

      const snapshotFront = await capturePreviewView("front");
      const snapshotLeft = await capturePreviewView("left", snapshotFront ? [snapshotFront] : []);
      const snapshotRight = await capturePreviewView(
        "right",
        [snapshotFront, snapshotLeft].map((value) => value.trim()).filter(Boolean)
      );
      const imageMap = {
        front: snapshotFront || "",
        left: snapshotLeft || "",
        right: snapshotRight || "",
      };
      const hasAnyImage = Object.values(imageMap).some((value) => value.trim().length > 0);
      personalizationPreviewImages = hasAnyImage ? imageMap : null;
    } catch {
      personalizationPreviewImages = null;
    }

    const checkoutContextWithPreviews: Record<string, unknown> = personalizationPreviewImages
      ? {
          ...personalizationCheckoutContext,
          preview_images: personalizationPreviewImages,
        }
      : personalizationCheckoutContext;

    const previousContext = readPersonalizaCheckoutContext();
    const previousEntries =
      Array.isArray(previousContext?.entries) &&
      previousContext?.entries.every((entry) => entry && typeof entry === "object")
        ? (previousContext.entries as Record<string, unknown>[])
        : [];
    const nextEntry: Record<string, unknown> = {
      id: `cfg-${Date.now()}`,
      created_at: new Date().toISOString(),
      ...(checkoutContextWithPreviews as Record<string, unknown>),
    };
    const nextEntries = [...previousEntries, nextEntry].slice(-20);

    persistPersonalizaCheckoutContext({
      ...checkoutContextWithPreviews,
      entries: nextEntries,
      entries_count: nextEntries.length,
      latest_entry_id: nextEntry.id,
    });
  }

  async function handleAddToCart() {
    if (addToCartStatus === "sending" || purchaseStatus === "sending") return;
    try {
      setAddToCartStatus("sending");
      await addCurrentPersonalizationToCart();
      setAddToCartStatus("success");
      router.push("/personaliza");
    } catch (error) {
      setAddToCartStatus("error");
      console.warn(error instanceof Error ? error.message : "No pudimos añadir esta personalización al carrito.");
    }
  }

  async function handleBuyNow() {
    if (purchaseStatus === "sending" || addToCartStatus === "sending") return;
    try {
      setPurchaseStatus("sending");
      await addCurrentPersonalizationToCart();
      setPurchaseStatus("success");
      router.push(checkoutHref);
    } catch (error) {
      setPurchaseStatus("error");
      console.warn(error instanceof Error ? error.message : "No pudimos continuar al checkout.");
    }
  }

  function handleCampanaCardClick() {
    if (showCampanaTypes) {
      campanaTypeSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      return;
    }
    setShowCampanaTypes(true);
  }

  function closeCampanaTypesAndGoTop() {
    setShowCampanaTypes(false);
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function handleCloseCampanaTypes() {
    closeCampanaTypesAndGoTop();
  }

  if (!isDesktop) {
    return (
      <main className={styles.pageShell}>
        <section className={styles.mobileOnlyCard}>
          <p className={styles.kicker}>Personaliza tu instrumento</p>
          <h1>Disponible solo en desktop por ahora</h1>
          <p>
            Esta experiencia está optimizada para pantallas grandes. Si quieres cotizar de inmediato,
            escríbenos por WhatsApp y te ayudamos con la personalización.
          </p>
          <div className={styles.mobileActions}>
            <a href={whatsappHref} target="_blank" rel="noreferrer" className={styles.ctaPrimary}>
              Contactar por WhatsApp
            </a>
            <Link href="/catalogo" className={styles.ctaGhost}>
              Ir al catálogo
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (!isProductSelected) {
    return (
      <main className={styles.pageShell}>
        <section className="catalog-context-strip" aria-label="Contexto del personalizador">
          <div className="catalog-context-banner" aria-label="Encabezado del personalizador">
            <div className="catalog-context-banner-copy">
              <h1 className="catalog-context-title">Personaliza tu instrumento</h1>
              <p className="catalog-context-subtitle">
                Elige el instrumento que quieres personalizar.
              </p>
            </div>
          </div>
        </section>

        <section
          ref={selectorGridRef}
          className={styles.selectorGrid}
          aria-label="Selecciona un tipo de instrumento"
        >
          {PERSONALIZABLE_PRODUCTS.map((item) => {
            const isComingSoon = item.id === "maraca";
            return item.id === "campana" ? (
              <button
                key={item.id}
                ref={campanaCardRef}
                type="button"
                className={`${styles.selectorCard} ${styles.selectorCardButton}${showCampanaTypes ? ` ${styles.selectorCardSelected}` : ""}`}
                onClick={handleCampanaCardClick}
                aria-expanded={showCampanaTypes}
                aria-controls="campana-types-panel"
                aria-pressed={showCampanaTypes}
              >
                <div className={styles.selectorMedia}>
                  <Image
                    src={item.cardImage}
                    alt={item.name}
                    fill
                    sizes="(max-width: 1210px) 100vw, 33vw"
                    className={styles.selectorMediaImage}
                  />
                </div>
                <div className={styles.selectorBody}>
                  <h2>{item.name}</h2>
                  <p>{item.description}</p>
                </div>
              </button>
            ) : isComingSoon ? (
              <div
                key={item.id}
                className={`${styles.selectorCard} ${styles.selectorCardDisabled}`}
                aria-disabled="true"
              >
                <div className={styles.selectorMedia}>
                  <Image
                    src={item.cardImage}
                    alt={item.name}
                    fill
                    sizes="(max-width: 1210px) 100vw, 33vw"
                    className={styles.selectorMediaImage}
                  />
                  <span className={styles.selectorSoonBadge}>Próximamente</span>
                </div>
                <div className={styles.selectorBody}>
                  <h2>{item.name}</h2>
                  <p>Disponible pronto en el editor.</p>
                </div>
              </div>
            ) : (
              <Link
                key={item.id}
                href={`/personaliza?producto=${item.id}`}
                className={styles.selectorCard}
              >
                <div className={styles.selectorMedia}>
                  <Image
                    src={item.cardImage}
                    alt={item.name}
                    fill
                    sizes="(max-width: 1210px) 100vw, 33vw"
                    className={styles.selectorMediaImage}
                  />
                </div>
                <div className={styles.selectorBody}>
                  <h2>{item.name}</h2>
                  <p>{item.description}</p>
                </div>
              </Link>
            );
          })}
        </section>

        <section
          id="campana-types-panel"
          ref={campanaTypeSectionRef}
          className={`${styles.campanaTypesPanel}${showCampanaTypes ? ` ${styles.campanaTypesPanelOpen}` : ""}`}
          aria-label="Tipos de campana"
          aria-hidden={!showCampanaTypes}
        >
          <div className={styles.campanaTypesActions}>
            <button
              type="button"
              className={styles.campanaTypesClose}
              onClick={handleCloseCampanaTypes}
              aria-label="Volver a elegir instrumento"
            >
              × Volver
            </button>
          </div>
          <div className={styles.campanaTypesGrid}>
            {CAMPANA_TYPE_OPTIONS.map((option, index) => (
              <Link
                key={option.id}
                href={`/personaliza?producto=campana&tipoCampana=${option.id}`}
                className={`${styles.campanaTypeCard}${showCampanaTypes ? ` ${styles.campanaTypeCardVisible}` : ""}`}
                style={{ transitionDelay: `${80 + index * 90}ms` }}
              >
                <div className={`${styles.selectorMedia} ${styles.campanaTypeMedia}`}>
                  <Image
                    src={option.cardImage}
                    alt={option.name}
                    fill
                    sizes="(max-width: 1210px) 100vw, 50vw"
                    className={`${styles.selectorMediaImage} ${styles.campanaTypeMediaImage}`}
                  />
                </div>
                <div className={`${styles.selectorBody} ${styles.campanaTypeBody}`}>
                  <h2>{option.name}</h2>
                  <p>{option.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={`${styles.pageShell} ${styles.pageShellEditor}`}>
      <section className="catalog-context-strip" aria-label="Contexto del editor">
        <div className="catalog-context-banner" aria-label="Encabezado del editor">
          <div className="catalog-context-banner-copy">
            <h1 className="catalog-context-title">{selectedProduct.name}</h1>
            <p className="catalog-context-subtitle">
              Ajusta tamaño, acabado y texto con editor visual en tiempo real.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.workspace}>
        <div className={styles.configPanel}>
          <div className={styles.productBadgeRow}>
            <span className={styles.productBadge}>Producto: {selectedProduct.name}</span>
            <Link href="/personaliza" className={styles.changeProductLink}>
              Cambiar producto
            </Link>
          </div>

          {isCampanaVariant ? (
            <div className={styles.sizeTypeRow}>
              <label className={styles.fieldLabel}>
                Tamaño
                <select
                  value={size}
                  onChange={(event) => setSize(event.target.value as PersonalizableSize)}
                  className={styles.selectField}
                >
                  {availableSizes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
                <label className={styles.fieldLabel}>
                  Tipo
                <select
                  value={campanaBellType}
                  onChange={(event) => setCampanaBellType(event.target.value as "cerrada" | "abierta")}
                  onFocus={handleFocusCampanaType}
                  onClick={handleFocusCampanaType}
                  onBlur={handleBlurCampanaType}
                    className={styles.selectField}
                  >
                    <option value="cerrada">Cerrada</option>
                  <option value="abierta">Abierta</option>
                </select>
              </label>
            </div>
          ) : (
            <label className={styles.fieldLabel}>
              Tamaño
              <select
                value={size}
                onChange={(event) => setSize(event.target.value as PersonalizableSize)}
                className={styles.selectField}
              >
                {availableSizes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className={styles.fieldLabel}>
            Estilo
            <div className={styles.paintModeSwitch}>
              <button
                type="button"
                className={`${styles.paintModeButton}${paintMode === "solid" ? ` ${styles.paintModeButtonActive}` : ""}`}
                onClick={() => setPaintMode("solid")}
              >
                Un color
              </button>
              {!isCromadaVariant ? (
                <button
                  type="button"
                  className={`${styles.paintModeButton}${paintMode === "gradient" ? ` ${styles.paintModeButtonActive}` : ""}`}
                  onClick={() => setPaintMode("gradient")}
                >
                  Degradado
                </button>
              ) : null}
            </div>
            <div className={styles.styleGrid}>
              {(paintMode === "solid" ? availableSolidPresets : GRADIENT_STYLE_PRESETS).map((preset) => {
                const isActive = paintMode === "solid" ? solidColorSource === "preset" && preset.id === solidPresetId : preset.id === gradientPresetId;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      if (paintMode === "solid") {
                        setSolidColorSource("preset");
                        setSolidPresetId(preset.id);
                        setSolidPaintColor(resolve3DPaintColor(preset.fill));
                        return;
                      }
                      setGradientPresetId(preset.id);
                      const parsed = parseGradientFromFill(preset.fill);
                      setGradientStartColor(parsed.startColor);
                      setGradientEndColor(parsed.endColor);
                      setGradientPosition(50);
                    }}
                    className={`${styles.styleButton}${isActive ? ` ${styles.styleButtonActive}` : ""}`}
                  >
                    <span className={styles.styleSwatch} style={{ background: preset.fill }} aria-hidden="true" />
                    <span>{preset.label}</span>
                  </button>
                );
              })}
            </div>
            {paintMode === "solid" && !isCromadaVariant ? (
              <div className={styles.inlinePaintControl}>
                <button
                  type="button"
                  className={`${styles.styleButton}${solidColorSource === "custom" ? ` ${styles.styleButtonActive}` : ""}`}
                  onClick={() => setSolidColorSource("custom")}
                >
                  <span className={styles.styleSwatch} style={{ background: solidPaintColor }} aria-hidden="true" />
                  <span>Color personalizado</span>
                </button>
                <label className={styles.inlineColorField}>
                  Elegir color <span className={styles.pickerValue}>{solidPaintColor.toUpperCase()}</span>
                  <input
                    type="color"
                    value={solidPaintColor}
                    onChange={(event) => {
                      setSolidColorSource("custom");
                      setSolidPaintColor(event.target.value);
                    }}
                    style={getColorPickerStyle(solidPaintColor)}
                    className={styles.colorPicker}
                  />
                </label>
              </div>
            ) : paintMode === "gradient" ? (
              <div className={styles.inlinePaintControlGradient}>
                <div className={styles.dualColorRow}>
                  <label className={styles.sliderField}>
                    Color A: <span className={styles.pickerValue}>{gradientStartColor.toUpperCase()}</span>
                    <input
                      type="color"
                      value={gradientStartColor}
                      onChange={(event) => setGradientStartColor(event.target.value)}
                      style={getColorPickerStyle(gradientStartColor)}
                      className={styles.colorPicker}
                    />
                  </label>
                  <label className={styles.sliderField}>
                    Color B: <span className={styles.pickerValue}>{gradientEndColor.toUpperCase()}</span>
                    <input
                      type="color"
                      value={gradientEndColor}
                      onChange={(event) => setGradientEndColor(event.target.value)}
                      style={getColorPickerStyle(gradientEndColor)}
                      className={styles.colorPicker}
                    />
                  </label>
                </div>
                <label className={styles.sliderField}>
                  Posición de mezcla: {gradientPosition}%
                  <input
                    type="range"
                    min={5}
                    max={95}
                    step={1}
                    value={gradientPosition}
                    onChange={(event) => setGradientPosition(Number(event.target.value))}
                  />
                </label>
              </div>
            ) : null}
          </div>

          <label className={styles.fieldLabel}>
            {selectedProduct.textLabel}
            <div className={styles.layerToolbar}>
              <label className={styles.layerField}>
                Capa activa
                <select
                  value={activeLayerId}
                  onChange={(event) => {
                    setActiveLayerId(event.target.value);
                    setPositionPresetId("custom");
                  }}
                  className={styles.selectField}
                >
                  {textLayers.map((layer, index) => (
                    <option key={layer.id} value={layer.id}>
                      {`Capa ${index + 1}${
                        isGuiroVariant
                          ? ` · ${GUIRO_TEXT_FACE_OPTIONS.find((option) => option.id === layer.face)?.label || "Frente"}`
                          : ""
                      }`}
                    </option>
                  ))}
                </select>
              </label>
              {isGuiroVariant ? (
                <label className={styles.layerField}>
                  Cara
                  <select
                    value={activeLayerFace}
                    onChange={(event) => {
                      const nextFace = event.target.value as GuiroTextFace;
                      updateActiveLayer((layer) => ({
                        ...layer,
                        face: nextFace,
                      }));
                      preview3DRef.current?.focusGuiroFace(nextFace);
                    }}
                    className={styles.selectField}
                  >
                    {GUIRO_TEXT_FACE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <div className={styles.layerActions}>
                <button
                  type="button"
                  className={styles.adjustReset}
                  onClick={addSecondTextLayer}
                  disabled={textLayers.length >= maxTextLayers}
                >
                  + Capa
                </button>
                <button
                  type="button"
                  className={styles.adjustReset}
                  onClick={removeActiveLayer}
                  disabled={textLayers.length <= 1}
                >
                  Eliminar
                </button>
              </div>
            </div>
            <input
              value={activeLayerText}
              onChange={(event) =>
                updateActiveLayer((layer) => ({
                  ...layer,
                  text: clampTextLength(event.target.value),
                }))
              }
              onFocus={() => {
                setIsTextInputFocused(true);
                beginHistoryBatch();
              }}
              onBlur={() => {
                setIsTextInputFocused(false);
                endHistoryBatch();
              }}
              className={styles.textField}
              placeholder={selectedProduct.textPlaceholder}
            />
            <span className={styles.helperText}>
              {CUSTOM_TEXT_MAX_LENGTH - Array.from(activeLayerText).length} caracteres disponibles
            </span>
            <div className={styles.symbolTools}>
              <span className={styles.symbolToolsLabel}>Símbolos rápidos</span>
              <div className={styles.symbolGrid}>
                {QUICK_SYMBOL_OPTIONS.map((symbol) => (
                  <button
                    key={symbol}
                    type="button"
                    className={styles.symbolButton}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      setIsTextInputFocused(true);
                    }}
                    onClick={() => {
                      setIsTextInputFocused(true);
                      insertSymbolIntoActiveLayer(symbol);
                    }}
                    disabled={Array.from(activeLayerText).length >= CUSTOM_TEXT_MAX_LENGTH}
                    aria-label={`Insertar símbolo ${symbol}`}
                    title={`Insertar ${symbol}`}
                  >
                    {symbol}
                  </button>
                ))}
              </div>
            </div>
          </label>

          <div className={styles.adjustCard} aria-label="Ajustes de texto">
            <div className={styles.adjustHeader}>
              <p>Ajuste de texto</p>
              <button
                type="button"
                className={styles.adjustReset}
                onClick={resetTextTransform}
              >
                Restablecer
              </button>
            </div>
            <label className={styles.scaleLockRow}>
              <input
                type="checkbox"
                checked={activeLayerLockScale}
                onChange={(event) => {
                  const shouldLock = event.target.checked;
                  updateActiveLayer((layer) => ({
                    ...layer,
                    lockScale: shouldLock,
                    scaleRatio: clampValue(
                      layer.transform.scaleY / Math.max(layer.transform.scaleX, 1),
                      0.25,
                      4
                    ),
                    transform: layer.transform,
                  }));
                }}
              />
              <span>Escala proporcional (X/Y juntas)</span>
            </label>
            <label className={styles.sliderField}>
              Escala X: {activeLayerTransform.scaleX}%
              <input
                type="range"
                min={TEXT_SCALE_MIN}
                max={TEXT_SCALE_MAX}
                step={1}
                value={activeLayerTransform.scaleX}
                onChange={(event) => handleScaleChange("x", Number(event.target.value))}
              />
            </label>
            <label className={styles.sliderField}>
              Escala Y: {activeLayerTransform.scaleY}%
              <input
                type="range"
                min={TEXT_SCALE_MIN}
                max={TEXT_SCALE_MAX}
                step={1}
                value={activeLayerTransform.scaleY}
                onChange={(event) => handleScaleChange("y", Number(event.target.value))}
              />
            </label>
            <label className={styles.sliderField}>
              Posición horizontal: {activeLayerTransform.offsetX}
              <input
                type="range"
                min={TEXT_OFFSET_X_MIN}
                max={TEXT_OFFSET_X_MAX}
                step={1}
                value={activeLayerTransform.offsetX}
                onChange={(event) => {
                  setPositionPresetId("custom");
                  const nextValue = Number(event.target.value);
                  updateActiveLayer((layer) => ({
                    ...layer,
                    transform: { ...layer.transform, offsetX: nextValue },
                  }));
                }}
              />
            </label>
            <label className={styles.sliderField}>
              Posición vertical: {activeLayerTransform.offsetY}
              <input
                type="range"
                min={TEXT_OFFSET_Y_MIN}
                max={TEXT_OFFSET_Y_MAX}
                step={1}
                value={activeLayerTransform.offsetY}
                onChange={(event) => {
                  setPositionPresetId("custom");
                  const nextValue = Number(event.target.value);
                  updateActiveLayer((layer) => ({
                    ...layer,
                    transform: { ...layer.transform, offsetY: nextValue },
                  }));
                }}
              />
            </label>
            <label className={styles.sliderField}>
              Rotación: {activeLayerTransform.rotation}°
              <input
                type="range"
                min={TEXT_ROTATION_MIN}
                max={TEXT_ROTATION_MAX}
                step={1}
                value={activeLayerTransform.rotation}
                onChange={(event) => {
                  setPositionPresetId("custom");
                  const nextValue = Number(event.target.value);
                  updateActiveLayer((layer) => ({
                    ...layer,
                    transform: { ...layer.transform, rotation: nextValue },
                  }));
                }}
              />
            </label>
            <p className={styles.adjustHint}>Controles con límites para evitar que el texto salga de la zona útil.</p>
          </div>

        </div>

        <div className={styles.previewPanel}>
          <div className={styles.preview3dBlock}>
            <div className={styles.previewHeader}>
              <p>Vista 3D beta</p>
              <span>{selectedProduct.name}</span>
            </div>
            <div className={styles.preview3dStage}>
              <div className={styles.preview3dCanvas}>
                <ModelPreview3D
                  ref={preview3DRef}
                  product={product}
                  campanaType={selectedCampanaType}
                  campanaBellType={campanaBellType}
                  focusOnText={shouldFocusTextIn3D}
                  focusTextOffsetX={activeLayerTransform.offsetX}
                  focusTextOffsetY={activeLayerTransform.offsetY}
                  activeTextFace={activeLayerFace}
                  paintConfig={paintConfig}
                  textLayers={textTransformFor3D}
                />
              </div>
              <aside className={styles.editorActionsRail} aria-label="Acciones del editor">
                <button
                  type="button"
                  className={styles.editorActionButtonBlank}
                  aria-label="Voltear modelo"
                  title="Voltear modelo"
                  onClick={handleToggleUpsideDown}
                >
                  <Image
                    src={
                      product === "guiro"
                        ? "/personaliza/icons/guiro-vec.svg"
                        : "/personaliza/icons/camapana-vec.svg"
                    }
                    alt=""
                    aria-hidden
                    width={26}
                    height={26}
                    className={`${styles.editorActionButtonBlankIcon}${
                      isModelUpsideDown ? ` ${styles.editorActionButtonBlankIconRotated}` : ""
                    }`}
                  />
                </button>
                <button
                  type="button"
                  className={styles.editorActionButton}
                  onClick={handleUndo}
                  disabled={!canUndo}
                >
                  Deshacer
                </button>
                <button
                  type="button"
                  className={styles.editorActionButton}
                  onClick={handleRedo}
                  disabled={!canRedo}
                >
                  Rehacer
                </button>
                <button
                  type="button"
                  className={styles.editorActionButton}
                  onClick={handleDownloadPreview}
                  disabled={isDownloadingPreview}
                >
                  {isDownloadingPreview ? "Exportando..." : "Descargar"}
                </button>
                <button type="button" className={styles.editorActionButton} onClick={handleResetEditor}>
                  Reiniciar
                </button>
              </aside>
            </div>
          </div>

          <div className={styles.previewHeader}>
            <p>Editor visual de texto</p>
            <span>
              {selectedProduct.name} · {selectedSize.label}
            </span>
          </div>

          <div className={styles.editorInteractivePanel}>
            <div className={styles.editorToolbar}>
              <label className={styles.toolbarField}>
                Posición
                <select
                  value={positionPresetId}
                  onChange={(event) =>
                    handlePositionPresetChange(
                      event.target.value as (typeof POSITION_PRESET_OPTIONS)[number]["id"]
                    )
                  }
                  className={styles.toolbarSelect}
                >
                  {POSITION_PRESET_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.toolbarField}>
                Fuente
                <select
                  value={activeLayerFontId}
                  onChange={(event) =>
                    updateActiveLayer((layer) => ({
                      ...layer,
                      fontId: event.target.value,
                    }))
                  }
                  className={styles.toolbarSelect}
                >
                  {TEXT_FONT_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.toolbarField}>
                Color
                <select
                  value={textColorOptionId}
                  onChange={(event) => handleTextColorOptionChange(event.target.value)}
                  className={styles.toolbarSelect}
                >
                  {TEXT_COLOR_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              {textColorOptionId === "custom" ? (
                <label className={styles.toolbarField}>
                  Personalizar <span className={styles.pickerValue}>{activeLayerColor.toUpperCase()}</span>
                  <input
                    type="color"
                    value={activeLayerColor}
                    onChange={(event) => {
                      setTextColorOptionId("custom");
                      updateActiveLayer((layer) => ({
                        ...layer,
                        color: event.target.value,
                      }));
                    }}
                    style={getColorPickerStyle(activeLayerColor)}
                    className={styles.colorPicker}
                  />
                </label>
              ) : null}
            </div>
            <p className={styles.editorHint}>
              Arrastra el texto dentro de la zona segura. Usa los sliders de la izquierda para ajuste fino.
            </p>
          </div>

          <div
            className={`${styles.editorCanvas} ${size === "large" ? styles.previewCanvasLarge : ""} ${
              isDraggingText ? styles.editorCanvasDragging : ""
            }`}
            onPointerDown={handleEditorPointerDown}
            onPointerMove={handleEditorPointerMove}
            onPointerUp={handleEditorPointerUp}
            onPointerCancel={handleEditorPointerUp}
          >
            <div
              className={`${styles.editorFace} ${editorFaceClass}${editorFaceVariantClass ? ` ${editorFaceVariantClass}` : ""}`}
              style={editorPaintSurfaceStyle}
              aria-hidden="true"
            >
              {product === "guiro" ? (
                <div className={styles.guiroLines}>
                  {Array.from({ length: 8 }).map((_, index) => (
                    <span key={`line-${index}`} />
                  ))}
                </div>
              ) : null}
              <div className={styles.editorSafeZone} />
              {visibleEditorLayers.map((layer, index) => {
                const font = TEXT_FONT_OPTIONS.find((option) => option.id === layer.fontId) || TEXT_FONT_OPTIONS[0];
                const layerOffsetXInPx = layer.transform.offsetX * 3.1;
                const layerOffsetYInPx = layer.transform.offsetY * 2.4;
                const layerTransform = `translate(calc(-50% + ${layerOffsetXInPx}px), calc(-50% + ${layerOffsetYInPx}px)) rotate(${layer.transform.rotation}deg) scale(${layer.transform.scaleX / 100}, ${layer.transform.scaleY / 100})`;
                const isActiveLayer = layer.id === activeLayerId;
                return (
                  <div
                    key={layer.id}
                    className={`${styles.editorText}${isActiveLayer ? ` ${styles.editorTextActive}` : ""}`}
                    style={{
                      color: layer.color,
                      transform: layerTransform,
                      fontFamily: font.family,
                      fontWeight: font.weight,
                      opacity: layer.text.trim() ? 1 : 0.8,
                    }}
                  >
                    {layer.text.trim() || `Texto capa ${index + 1}`}
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles.previewLegend}>
            <p>{selectedProduct.description}</p>
            <p>
              Esta vista es referencial. El acabado final puede variar levemente según material y
              proceso manual de personalización.
            </p>
          </div>
        </div>
      </section>

      <div ref={dockVisibilityTriggerRef} className={styles.dockVisibilityTrigger} aria-hidden />

      <section
        className={`${styles.checkoutActionsDock}${
          isFloatingDockVisible ? ` ${styles.checkoutActionsDockVisible}` : ""
        }`}
        aria-label="Acciones de compra"
      >
        <div className={styles.checkoutActionsInner}>
          <button
            type="button"
            className={styles.checkoutActionSecondary}
            onClick={() => void handleAddToCart()}
            disabled={addToCartStatus === "sending" || purchaseStatus === "sending" || !selectedCheckoutBinding}
          >
            {addToCartStatus === "sending" ? "Añadiendo..." : "Añadir al carrito"}
          </button>
          <button
            type="button"
            className={styles.checkoutActionPrimary}
            onClick={() => void handleBuyNow()}
            disabled={purchaseStatus === "sending" || addToCartStatus === "sending" || !selectedCheckoutBinding}
          >
            {purchaseStatus === "sending" ? "Preparando checkout..." : "Comprar ahora"}
          </button>
        </div>
      </section>
    </main>
  );
}
