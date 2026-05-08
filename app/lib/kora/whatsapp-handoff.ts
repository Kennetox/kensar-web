import type { KoraPageContext } from "./knowledge-types";

export type WhatsAppHandoffOrigin =
  | "kora_chat"
  | "floating_whatsapp"
  | "product_page_whatsapp"
  | "category_page"
  | "unknown";

export type WhatsAppHandoffNeed =
  | "compra"
  | "cotizacion"
  | "asesoria"
  | "servicio_tecnico"
  | "garantia"
  | "disponibilidad"
  | "envio"
  | "contacto_general";

export type WhatsAppHandoffIntent =
  | "advisor_request"
  | "quotation_request"
  | "product_interest"
  | "product_advice"
  | "technical_service"
  | "warranty_support"
  | "shipping_question"
  | "availability_question"
  | "general_contact"
  | "unknown";

type MemoryContext = {
  last_intent?: string | null;
  last_product_slug?: string | null;
  last_product_name?: string | null;
  last_product_sku?: string | null;
  last_recommendation_category?: string | null;
  preferred_category?: string | null;
};

export type BuildWhatsAppPrefillInput = {
  phone?: string | null;
  origin?: string | null;
  need?: string | null;
  intent?: string | null;
  userMessage?: string | null;
  latestInput?: string | null;
  currentPath?: string | null;
  currentUrl?: string | null;
  productName?: string | null;
  productSlug?: string | null;
  productSku?: string | null;
  productPrice?: number | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  memoryContext?: MemoryContext | null;
  pageContext?: KoraPageContext | null;
  actionValue?: string | null;
  sessionId?: string | null;
};

export type WhatsAppHandoffMetadata = {
  session_id: string;
  path: string;
  timestamp: string;
  handoff_origin: WhatsAppHandoffOrigin;
  handoff_need: WhatsAppHandoffNeed;
  handoff_intent_detected: WhatsAppHandoffIntent;
  handoff_product_slug: string | null;
  handoff_product_sku: string | null;
  handoff_category: string | null;
  handoff_product_price: number | null;
  handoff_message_length: number;
  handoff_has_memory_context: boolean;
};

export type BuildWhatsAppPrefillResult = {
  href: string;
  message: string;
  metadata: WhatsAppHandoffMetadata;
};

const DEFAULT_PHONE = "573185657508";
const DEFAULT_WEB_BASE_URL = "https://kensarelectronic.com";
const MAX_MESSAGE_CHARS = 700;

function normalizeSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function sanitizeText(value: unknown, maxLength = 180) {
  if (typeof value !== "string") return "";
  return normalizeSpaces(value).slice(0, maxLength);
}

function normalizePhone(phone: string | null | undefined) {
  const raw = sanitizeText(phone || process.env.NEXT_PUBLIC_KENSAR_WHATSAPP || DEFAULT_PHONE, 40);
  const digits = raw.replace(/[^\d]/g, "");
  return digits || DEFAULT_PHONE;
}

function inferOrigin(input: BuildWhatsAppPrefillInput): WhatsAppHandoffOrigin {
  const direct = sanitizeText(input.origin, 40).toLowerCase();
  if (direct === "kora_chat" || direct === "floating_whatsapp" || direct === "product_page_whatsapp" || direct === "category_page") {
    return direct;
  }
  const path = sanitizeText(input.currentPath, 220);
  if (path.startsWith("/catalogo/categoria/")) return "category_page";
  if (path.startsWith("/catalogo/")) return "product_page_whatsapp";
  return "unknown";
}

function inferNeed(rawNeed: string, actionValue: string, mergedText: string): WhatsAppHandoffNeed {
  if (actionValue === "advisor" || actionValue === "advisor_general") return "asesoria";
  if (actionValue === "cotizacion") return "cotizacion";
  if (actionValue === "asesoria_eleccion") return "asesoria";
  if (actionValue === "servicio_tecnico") return "servicio_tecnico";
  if (actionValue === "garantia") return "garantia";
  if (actionValue === "envio") return "envio";
  if (actionValue === "disponibilidad") return "disponibilidad";
  const hint = `${rawNeed} ${actionValue} ${mergedText}`.toLowerCase();
  if (/\bcotiz/.test(hint)) return "cotizacion";
  if (/\bservicio tecnico\b|\bsoporte\b|\brepar/.test(hint)) return "servicio_tecnico";
  if (/\bgarant/.test(hint)) return "garantia";
  if (/\benvio\b|\bentrega\b/.test(hint)) return "envio";
  if (/\bdisponib/.test(hint)) return "disponibilidad";
  if (/\basesor|ayuda para elegir|comparar|recomend/.test(hint)) return "asesoria";
  if (/\bcompr|carrito|pagar\b/.test(hint)) return "compra";
  return "contacto_general";
}

function inferIntent(rawIntent: string, need: WhatsAppHandoffNeed, mergedText: string): WhatsAppHandoffIntent {
  const hint = `${rawIntent} ${mergedText}`.toLowerCase();
  if (/\bcotiz/.test(hint) || need === "cotizacion") return "quotation_request";
  if (/\bservicio tecnico\b|\bsoporte\b/.test(hint) || need === "servicio_tecnico") return "technical_service";
  if (/\bgarant/.test(hint) || need === "garantia") return "warranty_support";
  if (/\benvio\b|\bentrega\b/.test(hint) || need === "envio") return "shipping_question";
  if (/\bdisponib/.test(hint) || need === "disponibilidad") return "availability_question";
  if (/\basesor|humano|agente\b/.test(hint)) return "advisor_request";
  if (/\bproducto|sku|modelo|referencia\b/.test(hint)) return "product_interest";
  if (/\brecom|elegir|comparar|opinion|opinión\b/.test(hint) || need === "asesoria") return "product_advice";
  if (need === "contacto_general") return "general_contact";
  return "unknown";
}

function labelForNeed(need: WhatsAppHandoffNeed) {
  const map: Record<WhatsAppHandoffNeed, string> = {
    compra: "Compra",
    cotizacion: "Cotización",
    asesoria: "Asesoría",
    servicio_tecnico: "Servicio técnico",
    garantia: "Garantía",
    disponibilidad: "Disponibilidad",
    envio: "Envío",
    contacto_general: "Contacto general",
  };
  return map[need];
}

function labelForOrigin(origin: WhatsAppHandoffOrigin) {
  const map: Record<WhatsAppHandoffOrigin, string> = {
    kora_chat: "KORA",
    floating_whatsapp: "Botón flotante web",
    product_page_whatsapp: "Página de producto",
    category_page: "Página de categoría",
    unknown: "Web Kensar",
  };
  return map[origin];
}

function normalizeUrl(currentUrl: string, currentPath: string) {
  const safeUrl = sanitizeText(currentUrl, 300);
  if (safeUrl.startsWith("http://") || safeUrl.startsWith("https://")) return safeUrl;
  const safePath = sanitizeText(currentPath, 220);
  if (!safePath) return DEFAULT_WEB_BASE_URL;
  const pathValue = safePath.startsWith("/") ? safePath : `/${safePath}`;
  return `${DEFAULT_WEB_BASE_URL}${pathValue}`;
}

function normalizePath(currentPath: string) {
  const safePath = sanitizeText(currentPath, 220);
  if (!safePath) return "/";
  return safePath.startsWith("/") ? safePath : `/${safePath}`;
}

function truncateMessage(message: string, maxChars: number) {
  if (message.length <= maxChars) return message;
  return `${message.slice(0, maxChars - 3).trimEnd()}...`;
}

function compactMessage(message: string) {
  return message
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

export function buildWhatsAppPrefill(input: BuildWhatsAppPrefillInput): BuildWhatsAppPrefillResult {
  const phone = normalizePhone(input.phone);
  const currentPath = sanitizeText(input.currentPath, 220);
  const safePath = normalizePath(currentPath);
  const timestamp = new Date().toISOString();
  const sessionId = sanitizeText(input.sessionId, 80) || `kora-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const normalizedUrl = normalizeUrl(sanitizeText(input.currentUrl, 300), currentPath);
  const actionValue = sanitizeText(input.actionValue, 80).toLowerCase();
  const pageContext = input.pageContext || null;
  const memory = input.memoryContext || null;
  const pageAttrs = pageContext?.productAttributes && typeof pageContext.productAttributes === "object"
    ? (pageContext.productAttributes as Record<string, unknown>)
    : null;

  const productName =
    sanitizeText(input.productName, 140) ||
    sanitizeText(pageContext?.productName, 140) ||
    sanitizeText(memory?.last_product_name, 140);
  const productSlug =
    sanitizeText(input.productSlug, 120) ||
    sanitizeText(typeof pageAttrs?.product_slug === "string" ? pageAttrs.product_slug : "", 120) ||
    sanitizeText(pageContext?.pageType === "product" ? currentPath.replace(/^\/catalogo\//, "").split("/")[0] || "" : "", 120) ||
    sanitizeText(memory?.last_product_slug, 120);
  const productSku =
    sanitizeText(input.productSku, 80) ||
    sanitizeText(typeof pageAttrs?.product_sku === "string" ? pageAttrs.product_sku : "", 80) ||
    sanitizeText(memory?.last_product_sku, 80);
  const categoryName =
    sanitizeText(input.categoryName, 120) ||
    sanitizeText(pageContext?.subcategoryName || pageContext?.categoryName || "", 120);
  const categorySlug =
    sanitizeText(input.categorySlug, 120) ||
    sanitizeText(pageContext?.subcategorySlug || pageContext?.categorySlug || "", 120) ||
    sanitizeText(memory?.last_recommendation_category || memory?.preferred_category || "", 120);
  const latestInput = sanitizeText(input.latestInput, 240);
  const userMessage = sanitizeText(input.userMessage, 280);

  const mergedHintText = normalizeSpaces(
    `${sanitizeText(input.need, 80)} ${sanitizeText(input.intent, 80)} ${actionValue} ${latestInput} ${userMessage}`
  );
  const origin = inferOrigin(input);
  const need = inferNeed(sanitizeText(input.need, 80), actionValue, mergedHintText);
  const rawIntent = sanitizeText(input.intent, 80) || sanitizeText(memory?.last_intent || "", 80);
  const resolvedIntent = inferIntent(rawIntent, need, mergedHintText);

  const lines: string[] = [];
  lines.push("Hola Kensar 👋");
  lines.push("Vengo desde la página web.");
  lines.push("");
  lines.push(`Necesidad: ${labelForNeed(need)}`);
  lines.push(`Origen: ${labelForOrigin(origin)}`);

  if (productName) lines.push(`Producto: ${productName}`);
  if (productSku) lines.push(`SKU: ${productSku}`);
  if (typeof input.productPrice === "number" && Number.isFinite(input.productPrice) && input.productPrice > 0) {
    lines.push(`Precio referencia: $${Math.round(input.productPrice).toLocaleString("es-CO")}`);
  }
  if (categoryName) lines.push(`Categoría: ${categoryName}`);
  if (!categoryName && categorySlug) lines.push(`Categoría: ${categorySlug}`);

  const consultation = latestInput || userMessage;
  if (consultation) lines.push(`Consulta: ${consultation}`);
  lines.push(`Link: ${normalizedUrl}`);

  let message = compactMessage(lines.join("\n"));
  message = truncateMessage(message, MAX_MESSAGE_CHARS);

  const metadata: WhatsAppHandoffMetadata = {
    session_id: sessionId,
    path: safePath,
    timestamp,
    handoff_origin: origin,
    handoff_need: need,
    handoff_intent_detected: resolvedIntent,
    handoff_product_slug: productSlug || null,
    handoff_product_sku: productSku || null,
    handoff_category: categorySlug || categoryName || null,
    handoff_product_price:
      typeof input.productPrice === "number" && Number.isFinite(input.productPrice) ? Number(input.productPrice) : null,
    handoff_message_length: message.length,
    handoff_has_memory_context: Boolean(
      memory &&
        (memory.last_intent ||
          memory.last_product_name ||
          memory.last_product_slug ||
          memory.last_recommendation_category ||
          memory.preferred_category)
    ),
  };

  return {
    href: `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
    message,
    metadata,
  };
}
