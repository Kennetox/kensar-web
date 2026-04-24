"use client";

import Image from "next/image";
import Script from "next/script";
import {
  createElement,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

const PRODUCT_MODEL_MAP: Record<string, string | null> = {
  campana: "/personaliza/models/campana-v1.glb",
  guiro: "/personaliza/models/guiro-v1.glb",
  maraca: null,
};
const CAMPANA_MODEL_MAP: Record<"clasica" | "cromada", Record<"abierta" | "cerrada", string>> = {
  clasica: {
    abierta: "/personaliza/models/campana-v1-abierta.glb",
    cerrada: "/personaliza/models/campana-v1-cerrada.glb",
  },
  cromada: {
    abierta: "/personaliza/models/campana-cromada-v1-abierta.glb",
    cerrada: "/personaliza/models/campana-cromada-v1-cerrada.glb",
  },
};
const CAMPANA_MODEL_FALLBACK_MAP: Record<"clasica" | "cromada", string> = {
  clasica: "/personaliza/models/campana-v1.glb",
  cromada: "/personaliza/models/campana-cromada-v1.glb",
};
const DEBUG_TEXT_TEXTURE_MODE = false;
const SHOW_DEBUG_PANEL = true;
const TEXT_LAYOUT_BY_PRODUCT: Record<
  "campana" | "guiro" | "maraca",
  { centerX: number; centerY: number; widthRatio: number; maxLines: number }
> = {
  // El UV de la zona frontal de campana no ocupa todo el ancho del atlas.
  campana: { centerX: 0.33, centerY: 0.5, widthRatio: 0.56, maxLines: 3 },
  guiro: { centerX: 0.5, centerY: 0.5, widthRatio: 0.82, maxLines: 3 },
  maraca: { centerX: 0.5, centerY: 0.5, widthRatio: 0.82, maxLines: 3 },
};

export type PaintConfig =
  | { mode: "solid"; color: string }
  | { mode: "gradient"; startColor: string; endColor: string; angle: number; position: number };

export type TextLayer3D = {
  id: string;
  text: string;
  textColor: string;
  textFontFamily: string;
  textFontWeight: number;
  face?: "front_up" | "front_down" | "left" | "right";
  textTransform: {
    scaleX: number;
    scaleY: number;
    offsetX: number;
    offsetY: number;
    rotation: number;
  };
};
export type ModelPreview3DHandle = {
  captureSnapshotDataUrl: (options?: {
    format?: "png" | "jpg";
    view?: "front" | "left" | "right";
    watermark?: boolean;
    maxWidth?: number;
    quality?: number;
  }) => Promise<string | null>;
  downloadSnapshot: (options?: { format?: "png" | "jpg" }) => Promise<boolean>;
  toggleUpsideDown: () => void;
  resetView: () => void;
  focusCampanaBase: () => void;
  restoreFromCampanaBaseFocus: () => void;
  focusGuiroFace: (face: "front_up" | "front_down" | "left" | "right") => void;
};

function clampValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function resolveMaterialByCandidates<T extends { name?: string }>(
  materials: T[],
  candidates: string[]
): T | undefined {
  const normalizeKey = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
  const normalizedCandidates = candidates.map((candidate) => normalizeKey(candidate)).filter(Boolean);
  const normalizedMaterials = materials.map((material) => ({
    material,
    name: normalizeKey(material.name || ""),
  }));

  // Prioridad 1: match exacto respetando el orden de candidates.
  for (const candidate of normalizedCandidates) {
    const exact = normalizedMaterials.find((entry) => entry.name === candidate);
    if (exact) return exact.material;
  }

  // Prioridad 2: match parcial respetando el orden de candidates.
  for (const candidate of normalizedCandidates) {
    const partial = normalizedMaterials.find((entry) => entry.name.includes(candidate));
    if (partial) return partial.material;
  }

  return undefined;
}

type CameraState = {
  theta: number;
  phi: number;
  radius: number;
};
type CameraTargetState = {
  x: number;
  y: number;
};
type CameraTargetBase = {
  x: number;
  y: number;
  z: number;
};

const DEFAULT_CAMERA_STATE: CameraState = {
  theta: 0,
  phi: 80,
  radius: 118,
};
const DEFAULT_CAMERA_STATE_BY_PRODUCT: Record<"campana" | "guiro" | "maraca", CameraState> = {
  campana: DEFAULT_CAMERA_STATE,
  guiro: {
    theta: 0,
    phi: 80,
    radius: 136,
  },
  maraca: DEFAULT_CAMERA_STATE,
};
const CAMERA_RADIUS_MIN = 34;
const CAMERA_RADIUS_MAX = 240;
const CAMERA_PHI_MIN = 8;
const CAMERA_PHI_MAX = 172;
const DEFAULT_CAMERA_TARGET: CameraTargetState = { x: 0, y: 0 };
const CAMERA_TARGET_MIN = -0.3;
const CAMERA_TARGET_MAX = 0.3;
const CAMERA_TARGET_STEP = 0.02;
const TEXT_FOCUS_TARGET_MIN = -0.11;
const TEXT_FOCUS_TARGET_MAX = 0.11;
const TEXT_FOCUS_GAIN_BY_PRODUCT: Record<
  "campana" | "guiro" | "maraca",
  { xGain: number; yGain: number }
> = {
  // Campana usa una zona útil más desplazada en X.
  campana: { xGain: 0.28, yGain: 0.34 },
  guiro: { xGain: 0.24, yGain: 0.3 },
  maraca: { xGain: 0.24, yGain: 0.3 },
};
const TEXT_FOCUS_CAMERA_BY_PRODUCT: Record<
  "campana" | "guiro" | "maraca",
  { theta: number; phi: number; maxRadius: number }
> = {
  campana: { theta: 0, phi: 80, maxRadius: 72 },
  guiro: { theta: 0, phi: 80, maxRadius: 72 },
  maraca: { theta: 0, phi: 80, maxRadius: 78 },
};
const GUIRO_BASE_THETA_OFFSET = 0;
const GUIRO_FACE_THETA_BY_FACE: Record<"front_up" | "front_down" | "left" | "right", number> = {
  front_up: GUIRO_BASE_THETA_OFFSET + 0,
  front_down: GUIRO_BASE_THETA_OFFSET + 0,
  left: GUIRO_BASE_THETA_OFFSET - 112,
  right: GUIRO_BASE_THETA_OFFSET + 112,
};
const CAMPANA_VIEW_THETA_BY_VIEW: Record<"front" | "left" | "right", number> = {
  front: 0,
  left: -116,
  right: 116,
};
const CAMPANA_SNAPSHOT_VIEW_PRESET: Record<
  "front" | "left" | "right",
  { phi: number; radius: number; targetX: number; targetY: number }
> = {
  front: { phi: 80, radius: 118, targetX: 0, targetY: 0 },
  left: { phi: 82, radius: 108, targetX: -0.08, targetY: 0.01 },
  right: { phi: 82, radius: 108, targetX: 0.08, targetY: 0.01 },
};
const GUIRO_FACE_FOCUS_PRESET: Record<
  "front_up" | "front_down" | "left" | "right",
  { phi: number; targetY: number; minRadius: number; maxRadius: number }
> = {
  front_up: { phi: 70, targetY: 0.17, minRadius: 72, maxRadius: 86 },
  front_down: { phi: 94, targetY: -0.17, minRadius: 72, maxRadius: 86 },
  left: { phi: 84, targetY: 0, minRadius: 88, maxRadius: 108 },
  right: { phi: 84, targetY: 0, minRadius: 88, maxRadius: 108 },
};
const GUIRO_TEXT_ROTATION_OFFSET_BY_FACE: Record<"front_up" | "front_down" | "left" | "right", number> = {
  front_up: 0,
  front_down: 180,
  left: 180,
  right: 180,
};
const GUIRO_TEXT_OFFSET_SIGN_BY_FACE: Record<
  "front_up" | "front_down" | "left" | "right",
  { x: number; y: number }
> = {
  // En este modelo la referencia UV quedó invertida respecto a los controles del editor.
  front_up: { x: 1, y: 1 },
  front_down: { x: -1, y: -1 },
  left: { x: -1, y: -1 },
  right: { x: -1, y: -1 },
};
const EXPORT_WATERMARK_SRC = "/branding/texto-kensar.png";
const EXPORT_WATERMARK_OPACITY = 0.2;
const EXPORT_WATERMARK_WIDTH_RATIO = 0.96;
const EXPORT_WATERMARK_MAX_HEIGHT_RATIO = 0.42;
const GUIRO_PAINT_MATERIAL_CANDIDATES = [
  "textura_guiro",
  "guiro_text_zone",
  "mat_text_zone",
  "matpaint",
  "guiro",
];
const GUIRO_TEXT_MATERIAL_CANDIDATES = [
  "mat_text_zone",
  "guiro_text_zone",
  "textura_guiro",
  "text_zone",
  "text",
];
const GUIRO_TEXT_FRONT_UP_MATERIAL_CANDIDATES = [
  "mat_text_zone_front_up",
  "mat_text_zone_frontup",
  "mat text zone front up",
  "mat_text_zone_up",
  "front_up",
  "up",
  "mat_text_zone_front",
  "mat_text_zone_frontal",
  "mat_text_sone_front",
  "mat text zone front",
  "front",
  "mat_text_zone",
  "guiro_text_zone_front",
  "guiro_text_zone",
  "text_zone_front",
];
const GUIRO_TEXT_FRONT_DOWN_MATERIAL_CANDIDATES = [
  "mat_text_zone_front_down",
  "mat_text_zone_frontdown",
  "mat text zone front down",
  "mat_text_zone_down",
  "front_down",
  "down",
];
const GUIRO_TEXT_LEFT_MATERIAL_CANDIDATES = [
  "mat_text_zone_left",
  "mat_text_zone_izquierda",
  "mat_taxt_zone_left",
  "mat text zone left",
  "left",
  "mat_text_zone_l",
  "guiro_text_zone_left",
  "text_zone_left",
  "text_zone_l",
];
const GUIRO_TEXT_RIGHT_MATERIAL_CANDIDATES = [
  "mat_text_zone_right",
  "mat_text_zone_derecha",
  "mat text zone right",
  "right",
  "mat_text_zone_r",
  "guiro_text_zone_right",
  "text_zone_right",
  "text_zone_r",
];
const GUIRO_WOOD_MATERIAL_CANDIDATES = ["textura_madera", "madera", "wood"];
const GUIRO_TEETH_MATERIAL_CANDIDATES = ["dientes_blancos", "dientes", "cube", "tooth", "teeth"];
const GUIRO_WOOD_COLOR_FACTOR: [number, number, number, number] = [0.42, 0.28, 0.16, 1];
const GUIRO_TEETH_COLOR_FACTOR: [number, number, number, number] = [1, 1, 1, 1];
const GUIRO_WOOD_ROUGHNESS = 1;
const GUIRO_WOOD_METALLIC = 0;
const DEFAULT_MATERIAL_CANDIDATES = {
  paint: ["matpaint", "paint", "body", "base", "main", "material", "default"],
  text: ["mat_text_zone", "text_zone", "text", "decal", "label", "logo"],
};
const MATERIAL_CANDIDATES_BY_PRODUCT: Record<
  "campana" | "guiro" | "maraca",
  { paint: string[]; text: string[] }
> = {
  campana: {
    paint: ["matpaint", "cromado", ...DEFAULT_MATERIAL_CANDIDATES.paint],
    text: ["mat_text_zone", "mat_text_zone_cromado", ...DEFAULT_MATERIAL_CANDIDATES.text],
  },
  guiro: {
    paint: ["textura_guiro", "matpaint", "guiro_body", "guiro", ...DEFAULT_MATERIAL_CANDIDATES.paint],
    text: ["textura_guiro", "mat_text_zone", "guiro_text_zone", ...DEFAULT_MATERIAL_CANDIDATES.text],
  },
  maraca: {
    paint: DEFAULT_MATERIAL_CANDIDATES.paint,
    text: DEFAULT_MATERIAL_CANDIDATES.text,
  },
};

function getDefaultCameraStateByProduct(product: "campana" | "guiro" | "maraca"): CameraState {
  const state = DEFAULT_CAMERA_STATE_BY_PRODUCT[product] || DEFAULT_CAMERA_STATE;
  return { ...state };
}

type ModelPreview3DProps = {
  product: "campana" | "guiro" | "maraca";
  campanaType?: "clasica" | "cromada";
  campanaBellType?: "abierta" | "cerrada";
  focusOnText?: boolean;
  focusTextOffsetX?: number;
  focusTextOffsetY?: number;
  activeTextFace?: "front_up" | "front_down" | "left" | "right";
  paintConfig: PaintConfig;
  textLayers: TextLayer3D[];
};

const ModelPreview3D = forwardRef<ModelPreview3DHandle, ModelPreview3DProps>(function ModelPreview3D(
  {
    product,
    campanaType,
    campanaBellType = "abierta",
    focusOnText = false,
    focusTextOffsetX = 0,
    focusTextOffsetY = 0,
    activeTextFace = "front_up",
    paintConfig,
    textLayers,
  },
  ref
) {
  const modelViewerRef = useRef<HTMLElement | null>(null);
  const textureSequenceRef = useRef(0);
  const activeTextureUrlsRef = useRef<string[]>([]);
  const cameraStateRef = useRef<CameraState>(getDefaultCameraStateByProduct(product));
  const cameraTargetRef = useRef<CameraTargetState>(DEFAULT_CAMERA_TARGET);
  const focusSnapshotRef = useRef<{ camera: CameraState; target: CameraTargetState } | null>(null);
  const campanaBaseFocusSnapshotRef = useRef<{ camera: CameraState; target: CameraTargetState } | null>(null);
  const cameraTargetBaseRef = useRef<CameraTargetBase>({ x: 0, y: 0, z: 0 });
  const [isUpsideDown, setIsUpsideDown] = useState(false);
  const modelSrc = useMemo(() => {
    if (product === "campana") {
      const variant = campanaType || "clasica";
      return CAMPANA_MODEL_MAP[variant][campanaBellType] || CAMPANA_MODEL_FALLBACK_MAP[variant];
    }
    return PRODUCT_MODEL_MAP[product] ?? null;
  }, [campanaBellType, campanaType, product]);
  const [debugSummary, setDebugSummary] = useState("Esperando carga de modelo...");
  const [hoveredControl, setHoveredControl] = useState<
    | "left"
    | "right"
    | "up"
    | "down"
    | "pan-up"
    | "pan-left"
    | "pan-center"
    | "pan-right"
    | "pan-down"
    | "zoom-in"
    | "zoom-out"
    | "center"
    | null
  >(null);

  const applyCameraState = useCallback((nextState: CameraState) => {
    const viewer = modelViewerRef.current;
    if (!viewer) return;
    viewer.setAttribute(
      "camera-orbit",
      `${nextState.theta.toFixed(1)}deg ${nextState.phi.toFixed(1)}deg ${nextState.radius.toFixed(1)}%`
    );
  }, []);

  const updateCameraState = useCallback(
    (updater: (current: CameraState) => CameraState) => {
      const next = updater(cameraStateRef.current);
      const wrappedTheta = ((((next.theta + 180) % 360) + 360) % 360) - 180;
      const clamped: CameraState = {
        theta: wrappedTheta,
        phi: clampValue(next.phi, CAMERA_PHI_MIN, CAMERA_PHI_MAX),
        radius: clampValue(next.radius, CAMERA_RADIUS_MIN, CAMERA_RADIUS_MAX),
      };
      cameraStateRef.current = clamped;
      applyCameraState(clamped);
    },
    [applyCameraState]
  );

  const applyCameraTarget = useCallback((nextTarget: CameraTargetState) => {
    const viewer = modelViewerRef.current;
    if (!viewer) return;
    if (Math.abs(nextTarget.x) < 0.0001 && Math.abs(nextTarget.y) < 0.0001) {
      viewer.setAttribute("camera-target", "auto auto auto");
      return;
    }
    const base = cameraTargetBaseRef.current;
    viewer.setAttribute(
      "camera-target",
      `${(base.x + nextTarget.x).toFixed(4)}m ${(base.y + nextTarget.y).toFixed(4)}m ${base.z.toFixed(4)}m`
    );
  }, []);

  const updateCameraTarget = useCallback(
    (updater: (current: CameraTargetState) => CameraTargetState) => {
      const next = updater(cameraTargetRef.current);
      const clamped: CameraTargetState = {
        x: clampValue(next.x, CAMERA_TARGET_MIN, CAMERA_TARGET_MAX),
        y: clampValue(next.y, CAMERA_TARGET_MIN, CAMERA_TARGET_MAX),
      };
      cameraTargetRef.current = clamped;
      applyCameraTarget(clamped);
    },
    [applyCameraTarget]
  );

  const toNormalizedHexColor = useCallback((hex: string): string => {
    const safeHex = hex.replace("#", "").trim();
    const expanded =
      safeHex.length === 3
        ? `${safeHex[0]}${safeHex[0]}${safeHex[1]}${safeHex[1]}${safeHex[2]}${safeHex[2]}`
        : safeHex;
    return /^([0-9a-fA-F]{6})$/.test(expanded) ? `#${expanded}` : "#111827";
  }, []);

  const toLuminance = useCallback((hex: string): number => {
    const safeHex = hex.replace("#", "").trim();
    const expanded =
      safeHex.length === 3
        ? `${safeHex[0]}${safeHex[0]}${safeHex[1]}${safeHex[1]}${safeHex[2]}${safeHex[2]}`
        : safeHex;
    const r = Number.parseInt(expanded.slice(0, 2), 16) || 0;
    const g = Number.parseInt(expanded.slice(2, 4), 16) || 0;
    const b = Number.parseInt(expanded.slice(4, 6), 16) || 0;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }, []);

  const paintCanvasBackground = useCallback(
    (context: CanvasRenderingContext2D, width: number, height: number, config: PaintConfig) => {
      if (config.mode === "solid") {
        context.fillStyle = toNormalizedHexColor(config.color);
        context.fillRect(0, 0, width, height);
        return;
      }

      const startColor = toNormalizedHexColor(config.startColor);
      const endColor = toNormalizedHexColor(config.endColor);
      const angleRad = ((config.angle % 360) * Math.PI) / 180;
      const centerShift = ((clampValue(config.position, 0, 100) - 50) / 50) * (Math.min(width, height) * 0.24);
      const centerX = width / 2 + Math.cos(angleRad + Math.PI / 2) * centerShift;
      const centerY = height / 2 + Math.sin(angleRad + Math.PI / 2) * centerShift;
      const halfLength = Math.hypot(width, height) * 0.5;
      const x0 = centerX - Math.cos(angleRad) * halfLength;
      const y0 = centerY - Math.sin(angleRad) * halfLength;
      const x1 = centerX + Math.cos(angleRad) * halfLength;
      const y1 = centerY + Math.sin(angleRad) * halfLength;

      const blendCenter = clampValue(config.position, 10, 90) / 100;
      const blendSpan = 0.16;
      const firstStop = clampValue(blendCenter - blendSpan, 0, 1);
      const secondStop = clampValue(blendCenter + blendSpan, 0, 1);
      const gradient = context.createLinearGradient(x0, y0, x1, y1);
      gradient.addColorStop(0, startColor);
      gradient.addColorStop(firstStop, startColor);
      gradient.addColorStop(secondStop, endColor);
      gradient.addColorStop(1, endColor);
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);
    },
    [toNormalizedHexColor]
  );

  const buildPaintCanvas = useCallback(
    (config: PaintConfig) => {
      const canvas = document.createElement("canvas");
      canvas.width = 1024;
      canvas.height = 1024;
      const context = canvas.getContext("2d");
      if (!context) return null;
      paintCanvasBackground(context, canvas.width, canvas.height, config);
      return canvas;
    },
    [paintCanvasBackground]
  );

  const buildTextCanvas = useCallback(
    (
      layers: TextLayer3D[],
      productId: "campana" | "guiro" | "maraca",
      backgroundPaint: PaintConfig,
      options?: {
        backgroundMode?: "paint" | "white";
        paintSliceY?: { start: number; end: number };
        paintAngleOffsetDeg?: number;
        enhanceLightTextOnChrome?: boolean;
      }
    ) => {
      const canvas = document.createElement("canvas");
      canvas.width = 1024;
      canvas.height = 1024;
      const context = canvas.getContext("2d");
      if (!context) return null;
      const layout = TEXT_LAYOUT_BY_PRODUCT[productId];
      const backgroundMode = options?.backgroundMode ?? "paint";

      if (DEBUG_TEXT_TEXTURE_MODE) {
        context.fillStyle = "#fff4c2";
        context.fillRect(0, 0, canvas.width, canvas.height);
      } else if (backgroundMode === "white") {
        context.fillStyle = "#f8fafc";
        context.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        const paintConfigForFace: PaintConfig =
          backgroundPaint.mode === "gradient"
            ? {
                ...backgroundPaint,
                angle: backgroundPaint.angle + (options?.paintAngleOffsetDeg || 0),
              }
            : backgroundPaint;
        const slice = options?.paintSliceY;
        if (!slice || slice.start <= 0 && slice.end >= 1) {
          paintCanvasBackground(context, canvas.width, canvas.height, paintConfigForFace);
        } else {
          const safeStart = clampValue(slice.start, 0, 1);
          const safeEnd = clampValue(slice.end, 0, 1);
          const start = Math.min(safeStart, safeEnd);
          const end = Math.max(safeStart, safeEnd);
          const virtualCanvas = document.createElement("canvas");
          virtualCanvas.width = canvas.width;
          virtualCanvas.height = canvas.height * 2;
          const virtualContext = virtualCanvas.getContext("2d");
          if (virtualContext) {
            paintCanvasBackground(virtualContext, virtualCanvas.width, virtualCanvas.height, paintConfigForFace);
            const sourceY = Math.round(virtualCanvas.height * start);
            const sourceHeight = Math.max(1, Math.round(virtualCanvas.height * (end - start)));
            context.drawImage(
              virtualCanvas,
              0,
              sourceY,
              virtualCanvas.width,
              sourceHeight,
              0,
              0,
              canvas.width,
              canvas.height
            );
          } else {
            paintCanvasBackground(context, canvas.width, canvas.height, paintConfigForFace);
          }
        }
      }
      if (DEBUG_TEXT_TEXTURE_MODE) {
        context.strokeStyle = "#111827";
        context.lineWidth = 22;
        context.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);
        context.beginPath();
        context.moveTo(0, 0);
        context.lineTo(canvas.width, canvas.height);
        context.moveTo(canvas.width, 0);
        context.lineTo(0, canvas.height);
        context.lineWidth = 10;
        context.strokeStyle = "rgba(17,24,39,0.35)";
        context.stroke();
      }
      for (const layer of layers) {
        const content = layer.text.trim();
        if (!content) continue;
        context.textAlign = "center";
        context.textBaseline = "middle";
        const normalizedTextColor = toNormalizedHexColor(layer.textColor);
        const textLuminance = toLuminance(normalizedTextColor);
        const boostLightText = Boolean(options?.enhanceLightTextOnChrome && textLuminance > 0.72);
        const effectiveTextColor = boostLightText ? "#ffffff" : normalizedTextColor;
        context.fillStyle = effectiveTextColor;
        context.strokeStyle = boostLightText
          ? "rgba(2, 6, 23, 0.75)"
          : textLuminance > 0.65
            ? "rgba(15, 23, 42, 0.36)"
            : "rgba(255, 255, 255, 0.22)";
        const baseFontSize = DEBUG_TEXT_TEXTURE_MODE ? 144 : 108;
        const scaleXFactor = clampValue(layer.textTransform.scaleX / 100, 0.4, 2.6);
        const scaleYFactor = clampValue(layer.textTransform.scaleY / 100, 0.4, 2.6);
        const averageScale = (scaleXFactor + scaleYFactor) / 2;
        const scaleXRatio = scaleXFactor / averageScale;
        const scaleYRatio = scaleYFactor / averageScale;
        const scaledFontSize = Math.round(baseFontSize * averageScale);
        const maxWidth = Math.round(canvas.width * layout.widthRatio);
        const offsetSign =
          productId === "guiro"
            ? GUIRO_TEXT_OFFSET_SIGN_BY_FACE[layer.face || "front_up"]
            : { x: 1, y: 1 };
        const centerX = Math.round(
          canvas.width * (layout.centerX + (layer.textTransform.offsetX / 100) * offsetSign.x)
        );
        const centerY = Math.round(
          canvas.height * (layout.centerY + (layer.textTransform.offsetY / 100) * offsetSign.y)
        );

        const words = content.split(/\s+/).filter(Boolean);
        const lines: string[] = [];
        let current = "";
        context.font = `${layer.textFontWeight} ${scaledFontSize}px ${layer.textFontFamily}`;
        context.lineWidth = Math.max(2, Math.round(scaledFontSize * 0.06));
        context.lineJoin = "round";
        for (const word of words) {
          const candidate = current ? `${current} ${word}` : word;
          if (context.measureText(candidate).width <= maxWidth) {
            current = candidate;
            continue;
          }
          if (current) lines.push(current);
          current = word;
        }
        if (current) lines.push(current);

        const safeLines = lines.length ? lines : [content];
        const limitedLines = safeLines.slice(0, layout.maxLines);
        const lineHeight = Math.round(scaledFontSize * 1.2);
        const totalHeight = lineHeight * (limitedLines.length - 1);
        let y = 0 - totalHeight / 2;

        context.save();
        context.translate(centerX, centerY);
        const faceRotationOffset =
          productId === "guiro"
            ? GUIRO_TEXT_ROTATION_OFFSET_BY_FACE[layer.face || "front_up"]
            : 0;
        context.rotate(((layer.textTransform.rotation + faceRotationOffset) * Math.PI) / 180);
        context.scale(scaleXRatio, scaleYRatio);
        for (const line of limitedLines) {
          const drawMaxWidth = maxWidth / scaleXRatio;
          if (boostLightText) {
            context.lineWidth = Math.max(3, Math.round(scaledFontSize * 0.1));
            context.strokeText(line, 0, y, drawMaxWidth);
            context.fillText(line, 0, y, drawMaxWidth);
            context.lineWidth = Math.max(2, Math.round(scaledFontSize * 0.05));
            context.strokeStyle = "rgba(255, 255, 255, 0.35)";
            context.strokeText(line, 0, y, drawMaxWidth);
            context.fillStyle = "#ffffff";
            context.fillText(line, 0, y, drawMaxWidth);
          } else {
            context.strokeText(line, 0, y, drawMaxWidth);
            context.fillText(line, 0, y, drawMaxWidth);
          }
          y += lineHeight;
        }
        context.restore();
      }

      return canvas;
    },
    [paintCanvasBackground, toLuminance, toNormalizedHexColor]
  );

  const applyModelCustomization = useCallback(async () => {
    const viewer = modelViewerRef.current as
      | (HTMLElement & {
          createTexture?: (url: string) => Promise<unknown>;
          model?: {
            createTexture?: (url: string) => Promise<unknown>;
            materials?: Array<{
              name?: string;
              setEmissiveFactor?: (value: [number, number, number]) => void;
              emissiveTexture?: {
                setTexture?: (texture: unknown) => void;
              };
              pbrMetallicRoughness?: {
                setBaseColorFactor?: (value: [number, number, number, number]) => void;
                setMetallicFactor?: (value: number) => void;
                setRoughnessFactor?: (value: number) => void;
                setBaseColorTexture?: (texture: unknown) => void;
                baseColorTexture?: {
                  setTexture?: (texture: unknown) => void;
                };
              };
            }>;
          };
        })
      | null;
    if (!viewer?.model?.materials?.length) {
      setDebugSummary("No se detectaron materiales en el modelo.");
      return;
    }

    const materials = viewer.model.materials;
    const materialNames = materials.map((material) => (material.name || "(sin nombre)").trim());
    const productCandidates = MATERIAL_CANDIDATES_BY_PRODUCT[product];
    const paintCandidates =
      product === "campana" && campanaType === "cromada"
        ? ["cromado", ...productCandidates.paint]
        : productCandidates.paint;
    const textCandidates =
      product === "campana" && campanaType === "cromada"
        ? ["mat_text_zone_cromado", ...productCandidates.text]
        : productCandidates.text;
    let paintMaterial = resolveMaterialByCandidates(materials, paintCandidates) || materials[0];
    const paintPbr = paintMaterial?.pbrMetallicRoughness;
    paintPbr?.setBaseColorFactor?.([1, 1, 1, 1]);

    let textMaterial = resolveMaterialByCandidates(materials, textCandidates) || paintMaterial;
    let usesSingleMaterialFallback = textMaterial === paintMaterial;
    let guiroWoodTintApplied = false;
    let guiroTeethMatteApplied = false;
    const guiroTextFacesApplied: Array<"front_up" | "front_down" | "left" | "right"> = [];
    const guiroTextMaterials: Partial<
      Record<"front_up" | "front_down" | "left" | "right", (typeof materials)[number]>
    > = {};

    if (product === "guiro") {
      const guiroPaintMaterial =
        resolveMaterialByCandidates(materials, GUIRO_PAINT_MATERIAL_CANDIDATES) || paintMaterial;
      const guiroTextBaseMaterial =
        resolveMaterialByCandidates(materials, GUIRO_TEXT_MATERIAL_CANDIDATES) || guiroPaintMaterial;
      const guiroTextFrontUpMaterial =
        resolveMaterialByCandidates(materials, GUIRO_TEXT_FRONT_UP_MATERIAL_CANDIDATES) || guiroTextBaseMaterial;
      const guiroTextFrontDownMaterial =
        resolveMaterialByCandidates(materials, GUIRO_TEXT_FRONT_DOWN_MATERIAL_CANDIDATES) || guiroTextBaseMaterial;
      const guiroTextLeftMaterial =
        resolveMaterialByCandidates(materials, GUIRO_TEXT_LEFT_MATERIAL_CANDIDATES) || guiroTextBaseMaterial;
      const guiroTextRightMaterial =
        resolveMaterialByCandidates(materials, GUIRO_TEXT_RIGHT_MATERIAL_CANDIDATES) || guiroTextBaseMaterial;
      const guiroWoodMaterial = resolveMaterialByCandidates(materials, GUIRO_WOOD_MATERIAL_CANDIDATES);
      const guiroTeethMaterial = resolveMaterialByCandidates(materials, GUIRO_TEETH_MATERIAL_CANDIDATES);
      guiroWoodMaterial?.pbrMetallicRoughness?.setBaseColorFactor?.(GUIRO_WOOD_COLOR_FACTOR);
      guiroWoodMaterial?.pbrMetallicRoughness?.setMetallicFactor?.(GUIRO_WOOD_METALLIC);
      guiroWoodMaterial?.pbrMetallicRoughness?.setRoughnessFactor?.(GUIRO_WOOD_ROUGHNESS);
      guiroWoodTintApplied = Boolean(guiroWoodMaterial);
      guiroTeethMaterial?.pbrMetallicRoughness?.setBaseColorFactor?.(GUIRO_TEETH_COLOR_FACTOR);
      guiroTeethMaterial?.pbrMetallicRoughness?.setMetallicFactor?.(GUIRO_WOOD_METALLIC);
      guiroTeethMaterial?.pbrMetallicRoughness?.setRoughnessFactor?.(GUIRO_WOOD_ROUGHNESS);
      guiroTeethMatteApplied = Boolean(guiroTeethMaterial);
      guiroTextMaterials.front_up = guiroTextFrontUpMaterial;
      guiroTextMaterials.front_down = guiroTextFrontDownMaterial;
      // En este modelo las UV/materiales laterales están invertidas respecto al selector UI.
      guiroTextMaterials.left = guiroTextRightMaterial;
      guiroTextMaterials.right = guiroTextLeftMaterial;
      paintMaterial = guiroPaintMaterial;
      textMaterial = guiroTextFrontUpMaterial;
      usesSingleMaterialFallback = textMaterial === paintMaterial;
    }

    textMaterial?.pbrMetallicRoughness?.setBaseColorFactor?.(
      DEBUG_TEXT_TEXTURE_MODE ? [1, 0.97, 0.82, 1] : [1, 1, 1, 1]
    );

    const textureFromViewerFactory: ((url: string) => Promise<unknown>) | undefined =
      typeof viewer.createTexture === "function"
        ? (url: string) => viewer.createTexture!(url)
        : undefined;
    const textureFromModelFactory: ((url: string) => Promise<unknown>) | undefined =
      typeof viewer.model.createTexture === "function"
        ? (url: string) => viewer.model!.createTexture!(url)
        : undefined;
    if (!textureFromViewerFactory && !textureFromModelFactory) {
      setDebugSummary(
        `Materiales: ${materialNames.join(", ")} | createTexture no disponible (ni en model ni en viewer)`
      );
      return;
    }

    textureSequenceRef.current += 1;
    const sequence = textureSequenceRef.current;
    if (typeof document !== "undefined" && "fonts" in document) {
      const fonts = (document as Document & { fonts?: { load: (font: string) => Promise<unknown> } }).fonts;
      if (fonts?.load) {
        const uniqueFonts = Array.from(
          new Set(textLayers.map((layer) => `${layer.textFontWeight} 96px ${layer.textFontFamily}`))
        );
        await Promise.all(uniqueFonts.map((font) => fonts.load(font).catch(() => null)));
      }
    }
    const paintTextureCanvas = buildPaintCanvas(paintConfig);
    if (!paintTextureCanvas) {
      setDebugSummary("No se pudieron crear los canvas de texturas.");
      return;
    }
    if (sequence !== textureSequenceRef.current) return;
    const textTextureCanvas = buildTextCanvas(textLayers, product, paintConfig, {
      backgroundMode: product === "guiro" ? "white" : "paint",
      enhanceLightTextOnChrome: product === "campana" && campanaType === "cromada",
    });
    const guiroFaceLayers: Record<"front_up" | "front_down" | "left" | "right", TextLayer3D[]> = {
      front_up: [],
      front_down: [],
      left: [],
      right: [],
    };
    if (product === "guiro") {
      for (const layer of textLayers) {
        const face = layer.face || "front_up";
        guiroFaceLayers[face].push(layer);
      }
    }
    const guiroTextCanvasByFace: Partial<
      Record<"front_up" | "front_down" | "left" | "right", HTMLCanvasElement | null>
    > =
      product === "guiro"
        ? {
            front_up: buildTextCanvas(
              guiroFaceLayers.front_up,
              "guiro",
              paintConfig.mode === "gradient"
                ? { mode: "solid", color: paintConfig.endColor }
                : paintConfig,
              {
              backgroundMode: "paint",
              }
            ),
            front_down: buildTextCanvas(
              guiroFaceLayers.front_down,
              "guiro",
              paintConfig.mode === "gradient"
                ? { mode: "solid", color: paintConfig.startColor }
                : paintConfig,
              {
              backgroundMode: "paint",
              }
            ),
            left: buildTextCanvas(guiroFaceLayers.left, "guiro", paintConfig, { backgroundMode: "paint" }),
            right: buildTextCanvas(guiroFaceLayers.right, "guiro", paintConfig, { backgroundMode: "paint" }),
          }
        : {};
    if (!textTextureCanvas) {
      setDebugSummary("No se pudo crear canvas de texto.");
      return;
    }
    if (sequence !== textureSequenceRef.current) return;

    const createdBlobUrls: string[] = [];
    const factoryErrors: string[] = [];

    const createTextureFromCanvas = async (canvas: HTMLCanvasElement, textureLabel: string) => {
      const textureDataUrl = canvas.toDataURL("image/png");
      const tryFactory = async (factoryName: string, factory?: (url: string) => Promise<unknown>) => {
        if (!factory) return null;
        try {
          const fromDataUrl = await factory(textureDataUrl);
          if (fromDataUrl) return fromDataUrl;
        } catch (error) {
          factoryErrors.push(
            `${textureLabel} ${factoryName} (data URL): ${error instanceof Error ? error.message : String(error)}`
          );
        }
        try {
          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob((result) => resolve(result), "image/png", 1)
          );
          if (!blob) {
            factoryErrors.push(`${textureLabel} ${factoryName} (blob): no se pudo crear blob`);
            return null;
          }
          const blobUrl = URL.createObjectURL(blob);
          createdBlobUrls.push(blobUrl);
          const fromBlob = await factory(blobUrl);
          if (fromBlob) return fromBlob;
        } catch (error) {
          factoryErrors.push(
            `${textureLabel} ${factoryName} (blob): ${error instanceof Error ? error.message : String(error)}`
          );
        }
        return null;
      };

      const byViewer = await tryFactory("viewer.createTexture", textureFromViewerFactory);
      if (byViewer) return byViewer;
      return tryFactory("model.createTexture", textureFromModelFactory);
    };

    const paintTexture = await createTextureFromCanvas(paintTextureCanvas, "paint");
    const textTexture = await createTextureFromCanvas(textTextureCanvas, "text");
    if (sequence !== textureSequenceRef.current) return;
    if (!paintTexture || !textTexture) {
      for (const url of createdBlobUrls) URL.revokeObjectURL(url);
      setDebugSummary(`No se pudo crear textura GLTF. Errores: ${factoryErrors.join(" | ") || "sin detalle"}`);
      return;
    }
    const guiroTextTexturesByFace: Partial<Record<"front_up" | "front_down" | "left" | "right", unknown>> = {};
    if (product === "guiro") {
      for (const face of ["front_up", "front_down", "left", "right"] as const) {
        const faceCanvas = guiroTextCanvasByFace[face];
        if (!faceCanvas) continue;
        const texture = await createTextureFromCanvas(faceCanvas, `text-${face}`);
        if (sequence !== textureSequenceRef.current) return;
        if (!texture) {
          for (const url of createdBlobUrls) URL.revokeObjectURL(url);
          setDebugSummary(
            `No se pudo crear textura GLTF para cara ${face}. Errores: ${factoryErrors.join(" | ") || "sin detalle"}`
          );
          return;
        }
        guiroTextTexturesByFace[face] = texture;
      }
    }

    for (const oldUrl of activeTextureUrlsRef.current) URL.revokeObjectURL(oldUrl);
    activeTextureUrlsRef.current = createdBlobUrls;

    const applyTextureToMaterial = (material: {
      name?: string;
      pbrMetallicRoughness?: {
        setBaseColorTexture?: (texture: unknown) => void;
        baseColorTexture?: { setTexture?: (texture: unknown) => void };
      };
      emissiveTexture?: { setTexture?: (texture: unknown) => void };
      setEmissiveFactor?: (value: [number, number, number]) => void;
    }, texture: unknown, emissiveFallback = false) => {
      const pbr = material.pbrMetallicRoughness;
      if (typeof pbr?.setBaseColorTexture === "function") {
        pbr.setBaseColorTexture(texture);
        return true;
      }
      if (typeof pbr?.baseColorTexture?.setTexture === "function") {
        pbr.baseColorTexture.setTexture(texture);
        return true;
      }
      if (emissiveFallback && typeof material.emissiveTexture?.setTexture === "function") {
        material.emissiveTexture.setTexture(texture);
        material.setEmissiveFactor?.([1, 1, 1]);
        return true;
      }
      return false;
    };

    const paintApplied = usesSingleMaterialFallback
      ? applyTextureToMaterial(paintMaterial, textTexture, true)
      : paintMaterial
        ? applyTextureToMaterial(paintMaterial, paintTexture)
        : false;
    let textApplied = applyTextureToMaterial(textMaterial, textTexture, true);
    if (product === "guiro") {
      textApplied = true;
      for (const face of ["front_up", "front_down", "left", "right"] as const) {
        const faceMaterial = guiroTextMaterials[face] || textMaterial;
        const faceTexture = guiroTextTexturesByFace[face] || textTexture;
        const applied = applyTextureToMaterial(faceMaterial, faceTexture, true);
        if (applied) guiroTextFacesApplied.push(face);
        textApplied = textApplied && applied;
      }
    }

    if (!paintApplied || !textApplied) {
      setDebugSummary(
        `No se pudo aplicar textura en materiales (paint=${paintApplied ? "ok" : "fail"}, text=${textApplied ? "ok" : "fail"})`
      );
      return;
    }
    setDebugSummary(
      `OK text+paint | Capas: ${textLayers.length} | Modo pintura: ${paintConfig.mode} | Materiales: ${materialNames.join(", ")}${usesSingleMaterialFallback ? " | Fallback: un solo material (paint+text)" : ""}${product === "guiro" ? ` | Caras texto: ${guiroTextFacesApplied.join(", ") || "sin caras"} | Madera: ${guiroWoodTintApplied ? "ok" : "no encontrada"} | Dientes mate: ${guiroTeethMatteApplied ? "ok" : "no encontrados"}` : ""}`
    );
  }, [buildPaintCanvas, buildTextCanvas, campanaType, paintConfig, product, textLayers]);

  useEffect(() => {
    const viewer = modelViewerRef.current;
    if (!viewer) return;
    const handleLoad = () => {
      const targetGetter = (viewer as HTMLElement & { getCameraTarget?: () => { x: number; y: number; z: number } })
        .getCameraTarget;
      if (typeof targetGetter === "function") {
        const base = targetGetter.call(viewer);
        if (base) {
          cameraTargetBaseRef.current = { x: Number(base.x) || 0, y: Number(base.y) || 0, z: Number(base.z) || 0 };
        }
      }
      applyCameraState(cameraStateRef.current);
      applyCameraTarget(cameraTargetRef.current);
      void applyModelCustomization();
    };
    viewer.addEventListener("load", handleLoad);
    queueMicrotask(() => {
      applyCameraState(cameraStateRef.current);
      applyCameraTarget(cameraTargetRef.current);
      void applyModelCustomization();
    });
    return () => viewer.removeEventListener("load", handleLoad);
  }, [applyCameraState, applyCameraTarget, applyModelCustomization, modelSrc]);

  useEffect(() => {
    const defaultCameraState = getDefaultCameraStateByProduct(product);
    cameraStateRef.current = defaultCameraState;
    cameraTargetRef.current = DEFAULT_CAMERA_TARGET;
    focusSnapshotRef.current = null;
    setIsUpsideDown(false);
    queueMicrotask(() => {
      applyCameraState(defaultCameraState);
      applyCameraTarget(DEFAULT_CAMERA_TARGET);
    });
  }, [applyCameraState, applyCameraTarget, modelSrc, product]);

  useEffect(() => {
    if (focusOnText) {
      if (!focusSnapshotRef.current) {
        focusSnapshotRef.current = {
          camera: { ...cameraStateRef.current },
          target: { ...cameraTargetRef.current },
        };
      }
      const focusCamera = TEXT_FOCUS_CAMERA_BY_PRODUCT[product];
      const sourceRadius = focusSnapshotRef.current.camera.radius;
      const focusedRadius = clampValue(
        Math.min(sourceRadius, focusCamera.maxRadius),
        CAMERA_RADIUS_MIN,
        CAMERA_RADIUS_MAX
      );
      const layout = TEXT_LAYOUT_BY_PRODUCT[product];
      const focusGain = TEXT_FOCUS_GAIN_BY_PRODUCT[product];
      const zoomCompensation = clampValue(focusedRadius / 100, 0.65, 1.05);
      const normalizedFocusX = layout.centerX - 0.5 + focusTextOffsetX / 100;
      const normalizedFocusY = layout.centerY - 0.5 + focusTextOffsetY / 100;
      const targetX = clampValue(
        normalizedFocusX * focusGain.xGain * zoomCompensation,
        TEXT_FOCUS_TARGET_MIN,
        TEXT_FOCUS_TARGET_MAX
      );
      const targetY = clampValue(
        -normalizedFocusY * focusGain.yGain * zoomCompensation,
        TEXT_FOCUS_TARGET_MIN,
        TEXT_FOCUS_TARGET_MAX
      );
      const nextCamera = {
        ...cameraStateRef.current,
        theta:
          product === "guiro"
            ? GUIRO_FACE_THETA_BY_FACE[activeTextFace]
            : focusCamera.theta,
        phi: focusCamera.phi,
        radius: focusedRadius,
      };
      const nextTarget = { x: targetX, y: targetY };
      cameraStateRef.current = nextCamera;
      cameraTargetRef.current = nextTarget;
      applyCameraState(nextCamera);
      applyCameraTarget(nextTarget);
      return;
    }
    if (focusSnapshotRef.current) {
      const snapshot = focusSnapshotRef.current;
      focusSnapshotRef.current = null;
      cameraStateRef.current = snapshot.camera;
      cameraTargetRef.current = snapshot.target;
      applyCameraState(snapshot.camera);
      applyCameraTarget(snapshot.target);
    }
  }, [activeTextFace, applyCameraState, applyCameraTarget, focusOnText, focusTextOffsetX, focusTextOffsetY, product]);

  useEffect(
    () => () => {
      for (const textureUrl of activeTextureUrlsRef.current) URL.revokeObjectURL(textureUrl);
      activeTextureUrlsRef.current = [];
    },
    []
  );

  const captureSnapshotDataUrl = useCallback(
    async (options?: {
      format?: "png" | "jpg";
      view?: "front" | "left" | "right";
      watermark?: boolean;
      maxWidth?: number;
      quality?: number;
    }) => {
      const viewer = modelViewerRef.current as
        | (HTMLElement & {
            toDataURL?: (type?: string, quality?: number) => string;
            shadowRoot?: ShadowRoot;
            updateComplete?: Promise<unknown>;
            jumpCameraToGoal?: () => void;
          })
        | null;
      if (!viewer) return null;

      const previousCamera = { ...cameraStateRef.current };
      const previousTarget = { ...cameraTargetRef.current };
      const frontalCamera = getDefaultCameraStateByProduct(product);
      const frontalTarget = { ...DEFAULT_CAMERA_TARGET };
      const snapshotView = options?.view || "front";
      const cameraForView: CameraState = { ...frontalCamera };
      const targetForView: CameraTargetState = { ...frontalTarget };
      if (product === "guiro") {
        const faceForView: "front_up" | "left" | "right" =
          snapshotView === "left" ? "left" : snapshotView === "right" ? "right" : "front_up";
        const preset = GUIRO_FACE_FOCUS_PRESET[faceForView];
        cameraForView.theta = GUIRO_FACE_THETA_BY_FACE[faceForView];
        cameraForView.phi = preset.phi;
        cameraForView.radius = clampValue(frontalCamera.radius, preset.minRadius, preset.maxRadius);
        targetForView.y = preset.targetY;
        if (snapshotView === "left") targetForView.x = -0.1;
        if (snapshotView === "right") targetForView.x = 0.1;
      } else {
        const preset = CAMPANA_SNAPSHOT_VIEW_PRESET[snapshotView];
        cameraForView.theta = CAMPANA_VIEW_THETA_BY_VIEW[snapshotView];
        cameraForView.phi = preset.phi;
        cameraForView.radius = preset.radius;
        targetForView.x = preset.targetX;
        targetForView.y = preset.targetY;
      }
      const mimeType = options?.format === "jpg" ? "image/jpeg" : "image/png";
      const quality = options?.quality ?? 0.8;
      const maxWidth = Math.max(360, options?.maxWidth ?? 720);
      const withWatermark = options?.watermark ?? false;

      const loadImage = (src: string) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new window.Image();
          image.onload = () => resolve(image);
          image.onerror = () => reject(new Error(`No se pudo cargar imagen: ${src}`));
          image.src = src;
        });
      const waitForCameraSettle = () =>
        new Promise<void>((resolve) => {
          let completed = false;
          let fallbackTimer: number | null = null;
          let idleTimer: number | null = null;
          const onChange = () => {
            if (idleTimer !== null) window.clearTimeout(idleTimer);
            idleTimer = window.setTimeout(finish, 150);
          };
          const finish = () => {
            if (completed) return;
            completed = true;
            viewer.removeEventListener("camera-change", onChange as EventListener);
            if (fallbackTimer !== null) window.clearTimeout(fallbackTimer);
            if (idleTimer !== null) window.clearTimeout(idleTimer);
            resolve();
          };
          viewer.addEventListener("camera-change", onChange as EventListener);
          fallbackTimer = window.setTimeout(finish, 900);
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              try {
                viewer.jumpCameraToGoal?.();
              } catch {
                // Si falla, usamos únicamente la espera por eventos/RAF.
              }
              onChange();
            })
          );
        });

      try {
        cameraStateRef.current = cameraForView;
        cameraTargetRef.current = targetForView;
        applyCameraState(cameraForView);
        applyCameraTarget(targetForView);
        if (viewer.updateComplete) {
          try {
            await viewer.updateComplete;
          } catch {
            // fallback to RAF wait below
          }
        }
        await waitForCameraSettle();
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() =>
            requestAnimationFrame(() =>
              requestAnimationFrame(() => resolve())
            )
          )
        );

        let dataUrl = "";
        if (typeof viewer.toDataURL === "function") {
          dataUrl = viewer.toDataURL(mimeType, mimeType === "image/jpeg" ? quality : 1);
        }
        if (!dataUrl) {
          const canvas = viewer.shadowRoot?.querySelector("canvas") as HTMLCanvasElement | null;
          if (!canvas) return null;
          dataUrl = canvas.toDataURL(mimeType, mimeType === "image/jpeg" ? quality : 1);
        }
        if (!dataUrl) return null;

        let finalDataUrl = dataUrl;
        try {
          const baseImage = await loadImage(dataUrl);
          const sourceWidth = baseImage.naturalWidth || baseImage.width;
          const sourceHeight = baseImage.naturalHeight || baseImage.height;
          const scale = sourceWidth > maxWidth ? maxWidth / Math.max(sourceWidth, 1) : 1;
          const exportCanvas = document.createElement("canvas");
          exportCanvas.width = Math.max(1, Math.round(sourceWidth * scale));
          exportCanvas.height = Math.max(1, Math.round(sourceHeight * scale));
          const exportContext = exportCanvas.getContext("2d");
          if (exportContext) {
            exportContext.imageSmoothingEnabled = true;
            exportContext.imageSmoothingQuality = "high";
            exportContext.fillStyle = "#ffffff";
            exportContext.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
            exportContext.drawImage(baseImage, 0, 0, exportCanvas.width, exportCanvas.height);

            if (withWatermark) {
              try {
                const watermarkImage = await loadImage(EXPORT_WATERMARK_SRC);
                const targetWatermarkWidth = exportCanvas.width * EXPORT_WATERMARK_WIDTH_RATIO;
                const watermarkRatio =
                  (watermarkImage.naturalHeight || watermarkImage.height) /
                  Math.max(watermarkImage.naturalWidth || watermarkImage.width, 1);
                const targetWatermarkHeight = targetWatermarkWidth * watermarkRatio;
                const maxHeight = exportCanvas.height * EXPORT_WATERMARK_MAX_HEIGHT_RATIO;
                const boundedWidth =
                  targetWatermarkHeight > maxHeight
                    ? targetWatermarkWidth * (maxHeight / Math.max(targetWatermarkHeight, 1))
                    : targetWatermarkWidth;
                const boundedHeight =
                  targetWatermarkHeight > maxHeight ? maxHeight : targetWatermarkHeight;

                const watermarkX = (exportCanvas.width - boundedWidth) / 2;
                const watermarkY = (exportCanvas.height - boundedHeight) / 2;
                exportContext.globalAlpha = EXPORT_WATERMARK_OPACITY;
                exportContext.drawImage(watermarkImage, watermarkX, watermarkY, boundedWidth, boundedHeight);
                exportContext.globalAlpha = 1;
              } catch {
                // Si falla la marca de agua, se mantiene la exportación con fondo blanco.
              }
            }

            finalDataUrl = exportCanvas.toDataURL(
              mimeType,
              mimeType === "image/jpeg" ? quality : 1
            );
          }
        } catch {
          // Si falla el reprocesado, usamos la exportación base del viewer.
        }
        return finalDataUrl;
      } catch {
        return null;
      } finally {
        cameraStateRef.current = previousCamera;
        cameraTargetRef.current = previousTarget;
        applyCameraState(previousCamera);
        applyCameraTarget(previousTarget);
      }
    },
    [applyCameraState, applyCameraTarget, product]
  );

  const downloadSnapshot = useCallback(
    async (options?: { format?: "png" | "jpg" }) => {
      const extension = options?.format === "jpg" ? "jpg" : "png";
      const dataUrl = await captureSnapshotDataUrl({
        format: options?.format,
        view: "front",
        watermark: true,
      });
      if (!dataUrl) return false;
      try {
        const link = document.createElement("a");
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        link.href = dataUrl;
        link.download = `kensar-${product}-frontal-${timestamp}.${extension}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        return true;
      } catch {
        return false;
      }
    },
    [captureSnapshotDataUrl, product]
  );

  useImperativeHandle(
    ref,
    () => ({
      captureSnapshotDataUrl,
      downloadSnapshot,
      toggleUpsideDown: () => {
        setIsUpsideDown((current) => !current);
      },
      resetView: () => {
        const defaultCameraState = getDefaultCameraStateByProduct(product);
        setIsUpsideDown(false);
        cameraStateRef.current = defaultCameraState;
        cameraTargetRef.current = DEFAULT_CAMERA_TARGET;
        focusSnapshotRef.current = null;
        campanaBaseFocusSnapshotRef.current = null;
        applyCameraState(defaultCameraState);
        applyCameraTarget(DEFAULT_CAMERA_TARGET);
      },
      focusCampanaBase: () => {
        if (!campanaBaseFocusSnapshotRef.current) {
          campanaBaseFocusSnapshotRef.current = {
            camera: { ...cameraStateRef.current },
            target: { ...cameraTargetRef.current },
          };
        }
        setIsUpsideDown(false);
        focusSnapshotRef.current = null;
        const baseFocusCamera: CameraState = {
          theta: 2,
          phi: 166,
          radius: 58,
        };
        const baseFocusTarget: CameraTargetState = { x: 0, y: -0.06 };
        cameraStateRef.current = baseFocusCamera;
        cameraTargetRef.current = baseFocusTarget;
        applyCameraState(baseFocusCamera);
        applyCameraTarget(baseFocusTarget);
      },
      restoreFromCampanaBaseFocus: () => {
        const snapshot = campanaBaseFocusSnapshotRef.current;
        campanaBaseFocusSnapshotRef.current = null;
        if (!snapshot) return;
        cameraStateRef.current = snapshot.camera;
        cameraTargetRef.current = snapshot.target;
        applyCameraState(snapshot.camera);
        applyCameraTarget(snapshot.target);
      },
      focusGuiroFace: (face) => {
        if (product !== "guiro") return;
        setIsUpsideDown(false);
        const preset = GUIRO_FACE_FOCUS_PRESET[face];
        const nextCamera: CameraState = {
          theta: GUIRO_FACE_THETA_BY_FACE[face],
          phi: preset.phi,
          radius: clampValue(cameraStateRef.current.radius, preset.minRadius, preset.maxRadius),
        };
        const nextTarget: CameraTargetState = { x: 0, y: preset.targetY };
        cameraStateRef.current = nextCamera;
        cameraTargetRef.current = nextTarget;
        applyCameraState(nextCamera);
        applyCameraTarget(nextTarget);
      },
    }),
    [applyCameraState, applyCameraTarget, captureSnapshotDataUrl, downloadSnapshot, product]
  );

  if (!modelSrc) {
    return (
      <div style={{ padding: "10px 0", color: "#64748b", fontSize: "0.82rem" }}>
        Modelo 3D no disponible para este instrumento todavía.
      </div>
    );
  }

  return (
    <>
      <Script
        type="module"
        src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"
        strategy="afterInteractive"
      />
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          minHeight: 330,
          background: "#ffffff",
          overflow: "hidden",
        }}
      >
        {createElement("model-viewer", {
          ref: modelViewerRef,
          src: `${modelSrc}?v=20260420-texture-fix`,
          alt: `Modelo 3D ${product}`,
          "camera-controls": true,
          "interaction-prompt": "none",
          "environment-image": "neutral",
          "min-camera-orbit": `auto auto ${CAMERA_RADIUS_MIN}%`,
          "max-camera-orbit": `auto auto ${CAMERA_RADIUS_MAX}%`,
          "shadow-intensity": isUpsideDown ? "0" : "1",
          exposure: "1",
          ar: false,
          style: {
            position: "absolute",
            inset: 0,
            display: "block",
            width: "100%",
            height: "100%",
            background: "transparent",
            transform: isUpsideDown ? "rotate(180deg)" : "none",
            transformOrigin: "50% 50%",
            transition: "transform 260ms ease",
          },
        })}
        {isUpsideDown ? (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "50%",
              bottom: 10,
              width: "42%",
              height: 16,
              transform: "translateX(-50%)",
              borderRadius: "999px",
              background: "rgba(15, 23, 42, 0.22)",
              filter: "blur(8px)",
              pointerEvents: "none",
            }}
          />
        ) : null}
        <div
          style={{
            position: "absolute",
            left: 10,
            top: 10,
            display: "grid",
            gap: 6,
            justifyItems: "center",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "28px 28px 28px",
              gridTemplateRows: "28px 28px 28px",
              gap: 4,
            }}
          >
            <span aria-hidden="true" />
            <button
              type="button"
              onClick={() => updateCameraTarget((current) => ({ ...current, y: current.y + CAMERA_TARGET_STEP }))}
              onMouseEnter={() => setHoveredControl("pan-up")}
              onMouseLeave={() => setHoveredControl((current) => (current === "pan-up" ? null : current))}
              style={{
                width: 30,
                height: 30,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 24,
                lineHeight: 1,
                color: hoveredControl === "pan-up" ? "#0f172a" : "rgba(15, 23, 42, 0.45)",
                transition: "color 180ms ease",
              }}
              aria-label="Mover vista arriba"
              title="Mover vista arriba"
            >
              ↑
            </button>
            <span aria-hidden="true" />
            <button
              type="button"
              onClick={() => updateCameraTarget((current) => ({ ...current, x: current.x - CAMERA_TARGET_STEP }))}
              onMouseEnter={() => setHoveredControl("pan-left")}
              onMouseLeave={() => setHoveredControl((current) => (current === "pan-left" ? null : current))}
              style={{
                width: 30,
                height: 30,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 24,
                lineHeight: 1,
                color: hoveredControl === "pan-left" ? "#0f172a" : "rgba(15, 23, 42, 0.45)",
                transition: "color 180ms ease",
              }}
              aria-label="Mover vista izquierda"
              title="Mover vista izquierda"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => {
                cameraTargetRef.current = DEFAULT_CAMERA_TARGET;
                applyCameraTarget(DEFAULT_CAMERA_TARGET);
              }}
              onMouseEnter={() => setHoveredControl("pan-center")}
              onMouseLeave={() => setHoveredControl((current) => (current === "pan-center" ? null : current))}
              style={{
                width: 30,
                height: 30,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 20,
                lineHeight: 1,
                color: hoveredControl === "pan-center" ? "#0f172a" : "rgba(15, 23, 42, 0.45)",
                transition: "color 180ms ease",
              }}
              aria-label="Recentrar desplazamiento"
              title="Recentrar desplazamiento"
            >
              ●
            </button>
            <button
              type="button"
              onClick={() => updateCameraTarget((current) => ({ ...current, x: current.x + CAMERA_TARGET_STEP }))}
              onMouseEnter={() => setHoveredControl("pan-right")}
              onMouseLeave={() => setHoveredControl((current) => (current === "pan-right" ? null : current))}
              style={{
                width: 30,
                height: 30,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 24,
                lineHeight: 1,
                color: hoveredControl === "pan-right" ? "#0f172a" : "rgba(15, 23, 42, 0.45)",
                transition: "color 180ms ease",
              }}
              aria-label="Mover vista derecha"
              title="Mover vista derecha"
            >
              →
            </button>
            <span aria-hidden="true" />
            <button
              type="button"
              onClick={() => updateCameraTarget((current) => ({ ...current, y: current.y - CAMERA_TARGET_STEP }))}
              onMouseEnter={() => setHoveredControl("pan-down")}
              onMouseLeave={() => setHoveredControl((current) => (current === "pan-down" ? null : current))}
              style={{
                width: 30,
                height: 30,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 24,
                lineHeight: 1,
                color: hoveredControl === "pan-down" ? "#0f172a" : "rgba(15, 23, 42, 0.45)",
                transition: "color 180ms ease",
              }}
              aria-label="Mover vista abajo"
              title="Mover vista abajo"
            >
              ↓
            </button>
            <span aria-hidden="true" />
          </div>
          <button
            type="button"
            onClick={() => updateCameraState((current) => ({ ...current, radius: current.radius - 8 }))}
            onMouseEnter={() => setHoveredControl("zoom-in")}
            onMouseLeave={() => setHoveredControl((current) => (current === "zoom-in" ? null : current))}
            style={{
              width: 40,
              height: 40,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 34,
              lineHeight: 1,
              color: hoveredControl === "zoom-in" ? "#0f172a" : "rgba(15, 23, 42, 0.45)",
              transition: "color 180ms ease",
            }}
            aria-label="Acercar"
            title="Acercar"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => updateCameraState((current) => ({ ...current, radius: current.radius + 8 }))}
            onMouseEnter={() => setHoveredControl("zoom-out")}
            onMouseLeave={() => setHoveredControl((current) => (current === "zoom-out" ? null : current))}
            style={{
              width: 40,
              height: 40,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 34,
              lineHeight: 1,
              color: hoveredControl === "zoom-out" ? "#0f172a" : "rgba(15, 23, 42, 0.45)",
              transition: "color 180ms ease",
            }}
            aria-label="Alejar"
            title="Alejar"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => {
              const defaultCameraState = getDefaultCameraStateByProduct(product);
              cameraStateRef.current = defaultCameraState;
              cameraTargetRef.current = DEFAULT_CAMERA_TARGET;
              applyCameraState(defaultCameraState);
              applyCameraTarget(DEFAULT_CAMERA_TARGET);
            }}
            onMouseEnter={() => setHoveredControl("center")}
            onMouseLeave={() => setHoveredControl((current) => (current === "center" ? null : current))}
            style={{
              minHeight: 34,
              minWidth: 102,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontSize: 20,
              fontWeight: 700,
              padding: "0 2px",
              color: hoveredControl === "center" ? "#0f172a" : "rgba(15, 23, 42, 0.52)",
              transition: "color 180ms ease",
            }}
            aria-label="Centrar vista"
            title="Centrar vista"
          >
            Centrar
          </button>
        </div>
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: 10,
            display: "flex",
            gap: 220,
            alignItems: "center",
            transform: "translateX(-50%)",
            pointerEvents: "none",
          }}
        >
          <button
            type="button"
            onClick={() => updateCameraState((current) => ({ ...current, theta: current.theta - 18 }))}
            onMouseEnter={() => setHoveredControl("left")}
            onMouseLeave={() => setHoveredControl((current) => (current === "left" ? null : current))}
            style={{
              width: 56,
              height: 56,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              padding: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "auto",
            }}
            aria-label="Girar a la izquierda"
            title="Girar a la izquierda"
          >
            <Image
              src="/personaliza/icons/rotate-left.svg"
              alt=""
              aria-hidden
              width={34}
              height={34}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                opacity: hoveredControl === "left" ? 1 : 0.46,
                transition: "opacity 180ms ease",
              }}
            />
          </button>
          <button
            type="button"
            onClick={() => updateCameraState((current) => ({ ...current, theta: current.theta + 18 }))}
            onMouseEnter={() => setHoveredControl("right")}
            onMouseLeave={() => setHoveredControl((current) => (current === "right" ? null : current))}
            style={{
              width: 56,
              height: 56,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              padding: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "auto",
            }}
            aria-label="Girar a la derecha"
            title="Girar a la derecha"
          >
            <Image
              src="/personaliza/icons/rotate-right.svg"
              alt=""
              aria-hidden
              width={34}
              height={34}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                opacity: hoveredControl === "right" ? 1 : 0.46,
                transition: "opacity 180ms ease",
              }}
            />
          </button>
        </div>
        <div
          style={{
            position: "absolute",
            right: 28,
            top: "50%",
            display: "grid",
            gap: 42,
            transform: "translateY(-50%)",
            alignItems: "center",
            pointerEvents: "none",
          }}
        >
          <button
            type="button"
            onClick={() => updateCameraState((current) => ({ ...current, phi: current.phi - 6 }))}
            onMouseEnter={() => setHoveredControl("up")}
            onMouseLeave={() => setHoveredControl((current) => (current === "up" ? null : current))}
            style={{
              width: 56,
              height: 56,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              padding: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "auto",
            }}
            aria-label="Girar hacia arriba"
            title="Girar hacia arriba"
          >
            <Image
              src="/personaliza/icons/rotate-up.svg"
              alt=""
              aria-hidden
              width={34}
              height={34}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                opacity: hoveredControl === "up" ? 1 : 0.46,
                transition: "opacity 180ms ease",
              }}
            />
          </button>
          <button
            type="button"
            onClick={() => updateCameraState((current) => ({ ...current, phi: current.phi + 6 }))}
            onMouseEnter={() => setHoveredControl("down")}
            onMouseLeave={() => setHoveredControl((current) => (current === "down" ? null : current))}
            style={{
              width: 56,
              height: 56,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              padding: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "auto",
            }}
            aria-label="Girar hacia abajo"
            title="Girar hacia abajo"
          >
            <Image
              src="/personaliza/icons/rotate-down.svg"
              alt=""
              aria-hidden
              width={34}
              height={34}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                opacity: hoveredControl === "down" ? 1 : 0.46,
                transition: "opacity 180ms ease",
              }}
            />
          </button>
        </div>
      </div>
      {SHOW_DEBUG_PANEL ? (
        <div
          style={{
            marginTop: 8,
            border: "1px solid #cbd5e1",
            background: "#f8fafc",
            padding: "6px 8px",
            fontSize: 12,
            lineHeight: 1.35,
            color: "#334155",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {debugSummary}
        </div>
      ) : null}
    </>
  );
});

export default ModelPreview3D;
