import { NextResponse } from "next/server";
import { getCatalogProduct, getCatalogProducts, formatCatalogPrice, getStockLabel } from "@/app/lib/metrikCatalog";
import { extractKoraEntities, type KoraNluResult } from "@/app/lib/kora/entities";
import { buildNluRoutedResponse } from "@/app/lib/kora/response-router";
import { resolveKoraCatalogRecommendation } from "@/app/lib/kora/recommender";

type AskRequest = {
  query?: string;
  path?: string;
  context?: ProductContext;
  memory?: {
    preferred_category?: string | null;
    budget_cop?: number | null;
    tone_mode?: "friendly" | "professional" | null;
    customer_goal?: "gift" | "home" | "business" | "studio" | null;
    last_emotion?: "neutral" | "frustrated" | "urgent" | "happy" | "doubtful" | null;
    last_product_slug?: string | null;
    last_product_name?: string | null;
    last_product_sku?: string | null;
    last_query?: string | null;
    last_recommended_products?: Array<{
      id: number;
      slug: string;
      name: string;
      price: number | null;
      category_path: string | null;
      category_name: string | null;
      brand: string | null;
      score?: number | null;
    }>;
    last_recommendation_query?: string | null;
    last_recommendation_category?: string | null;
    last_recommendation_attributes?: string[];
    last_usage_context?: string | null;
    last_recommendation_type?: string | null;
    last_intent?: "products" | "payments" | "shipping" | "warranty" | "advisor" | "orders" | "menu" | "unknown" | null;
    last_non_product_intent?: "payments" | "shipping" | "warranty" | "advisor" | "orders" | "menu" | null;
    last_support_topic?: "payments" | "shipping" | "warranty" | "advisor" | null;
  };
};

type ProductContext = {
  currentProductSlug?: string | null;
};

type ActionType = "command" | "link" | "whatsapp" | "add_to_cart" | "prompt";

type AddToCartPayload = {
  product_id: number;
  product_name: string;
  product_slug: string;
  product_sku: string | null;
  image_url: string | null;
  brand: string | null;
  stock_status: "in_stock" | "low_stock" | "out_of_stock" | "service" | "consultar";
  unit_price: number;
  compare_price: number | null;
};

type ChatActionOut = {
  id: string;
  label: string;
  icon?: string;
  type: ActionType;
  value: string;
  payload?: AddToCartPayload;
};

type AskResponse = {
  handled: boolean;
  intent:
    | "products"
    | "payments"
    | "shipping"
    | "warranty"
    | "advisor"
    | "orders"
    | "menu"
    | "unknown";
  answer: string;
  actions: ChatActionOut[];
  suggestions: string[];
  confidence_score?: number;
  resolution_kind?: "direct" | "disambiguation" | "fallback";
  emotion: "neutral" | "frustrated" | "urgent" | "happy" | "doubtful";
  companion_mode: boolean;
  memory_updates?: {
    preferred_category?: string | null;
    budget_cop?: number | null;
    tone_mode?: "friendly" | "professional" | null;
    customer_goal?: "gift" | "home" | "business" | "studio" | null;
    last_emotion?: "neutral" | "frustrated" | "urgent" | "happy" | "doubtful" | null;
    last_product_slug?: string | null;
    last_product_name?: string | null;
    last_product_sku?: string | null;
    last_query?: string | null;
    last_recommended_products?: Array<{
      id: number;
      slug: string;
      name: string;
      price: number | null;
      category_path: string | null;
      category_name: string | null;
      brand: string | null;
      score?: number | null;
    }>;
    last_recommendation_query?: string | null;
    last_recommendation_category?: string | null;
    last_recommendation_attributes?: string[];
    last_usage_context?: string | null;
    last_recommendation_type?: string | null;
    last_intent?: "products" | "payments" | "shipping" | "warranty" | "advisor" | "orders" | "menu" | "unknown" | null;
    last_non_product_intent?: "payments" | "shipping" | "warranty" | "advisor" | "orders" | "menu" | null;
    last_support_topic?: "payments" | "shipping" | "warranty" | "advisor" | null;
  };
  memory_patch?: {
    last_recommended_products?: Array<{
      id: number;
      slug: string;
      name: string;
      price: number | null;
      category_path: string | null;
      category_name: string | null;
      brand: string | null;
      score?: number | null;
    }>;
    last_recommendation_query?: string | null;
    last_recommendation_category?: string | null;
    last_recommendation_attributes?: string[];
    last_usage_context?: string | null;
    last_recommendation_type?: string | null;
    last_intent?: "products" | "payments" | "shipping" | "warranty" | "advisor" | "orders" | "menu" | "unknown" | null;
    last_non_product_intent?: "payments" | "shipping" | "warranty" | "advisor" | "orders" | "menu" | null;
    last_support_topic?: "payments" | "shipping" | "warranty" | "advisor" | null;
  };
  recommendation_debug?: {
    normalized_query: string;
    applied_aliases: string[];
    expanded_queries: string[];
    selected_category_paths: string[];
    product_scores: Array<{ id: number; slug: string; score: number }>;
  };
  nlu_debug?: KoraNluResult | null;
  product_cards?: Array<{
    id: number;
    slug: string;
    name: string;
    price: number | null;
    price_mode: string | null;
    brand: string | null;
    category_name: string | null;
    image_url: string | null;
    reason: string | null;
    url: string;
  }>;
};

type Emotion = AskResponse["emotion"];
type ToneMode = "friendly" | "professional";
type CustomerGoal = "gift" | "home" | "business" | "studio" | null;
type NonProductIntent = "payments" | "shipping" | "warranty" | "advisor" | "orders" | "menu";
type SupportTopic = "payments" | "shipping" | "warranty" | "advisor";

type ProductReference = {
  id: number;
  name: string;
  slug: string;
  sku: string | null;
  group_name?: string | null;
  category_path?: string | null;
  category_name?: string | null;
  image_url: string | null;
  image_thumb_url?: string | null;
  brand: string | null;
  stock_status: "in_stock" | "low_stock" | "out_of_stock" | "service" | "consultar";
  price_mode: "visible" | "consultar";
  price: number | null;
  compare_price: number | null;
};

const CATEGORY_ALIASES: Array<{ aliases: string[]; path: string }> = [
  { aliases: ["audio", "sonido", "cabina", "parlante", "bafle", "amplificador"], path: "audio-profesional" },
  { aliases: ["camara", "camaras", "seguridad", "vigilancia", "cctv"], path: "camaras" },
  { aliases: ["instrumento", "instrumentos", "guitarra", "bateria", "teclado", "microfono", "microfonos"], path: "instrumentos" },
  { aliases: ["accesorio", "accesorios", "cable", "soporte", "adaptador"], path: "accesorios" },
  { aliases: ["hogar", "tecnologia", "entretenimiento"], path: "tecnologia" },
];

function normalize(value: string) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCurrentProductSlug(pathname?: string, context?: ProductContext): string | null {
  const byContext = normalize(String(context?.currentProductSlug || ""));
  if (byContext) return byContext;

  const path = String(pathname || "").trim();
  if (!path.startsWith("/catalogo/")) return null;
  const withoutPrefix = path.replace(/^\/catalogo\//, "");
  const slug = withoutPrefix.split("/")[0]?.trim();
  if (!slug) return null;
  return decodeURIComponent(slug);
}

function buildAddToCartAction(item: ProductReference, idPrefix = "kora-add"): ChatActionOut | null {
  if (item.price_mode !== "visible" || item.price === null) return null;
  if (item.stock_status === "out_of_stock" || item.stock_status === "service" || item.stock_status === "consultar") return null;
  return {
    id: `${idPrefix}-${item.id}`,
    label: `Agregar ${item.name}`,
    icon: "🛒",
    type: "add_to_cart",
    value: String(item.id),
    payload: {
      product_id: item.id,
      product_name: item.name,
      product_slug: item.slug,
      product_sku: item.sku,
      image_url: item.image_thumb_url || item.image_url,
      brand: item.brand || null,
      stock_status: item.stock_status,
      unit_price: item.price,
      compare_price: item.compare_price ?? null,
    },
  };
}

function isOnProductAssistantIntent(text: string) {
  return /\b(este|esta|producto|parecido|similar|alternativa|economico|economica|barato|barata|mejor|calidad|potencia|opinas|opinion|vale la pena|agregar|carrito|comprar)\b/.test(
    text
  );
}

function wantsCheaperAlternative(text: string) {
  return /\b(barato|barata|economico|economica|mas barato|mas economico|menor precio)\b/.test(text);
}

function wantsPremiumAlternative(text: string) {
  return /\b(mejor|mas calidad|premium|pro|mas potente|potencia|gama alta)\b/.test(text);
}

function wantsSimilar(text: string) {
  return /\b(parecido|similar|alternativa|opcion parecida|algo como)\b/.test(text);
}

function wantsOpinion(text: string) {
  return /\b(opinas|opinion|recomiendas|vale la pena|que tal|es bueno)\b/.test(text);
}

function wantsAddToCart(text: string) {
  return /\b(agregar|anadir|añadir|sumar|meter).*\b(carrito)\b|\bcomprar ahora\b/.test(text);
}

function detectEmotion(text: string): Emotion {
  if (!text) return "neutral";
  if (/\b(urgente|ya|ahora|rapido|rapido|hoy mismo|cuanto antes)\b/.test(text)) return "urgent";
  if (/\b(mal|pesimo|pésimo|frustra|molesto|enojado|no sirve|no funciona|cansado)\b/.test(text)) return "frustrated";
  if (/\b(gracias|excelente|genial|perfecto|buenisimo|buenisimo|chevere|chévere)\b/.test(text)) return "happy";
  if (/\b(no se|no sé|duda|confund|ayudame|ayúdame|no entiendo)\b/.test(text)) return "doubtful";
  return "neutral";
}

function detectTonePreference(text: string, fallback: ToneMode = "friendly"): ToneMode {
  if (/\b(formal|profesional|serio|tecnico|técnico)\b/.test(text)) return "professional";
  if (/\b(cercan|human|amable|casual|tranqui)\b/.test(text)) return "friendly";
  return fallback;
}

function detectCustomerGoal(text: string, fallback: CustomerGoal = null): CustomerGoal {
  if (/\b(regalo|obsequio|cumpleanos|cumpleaños)\b/.test(text)) return "gift";
  if (/\b(negocio|empresa|local|emprendimiento|tienda)\b/.test(text)) return "business";
  if (/\b(hogar|casa|apartamento|sala)\b/.test(text)) return "home";
  if (/\b(estudio|grabacion|grabación|podcast)\b/.test(text)) return "studio";
  return fallback;
}

function companionModeForEmotion(emotion: Emotion) {
  return emotion === "frustrated" || emotion === "urgent";
}

function buildEmpathyLead(emotion: Emotion, tone: ToneMode): string {
  if (emotion === "urgent") {
    return tone === "professional"
      ? "Entendido. Vamos a resolverlo de la forma más rápida."
      : "Entendido, te ayudo de una y rápido.";
  }
  if (emotion === "frustrated") {
    return tone === "professional"
      ? "Entiendo la molestia. Vamos a resolverlo paso a paso."
      : "Te entiendo, vamos a resolverlo juntos sin enredos.";
  }
  if (emotion === "doubtful") {
    return tone === "professional"
      ? "Perfecto, te lo explico de forma clara."
      : "Tranquilo, te lo explico fácil.";
  }
  if (emotion === "happy") {
    return tone === "professional"
      ? "Excelente, avancemos."
      : "¡Qué bueno! Sigamos.";
  }
  return tone === "professional"
    ? "Claro, te ayudo con eso."
    : "Listo, te ayudo.";
}

function goalHint(goal: CustomerGoal, tone: ToneMode): string {
  if (goal === "gift") return tone === "professional" ? "Puedo priorizar opciones para regalo." : "Te priorizo opciones para regalo.";
  if (goal === "business") return tone === "professional" ? "Puedo enfocarlo para uso de negocio." : "Lo enfocamos para negocio.";
  if (goal === "home") return tone === "professional" ? "Puedo enfocarlo para uso en hogar." : "Lo enfocamos para casa.";
  if (goal === "studio") return tone === "professional" ? "Puedo enfocarlo para estudio/podcast." : "Lo enfocamos para estudio o podcast.";
  return "";
}

function prependLead(answer: string, lead: string, hint: string) {
  const parts = [lead, answer];
  if (hint) parts.push(hint);
  return parts.join("\n\n");
}

function ensureCompanionActions(actions: ChatActionOut[], companionMode: boolean): ChatActionOut[] {
  if (!companionMode) return actions;
  const hasWhatsApp = actions.some((action) => action.type === "whatsapp");
  if (hasWhatsApp) {
    const sorted = [...actions].sort((a, b) => (a.type === "whatsapp" ? -1 : b.type === "whatsapp" ? 1 : 0));
    return sorted;
  }
  return [
    { id: "companion-advisor", label: "Hablar por WhatsApp ahora", icon: "📞", type: "whatsapp", value: "advisor" },
    ...actions,
  ];
}

function finalizeResponse(
  base: Omit<AskResponse, "emotion" | "companion_mode">,
  context: { emotion: Emotion; tone: ToneMode; goal: CustomerGoal; companionMode: boolean; nluDebug?: KoraNluResult | null }
): AskResponse {
  const lead = buildEmpathyLead(context.emotion, context.tone);
  const hint = goalHint(context.goal, context.tone);
  const showDebug = process.env.NODE_ENV !== "production";
  return {
    ...base,
    answer: prependLead(base.answer, lead, hint),
    actions: ensureCompanionActions(base.actions, context.companionMode),
    emotion: context.emotion,
    companion_mode: context.companionMode,
    confidence_score: typeof base.confidence_score === "number" ? base.confidence_score : base.handled ? 0.82 : 0.34,
    resolution_kind: base.resolution_kind ?? (base.handled ? "direct" : "fallback"),
    memory_updates: {
      ...(base.memory_updates ?? {}),
      tone_mode: context.tone,
      customer_goal: context.goal,
      last_emotion: context.emotion,
      last_intent: base.intent,
      last_non_product_intent:
        base.intent !== "products" && base.intent !== "unknown"
          ? (base.intent as NonProductIntent)
          : base.memory_updates?.last_non_product_intent,
      last_support_topic:
        base.intent === "shipping" || base.intent === "payments" || base.intent === "warranty" || base.intent === "advisor"
          ? (base.intent as SupportTopic)
          : base.memory_updates?.last_support_topic,
    },
    recommendation_debug: showDebug ? base.recommendation_debug : undefined,
    nlu_debug: showDebug ? context.nluDebug || undefined : undefined,
  };
}

function isShortAmbiguousFollowup(text: string) {
  const normalized = normalize(text);
  if (!normalized) return false;
  if (normalized.length > 46) return false;
  if (/\b(quiero|busco|necesito|recomiend|guitarra|cabina|microfono|piano|teclado|camara|cable|parlante)\b/.test(normalized)) return false;
  return (
    /\b(y|y si|y a|como asi|como así|cuanto|cuánto|tarda|demora|costo|vale|cubre|reclamo|reclamar|nequi|transferencia|cuotas|contra entrega|ciudad|medellin|bogota|barranquilla)\b/.test(
      normalized
    ) || normalized.split(/\s+/).length <= 4
  );
}

function resolveSupportTopicFromMemory(memory?: AskRequest["memory"]): SupportTopic | null {
  const topic = memory?.last_support_topic;
  if (topic === "shipping" || topic === "payments" || topic === "warranty" || topic === "advisor") return topic;
  const fallback = memory?.last_non_product_intent;
  if (fallback === "shipping" || fallback === "payments" || fallback === "warranty" || fallback === "advisor") return fallback;
  return null;
}

function resolveSupportContextFollowup(
  query: string,
  currentIntent: AskResponse["intent"],
  nlu: KoraNluResult | null,
  memory?: AskRequest["memory"]
): Omit<AskResponse, "emotion" | "companion_mode"> | null {
  const normalized = normalize(query);
  const supportTopic = resolveSupportTopicFromMemory(memory);
  if (!supportTopic) return null;

  const hasStrongNewIntent =
    currentIntent === "products" ||
    currentIntent === "payments" ||
    currentIntent === "shipping" ||
    currentIntent === "warranty" ||
    currentIntent === "advisor" ||
    currentIntent === "orders";
  const hasNewProductSignal = Boolean(
    nlu?.category ||
    nlu?.intent === "product_search" ||
    nlu?.intent === "product_recommendation" ||
    nlu?.intent === "cheap_options" ||
    nlu?.intent === "premium_options"
  );

  if (hasStrongNewIntent || hasNewProductSignal) return null;
  if (!isShortAmbiguousFollowup(normalized)) return null;

  if (supportTopic === "shipping") {
    if (/\b(ciudad|medellin|bogota|barranquilla|cali|cartagena|bucaramanga|manizales)\b/.test(normalized)) {
      return {
        handled: true,
        intent: "shipping",
        answer:
          "Sí, hacemos envíos a diferentes ciudades de Colombia. Si quieres, dime tu ciudad y te orientamos mejor sobre cobertura y tiempos.",
        actions: [
          { id: "shipping-followup-advisor", label: "Confirmar cobertura por WhatsApp", icon: "📞", type: "whatsapp", value: "advisor" },
          { id: "shipping-followup-contact", label: "Ir a contacto", type: "link", value: "/contacto" },
        ],
        suggestions: ["Estoy en Medellín", "¿Cuánto tarda?", "¿Tiene costo?"],
        memory_updates: { last_support_topic: "shipping", last_non_product_intent: "shipping" },
      };
    }
    if (/\b(tarda|demora|tiempo)\b/.test(normalized)) {
      return {
        handled: true,
        intent: "shipping",
        answer:
          "El tiempo depende de la ciudad y disponibilidad del producto, pero normalmente puede variar según el destino y la transportadora.",
        actions: [
          { id: "shipping-time-advisor", label: "Validar tiempo por WhatsApp", icon: "📞", type: "whatsapp", value: "advisor" },
        ],
        suggestions: ["¿Envían a mi ciudad?", "¿Tiene costo?", "¿Puedo recoger en tienda?"],
        memory_updates: { last_support_topic: "shipping", last_non_product_intent: "shipping" },
      };
    }
    if (/\b(costo|vale|precio|cuanto cuesta)\b/.test(normalized)) {
      return {
        handled: true,
        intent: "shipping",
        answer:
          "El valor del envío depende de la ciudad, tamaño del producto y transportadora.",
        actions: [
          { id: "shipping-cost-advisor", label: "Cotizar envío por WhatsApp", icon: "📞", type: "whatsapp", value: "advisor" },
        ],
        suggestions: ["Estoy en Bogotá", "¿Cuánto tarda?", "¿Puedo recoger en tienda?"],
        memory_updates: { last_support_topic: "shipping", last_non_product_intent: "shipping" },
      };
    }
  }

  if (supportTopic === "payments") {
    return {
      handled: true,
      intent: "payments",
      answer:
        "Sí, podemos orientarte con transferencias, cuotas, Nequi y otras formas de pago según el pedido. Si quieres, te indico la mejor opción para tu compra.",
      actions: [
        { id: "payments-followup-page", label: "Ver opciones de pago", type: "link", value: "/pago" },
        { id: "payments-followup-advisor", label: "Confirmar por WhatsApp", icon: "📞", type: "whatsapp", value: "advisor" },
      ],
      suggestions: ["¿Reciben transferencia?", "¿Manejan cuotas?", "¿Puedo pagar contra entrega?"],
      memory_updates: { last_support_topic: "payments", last_non_product_intent: "payments" },
    };
  }

  if (supportTopic === "warranty") {
    return {
      handled: true,
      intent: "warranty",
      answer:
        "En garantía te ayudamos con cobertura, tiempos y proceso de reclamo. Si me compartes el producto o SKU, te indico el paso exacto.",
      actions: [
        { id: "warranty-followup-legal", label: "Ver políticas", type: "link", value: "/legal/cambios-devoluciones-garantias" },
        { id: "warranty-followup-advisor", label: "Soporte por WhatsApp", icon: "📞", type: "whatsapp", value: "advisor" },
      ],
      suggestions: ["¿Qué cubre la garantía?", "¿Cuánto tiempo cubre?", "¿Cómo reclamo?"],
      memory_updates: { last_support_topic: "warranty", last_non_product_intent: "warranty" },
    };
  }

  if (supportTopic === "advisor") {
    return {
      handled: true,
      intent: "advisor",
      answer: "Claro, te conecto con un asesor para resolverlo rápido por WhatsApp.",
      actions: [
        { id: "advisor-followup-open", label: "Abrir WhatsApp", icon: "📞", type: "whatsapp", value: "advisor" },
        { id: "advisor-followup-menu", label: "Volver al menú", type: "command", value: "menu" },
      ],
      suggestions: ["Necesito cotización", "Tengo una duda de pago", "Quiero soporte de garantía"],
      memory_updates: { last_support_topic: "advisor", last_non_product_intent: "advisor" },
    };
  }

  return null;
}

function shouldAskDisambiguation(
  ranked: ProductReference[],
  query: string
) {
  const tokens = extractMeaningfulTerms(query);
  if (ranked.length < 2) return false;
  if (tokens.length >= 3) return false;
  const first = scoreProductMatch(ranked[0], query);
  const second = scoreProductMatch(ranked[1], query);
  const gap = Math.abs(first - second);
  return gap <= 1.2;
}

function detectIntent(text: string): AskResponse["intent"] {
  if (!text) return "unknown";
  if (/\b(hola|inicio|menu)\b/.test(text)) return "menu";
  if (/\b(asesor|whatsapp|humano|agente)\b/.test(text)) return "advisor";
  if (/\b(pago|pagos|tarjeta|credito|addi|sistecredito|cuotas)\b/.test(text)) return "payments";
  if (/\b(envio|envios|despacho|domicilio|entrega|ciudad)\b/.test(text)) return "shipping";
  if (/\b(garantia|garantias|devolucion|devoluciones|cambio|soporte)\b/.test(text)) return "warranty";
  if (/\b(orden|pedido|mis pedidos|estado)\b/.test(text)) return "orders";
  if (/\b(producto|productos|catalogo|sku|codigo|precio|recomienda|recomendacion|quiero)\b/.test(text)) return "products";
  return "unknown";
}

function isGreetingOnly(text: string) {
  return /^(hola|holi|buenas|buenos dias|buenas tardes|buenas noches|hey|hello|hi)\b[!. ]*$/.test(text);
}

function isSmallTalk(text: string) {
  return (
    /\b(como estas|como vas|que tal|todo bien|como te va|como andas)\b/.test(text) ||
    /^(bien y tu|y tu|todo bien\??|que cuentas)\b/.test(text)
  );
}

function parseBudgetCop(text: string): number | null {
  const normalized = normalize(text);
  const milMatch = normalized.match(/(?:hasta|max(?:imo)?)\s+(\d{1,4})\s*mil\b/);
  if (milMatch) {
    return Number.parseInt(milMatch[1], 10) * 1000;
  }

  const rawMatch = normalized.match(/(?:hasta|max(?:imo)?)\s+\$?\s*([\d\.\,]{4,12})/);
  if (!rawMatch) return null;

  const digits = rawMatch[1].replace(/[^\d]/g, "");
  if (!digits) return null;
  const value = Number.parseInt(digits, 10);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

function detectCategoryPath(text: string): string | null {
  for (const row of CATEGORY_ALIASES) {
    if (row.aliases.some((alias) => text.includes(alias))) return row.path;
  }
  return null;
}

function buildCatalogSearchQuery(text: string): string {
  return normalize(text)
    .replace(/\b(hola|menu|quiero|buscar|busca|necesito|producto|productos|catalogo|de|para|con|el|la|los|las|un|una)\b/g, " ")
    .replace(/\b(hasta|maximo|max)\b\s+\$?\s*[\d\.\,]+\s*(mil)?\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string): string[] {
  return normalize(text)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

const PRODUCT_FOLLOWUP_STOPWORDS = new Set([
  "de",
  "del",
  "para",
  "con",
  "por",
  "el",
  "la",
  "los",
  "las",
  "un",
  "una",
  "quiero",
  "dame",
  "mostrar",
  "muestrame",
  "busca",
  "buscar",
  "que",
  "qué",
  "como",
  "cómo",
  "uno",
  "una",
  "opcion",
  "opción",
  "algo",
  "mas",
  "más",
]);

function extractMeaningfulTerms(text: string): string[] {
  return tokenize(text).filter((token) => token.length >= 3 && !PRODUCT_FOLLOWUP_STOPWORDS.has(token));
}

function stringSimilarity(a: string, b: string) {
  const left = normalize(a);
  const right = normalize(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) return 0.88;

  const leftTerms = new Set(extractMeaningfulTerms(left));
  const rightTerms = new Set(extractMeaningfulTerms(right));
  if (!leftTerms.size || !rightTerms.size) return 0;

  let matches = 0;
  leftTerms.forEach((term) => {
    if (rightTerms.has(term)) matches += 1;
  });
  const union = new Set([...leftTerms, ...rightTerms]).size;
  return union ? matches / union : 0;
}

function scoreProductMatch(item: ProductReference, query: string, preferredCategory?: string | null): number {
  const normalizedQuery = normalize(query);
  const terms = extractMeaningfulTerms(normalizedQuery);
  const corpus = normalize(
    [item.name, item.brand || "", item.sku || "", item.group_name || "", item.category_name || ""]
      .filter(Boolean)
      .join(" ")
  );

  let score = 0;
  for (const term of terms) {
    if (corpus.includes(term)) score += 2.5;
  }
  score += stringSimilarity(item.name, normalizedQuery) * 4;
  if (item.sku && normalizedQuery.includes(normalize(item.sku))) score += 5;
  if (preferredCategory && item.category_path && preferredCategory === item.category_path) score += 1.5;
  if (item.stock_status === "in_stock") score += 1;
  if (item.stock_status === "low_stock") score += 0.4;
  return score;
}

function hasProductFollowupSignal(text: string) {
  return /\b(ese|esa|este|esta|el de arriba|el anterior|otro|otra|similar|parecido|alternativa|mas barato|mas economico|mas potente|premium)\b/.test(
    text
  );
}

function findBestScoredProducts(items: ProductReference[], query: string, preferredCategory?: string | null) {
  return [...items]
    .map((item) => ({ item, score: scoreProductMatch(item, query, preferredCategory) }))
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .filter((row) => row.score > 0.2)
    .map((row) => row.item);
}

function buildBaseSuggestions(): string[] {
  return [
    "Ver catálogo",
    "Recomiéndame un producto",
    "Métodos de pago",
    "Envíos y garantías",
    "Hablar con asesor",
  ];
}

function buildBaseCommercialActions(): ChatActionOut[] {
  return [
    { id: "base-catalog", label: "Ver catálogo", icon: "🛍️", type: "command", value: "products" },
    { id: "base-recommend", label: "Recomiéndame un producto", type: "prompt", value: "Recomiéndame un producto" },
    { id: "base-payments", label: "Métodos de pago", type: "command", value: "payments" },
    { id: "base-shipping-warranty", label: "Envíos y garantías", type: "prompt", value: "Quiero saber de envíos y garantías" },
    { id: "base-advisor", label: "Hablar con asesor", icon: "📞", type: "command", value: "advisor" },
  ];
}

function isCapabilityHelpIntent(text: string) {
  return /\b(con que|con qué|en que|en qué|como|cómo).{0,24}\b(puedes ayudar|me ayudas|ayudarme|haces)\b/.test(text) ||
    /\b(que puedes hacer|qué puedes hacer|como funciona kora|cómo funciona kora)\b/.test(text);
}

async function resolveProductsResponse(
  query: string,
  memory?: AskRequest["memory"]
): Promise<AskResponse> {
  const normalized = normalize(query);
  const budget = parseBudgetCop(normalized) ?? (Number(memory?.budget_cop) || null);
  const categoryPath = detectCategoryPath(normalized) || (memory?.preferred_category || null);
  const searchQuery = buildCatalogSearchQuery(normalized);
  const rawSearch = searchQuery || normalized;

  let result = await getCatalogProducts({
    q: rawSearch || undefined,
    category: categoryPath || undefined,
    page: 1,
  }).catch(() => null);

  if ((!result || result.items.length === 0) && rawSearch) {
    result = await getCatalogProducts({ q: rawSearch, page: 1 }).catch(() => null);
  }

  if (!result) {
    return {
      handled: false,
      intent: "products",
      answer: "No pude consultar el catálogo en este momento. Intenta de nuevo o abre WhatsApp.",
      actions: [
        { id: "kora-catalog-fallback", label: "Ir al catálogo", type: "link", value: "/catalogo" },
        { id: "kora-advisor-fallback", label: "Hablar por WhatsApp", icon: "📞", type: "whatsapp", value: "advisor" },
      ],
      suggestions: buildBaseSuggestions(),
      emotion: "neutral",
      companion_mode: false,
    };
  }

  const filtered = budget
    ? result.items.filter((item) => item.price === null || item.price <= budget)
    : result.items;
  const ranked = findBestScoredProducts(filtered, rawSearch, categoryPath);
  const effective = ranked.length ? ranked : filtered;
  const topItems = effective.slice(0, 3);

  if (shouldAskDisambiguation(effective, rawSearch)) {
    const options = effective.slice(0, 3);
    return {
      handled: true,
      intent: "products",
      answer: "Veo varias coincidencias muy parecidas. ¿Cuál de estas opciones querías revisar primero?",
      actions: options.map((item) => ({
        id: `kora-disambiguate-${item.id}`,
        label: `${item.name}${item.sku ? ` (SKU ${item.sku})` : ""}`,
        type: "link",
        value: `/catalogo/${item.slug}`,
      })),
      suggestions: ["Dame una opción más económica", "Filtra por marca", "Ver catálogo completo"],
      confidence_score: 0.64,
      resolution_kind: "disambiguation",
      emotion: "neutral",
      companion_mode: false,
      memory_updates: {
        preferred_category: categoryPath || undefined,
        budget_cop: budget || undefined,
        last_query: rawSearch || undefined,
      },
    };
  }

  if (!topItems.length) {
    const budgetText = budget ? ` por debajo de ${formatCatalogPrice(budget)}` : "";
    return {
      handled: false,
      intent: "products",
      answer: `No encontré resultados${budgetText} con esa búsqueda. Prueba con otra categoría o rango.`,
      actions: [
        { id: "kora-catalog-empty", label: "Ver catálogo completo", type: "link", value: "/catalogo" },
        { id: "kora-advisor-empty", label: "Hablar por WhatsApp", icon: "📞", type: "whatsapp", value: "advisor" },
      ],
      suggestions: [
        "Mostrar audio profesional",
        "Ver instrumentos",
        "Buscar por SKU",
      ],
      emotion: "neutral",
      companion_mode: false,
    };
  }

  const actions: ChatActionOut[] = topItems.map((item) => ({
    id: `kora-product-${item.id}`,
    label: `${item.name} · ${formatCatalogPrice(item.price)}`,
    type: "link",
    value: `/catalogo/${item.slug}`,
  }));

  topItems.slice(0, 2).forEach((item) => {
    if (item.price_mode !== "visible" || item.price === null) return;
    if (item.stock_status === "out_of_stock" || item.stock_status === "service" || item.stock_status === "consultar") return;
    actions.push({
      id: `kora-add-${item.id}`,
      label: `Agregar ${item.name}`,
      icon: "🛒",
      type: "add_to_cart",
      value: String(item.id),
      payload: {
        product_id: item.id,
        product_name: item.name,
        product_slug: item.slug,
        product_sku: item.sku,
        image_url: item.image_thumb_url || item.image_url,
        brand: item.brand || null,
        stock_status: item.stock_status,
        unit_price: item.price,
        compare_price: item.compare_price ?? null,
      },
    });
  });

  const params = new URLSearchParams();
  if (searchQuery) params.set("q", searchQuery);
  if (categoryPath) params.set("category", categoryPath);
  const catalogHref = `/catalogo${params.toString() ? `?${params.toString()}` : ""}`;

  actions.push({ id: "kora-open-catalog", label: "Ver más opciones", type: "link", value: catalogHref });

  const budgetLine = budget ? ` dentro de ${formatCatalogPrice(budget)}` : "";
  return {
    handled: true,
    intent: "products",
    answer: `Te encontré ${Math.min(filtered.length, 3)} opción(es)${budgetLine}. Si quieres, te filtro por marca o uso.`,
    actions,
    suggestions: [
      "Muéstrame solo Yamaha",
      "Dame opciones más económicas",
      "Quiero hablar con un asesor",
    ],
    emotion: "neutral",
    companion_mode: false,
    memory_updates: {
      preferred_category: categoryPath || undefined,
      budget_cop: budget || undefined,
      last_query: rawSearch || undefined,
    },
    confidence_score: ranked.length ? 0.86 : 0.78,
    resolution_kind: "direct",
  };
}

async function resolveProductPageAssistantResponse(
  query: string,
  currentPath: string | undefined,
  context?: ProductContext
): Promise<AskResponse | null> {
  const normalized = normalize(query);
  const slug = parseCurrentProductSlug(currentPath, context);
  if (!slug) return null;
  if (!isOnProductAssistantIntent(normalized)) return null;

  const current = await getCatalogProduct(slug).catch(() => null);
  if (!current) return null;

  const catalogRows = await getCatalogProducts({
    category: current.category_path || undefined,
    page: 1,
  }).catch(() => null);
  const options = (catalogRows?.items || []).filter((item) => item.id !== current.id);

  const currentPrice = current.price_mode === "visible" ? current.price : null;
  const cheaper = currentPrice
    ? options
        .filter((item) => item.price_mode === "visible" && typeof item.price === "number" && item.price < currentPrice)
        .sort((a, b) => (a.price || 0) - (b.price || 0))
        .slice(0, 2)
    : [];

  const premium = currentPrice
    ? options
        .filter((item) => item.price_mode === "visible" && typeof item.price === "number" && item.price > currentPrice)
        .sort((a, b) => (b.price || 0) - (a.price || 0))
        .slice(0, 2)
    : [];

  const similar = options
    .filter((item) => item.price_mode === "visible" && item.price !== null)
    .sort((a, b) => {
      const aGap = currentPrice ? Math.abs((a.price || 0) - currentPrice) : 0;
      const bGap = currentPrice ? Math.abs((b.price || 0) - currentPrice) : 0;
      return aGap - bGap;
    })
    .slice(0, 2);

  const actions: ChatActionOut[] = [];
  const addCurrentAction = buildAddToCartAction(current, "current-product");
  if (addCurrentAction) actions.push(addCurrentAction);
  actions.push({
    id: "product-context-whatsapp",
    label: "Conectar asesor por WhatsApp",
    icon: "📞",
    type: "whatsapp",
    value: "advisor",
  });

  let comparedList = similar;
  let comparisonLead = "Te paso opciones parecidas para comparar.";

  if (wantsCheaperAlternative(normalized) && cheaper.length) {
    comparedList = cheaper;
    comparisonLead = "Te paso alternativas más económicas de esta misma línea.";
  } else if (wantsPremiumAlternative(normalized) && premium.length) {
    comparedList = premium;
    comparisonLead = "Si buscas más nivel, estas opciones suelen rendir mejor por potencia/calidad.";
  } else if (wantsSimilar(normalized) && similar.length) {
    comparedList = similar;
    comparisonLead = "Te paso opciones parecidas para que compares rápido.";
  } else if (wantsCheaperAlternative(normalized) && !cheaper.length) {
    comparisonLead = "Este producto ya está entre las opciones más económicas disponibles en esta categoría.";
  } else if (wantsPremiumAlternative(normalized) && !premium.length) {
    comparisonLead = "No encontré en esta categoría una opción más alta por precio en este momento.";
  }

  comparedList.forEach((item) => {
    actions.push({
      id: `product-alt-${item.id}`,
      label: `${item.name} · ${formatCatalogPrice(item.price)}`,
      type: "link",
      value: `/catalogo/${item.slug}`,
    });
    const addAltAction = buildAddToCartAction(item, "alt-add");
    if (addAltAction && actions.length < 6) {
      actions.push(addAltAction);
    }
  });

  actions.push({
    id: "product-context-open",
    label: "Ver producto completo",
    type: "link",
    value: `/catalogo/${current.slug}`,
  });

  let answer = `Veo que estás en ${current.name}${current.sku ? ` (SKU ${current.sku})` : ""}.`;
  if (wantsAddToCart(normalized)) {
    if (addCurrentAction) {
      answer = `${answer}\n\nClaro, te lo agrego de inmediato. También te dejo opciones relacionadas por si quieres comparar antes de cerrar compra.`;
    } else {
      answer = `${answer}\n\nEste producto no está listo para compra directa en carrito ahora mismo, pero te dejo opciones similares para avanzar.`;
    }
  } else if (wantsOpinion(normalized)) {
    answer = `${answer}\n\n${
      current.short_description?.trim() || "Es una opción sólida para uso general dentro de su categoría."
    }\n\nEstado: ${getStockLabel(current.stock_status)}${current.price_mode === "visible" ? ` · ${formatCatalogPrice(current.price)}` : " · Precio a consultar"}.\n\n${comparisonLead}`;
  } else {
    answer = `${answer}\n\nEstado: ${getStockLabel(current.stock_status)}${current.price_mode === "visible" ? ` · ${formatCatalogPrice(current.price)}` : " · Precio a consultar"}.\n\n${comparisonLead}`;
  }

  return {
    handled: true,
    intent: "products",
    answer,
    actions: actions.slice(0, 6),
    suggestions: [
      "Dame una opción más económica",
      "Muéstrame una de más potencia",
      "Agrega este producto al carrito",
    ],
    emotion: "neutral",
    companion_mode: false,
    memory_updates: {
      preferred_category: current.category_path || undefined,
      last_product_slug: current.slug,
      last_product_name: current.name,
      last_product_sku: current.sku || undefined,
    },
  };
}

async function resolveProductPageWelcome(
  currentPath: string | undefined,
  context?: ProductContext
): Promise<AskResponse | null> {
  const slug = parseCurrentProductSlug(currentPath, context);
  if (!slug) return null;

  const current = await getCatalogProduct(slug).catch(() => null);
  if (!current) return null;

  const actions: ChatActionOut[] = [];
  const addCurrentAction = buildAddToCartAction(current, "current-product-welcome");
  if (addCurrentAction) actions.push(addCurrentAction);
  actions.push(
    { id: "product-welcome-cheaper", label: "Ver una opción más económica", type: "prompt", value: "Dame una opción más económica" },
    { id: "product-welcome-premium", label: "Ver una de mayor potencia", type: "prompt", value: "Muéstrame una de más potencia" },
    { id: "product-welcome-opinion", label: "¿Qué opinas de este producto?", type: "prompt", value: "¿Qué opinas de este producto?" },
    { id: "product-welcome-whatsapp", label: "Conectar asesor por WhatsApp", icon: "📞", type: "whatsapp", value: "advisor" }
  );

  return {
    handled: true,
    intent: "products",
    answer: `Veo que estás en ${current.name}${current.sku ? ` (SKU ${current.sku})` : ""}. ${
      current.price_mode === "visible" ? `Está en ${formatCatalogPrice(current.price)}.` : "Este producto está en modo consultar."
    }\n\nSi quieres, te ayudo a comparar, resolver dudas o agregarlo al carrito.`,
    actions: actions.slice(0, 5),
    suggestions: [],
    emotion: "neutral",
    companion_mode: false,
    memory_updates: {
      preferred_category: current.category_path || undefined,
      last_product_slug: current.slug,
      last_product_name: current.name,
      last_product_sku: current.sku || undefined,
    },
  };
}

async function resolveMemoryProductFollowup(
  query: string,
  memory?: AskRequest["memory"]
): Promise<AskResponse | null> {
  const normalized = normalize(query);
  if (!hasProductFollowupSignal(normalized)) return null;

  const slug = normalize(String(memory?.last_product_slug || ""));
  if (!slug) return null;

  const current = await getCatalogProduct(slug).catch(() => null);
  if (!current) return null;

  const syntheticQuery = `${query} ${current.name} ${current.brand || ""} ${current.category_name || ""}`.trim();
  const response = await resolveProductsResponse(syntheticQuery, {
    ...memory,
    preferred_category: current.category_path || memory?.preferred_category || null,
  });

  const patchedAnswer = `Tomando como referencia el último producto que vimos (${current.name}), te propongo esto:\n\n${response.answer}`;
  return {
    ...response,
    handled: true,
    answer: patchedAnswer,
    memory_updates: {
      ...(response.memory_updates ?? {}),
      last_product_slug: current.slug,
      last_product_name: current.name,
      last_product_sku: current.sku || undefined,
      last_query: syntheticQuery,
    },
  };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as AskRequest | null;
  const query = String(body?.query || "").trim();
  const normalized = normalize(query);
  let nluDebug: KoraNluResult | null = null;
  try {
    nluDebug = extractKoraEntities(query);
  } catch {
    nluDebug = null;
  }
  const emotion = detectEmotion(normalized);
  const tone = detectTonePreference(normalized, body?.memory?.tone_mode === "professional" ? "professional" : "friendly");
  const goal = detectCustomerGoal(normalized, body?.memory?.customer_goal ?? null);
  const companionMode = companionModeForEmotion(emotion);
  const greetingOnly = isGreetingOnly(normalized);
  const smallTalk = isSmallTalk(normalized);

  if (query.length < 2) {
    return NextResponse.json<AskResponse>(
      finalizeResponse(
        {
        handled: false,
        intent: "unknown",
        answer: "Cuéntame qué necesitas y te ayudo a encontrarlo.",
        actions: [
          { id: "kora-menu", label: "Ver menú rápido", type: "command", value: "menu" },
          { id: "kora-catalog", label: "Ir al catálogo", type: "link", value: "/catalogo" },
        ],
        suggestions: buildBaseSuggestions(),
        },
        { emotion, tone, goal, companionMode, nluDebug }
      ),
      { status: 200 }
    );
  }

  const intent = detectIntent(normalized);

  if (isCapabilityHelpIntent(normalized)) {
    return NextResponse.json<AskResponse>(
      finalizeResponse(
        {
          handled: true,
          intent: "menu",
          answer:
            "Puedo ayudarte a encontrar productos, comparar opciones, recomendarte algo según tu presupuesto, explicarte pagos, envíos o garantías. También puedo pasarte con un asesor si prefieres atención por WhatsApp.",
          actions: buildBaseCommercialActions(),
          suggestions: buildBaseSuggestions(),
        },
        { emotion, tone, goal, companionMode, nluDebug }
      ),
      { status: 200 }
    );
  }

  if (greetingOnly) {
    const productWelcome = await resolveProductPageWelcome(body?.path, body?.context);
    if (productWelcome) {
      return NextResponse.json<AskResponse>(
        finalizeResponse(productWelcome, { emotion, tone, goal, companionMode, nluDebug }),
        { status: 200 }
      );
    }

    return NextResponse.json<AskResponse>(
      {
        handled: true,
        intent: "menu",
        answer:
          tone === "professional"
            ? "Hola, qué gusto saludarte.\n\nEstoy para ayudarte con productos, pagos, envíos o garantías. ¿Qué necesitas hoy?"
            : "¡Hola! Qué bueno tenerte por aquí.\n\nEstoy para ayudarte con productos, pagos, envíos o garantías. ¿Qué estás buscando hoy?",
        actions: [],
        suggestions: [],
        emotion,
        companion_mode: false,
        memory_updates: {
          tone_mode: tone,
          customer_goal: goal,
          last_emotion: emotion,
        },
      },
      { status: 200 }
    );
  }

  if (smallTalk) {
    return NextResponse.json<AskResponse>(
      {
        handled: true,
        intent: "menu",
        answer:
          tone === "professional"
            ? "¡Muy bien, gracias por preguntar! Lista para ayudarte.\n\nSi quieres, cuéntame qué estás buscando y te acompaño paso a paso."
            : "¡Muy bien, gracias por preguntar! 😄\n\nEstoy aquí contigo. Cuéntame qué estás buscando y te ayudo paso a paso.",
        actions: [],
        suggestions: [],
        emotion,
        companion_mode: false,
        memory_updates: {
          tone_mode: tone,
          customer_goal: goal,
          last_emotion: emotion,
        },
      },
      { status: 200 }
    );
  }

  if (nluDebug) {
    const recommendation = await resolveKoraCatalogRecommendation({
      query,
      nlu: nluDebug,
      memory: {
        preferred_category: body?.memory?.preferred_category,
        budget_cop: body?.memory?.budget_cop,
        last_query: body?.memory?.last_query,
        last_recommended_products: body?.memory?.last_recommended_products,
        last_recommendation_query: body?.memory?.last_recommendation_query,
        last_recommendation_category: body?.memory?.last_recommendation_category,
        last_recommendation_attributes: body?.memory?.last_recommendation_attributes,
        last_usage_context: body?.memory?.last_usage_context,
        last_recommendation_type: body?.memory?.last_recommendation_type,
      },
    });
    if (recommendation) {
      return NextResponse.json<AskResponse>(
        finalizeResponse(recommendation, { emotion, tone, goal, companionMode, nluDebug }),
        { status: 200 }
      );
    }
  }

  if (nluDebug) {
    const routed = buildNluRoutedResponse(nluDebug, {
      preferred_category: body?.memory?.preferred_category,
      last_product_name: body?.memory?.last_product_name,
      last_product_slug: body?.memory?.last_product_slug,
    });
    if (routed) {
      return NextResponse.json<AskResponse>(
        finalizeResponse(routed, { emotion, tone, goal, companionMode, nluDebug }),
        { status: 200 }
      );
    }
  }

  const supportFollowup = resolveSupportContextFollowup(query, intent, nluDebug, body?.memory);
  if (supportFollowup) {
    return NextResponse.json<AskResponse>(
      finalizeResponse(supportFollowup, { emotion, tone, goal, companionMode, nluDebug }),
      { status: 200 }
    );
  }

  const contextualProductReply = await resolveProductPageAssistantResponse(query, body?.path, body?.context);
  if (contextualProductReply) {
    return NextResponse.json<AskResponse>(
      finalizeResponse(contextualProductReply, { emotion, tone, goal, companionMode, nluDebug }),
      { status: 200 }
    );
  }

  const memoryFollowupReply = await resolveMemoryProductFollowup(query, body?.memory);
  if (memoryFollowupReply) {
    return NextResponse.json<AskResponse>(
      finalizeResponse(memoryFollowupReply, { emotion, tone, goal, companionMode, nluDebug }),
      { status: 200 }
    );
  }

  if (intent === "menu") {
    return NextResponse.json<AskResponse>(
      finalizeResponse(
        {
        handled: true,
        intent,
        answer: "Listo. Te dejo accesos rápidos para continuar.",
        actions: [
          { id: "menu-products", label: "Ver catálogo", icon: "🛍️", type: "command", value: "products" },
          { id: "menu-payments", label: "Métodos de pago", icon: "💳", type: "command", value: "payments" },
          { id: "menu-shipping", label: "Envíos", icon: "🚚", type: "command", value: "shipping" },
          { id: "menu-warranty", label: "Garantía", icon: "🛡️", type: "command", value: "warranty" },
          { id: "menu-advisor", label: "Hablar por WhatsApp", icon: "📞", type: "command", value: "advisor" },
        ],
        suggestions: buildBaseSuggestions(),
        },
        { emotion, tone, goal, companionMode, nluDebug }
      ),
      { status: 200 }
    );
  }

  if (intent === "products") {
    const response = await resolveProductsResponse(query, body?.memory);
    return NextResponse.json<AskResponse>(
      finalizeResponse(response, { emotion, tone, goal, companionMode, nluDebug }),
      { status: 200 }
    );
  }

  if (intent === "payments") {
    return NextResponse.json<AskResponse>(
      finalizeResponse(
        {
        handled: true,
        intent,
        answer: "Manejamos pagos en línea y opciones de financiación. Si quieres, te guío según tu presupuesto.",
        actions: [
          { id: "payments-go-checkout", label: "Ver opciones de pago", type: "link", value: "/pago" },
          { id: "payments-advisor", label: "Hablar por WhatsApp", icon: "📞", type: "whatsapp", value: "advisor" },
        ],
        suggestions: ["¿Puedo pagar por cuotas?", "¿Aceptan Addi?", "¿Cómo pago un pedido web?"],
        },
        { emotion, tone, goal, companionMode, nluDebug }
      ),
      { status: 200 }
    );
  }

  if (intent === "shipping") {
    return NextResponse.json<AskResponse>(
      finalizeResponse(
        {
        handled: true,
        intent,
        answer: "Hacemos envíos y también recogida en tienda. El tiempo final depende de tu ciudad.",
        actions: [
          { id: "shipping-contact", label: "Ir a contacto", type: "link", value: "/contacto" },
          { id: "shipping-advisor", label: "Confirmar envío por WhatsApp", icon: "📞", type: "whatsapp", value: "advisor" },
        ],
        suggestions: ["¿Envían a mi ciudad?", "¿Cuánto tarda el envío?", "¿Puedo recoger hoy en tienda?"],
        },
        { emotion, tone, goal, companionMode, nluDebug }
      ),
      { status: 200 }
    );
  }

  if (intent === "warranty") {
    return NextResponse.json<AskResponse>(
      finalizeResponse(
        {
        handled: true,
        intent,
        answer: "Todos los productos tienen garantía. Si me dices el producto o SKU, te indico el paso más rápido.",
        actions: [
          { id: "warranty-legal", label: "Ver políticas", type: "link", value: "/legal/cambios-devoluciones-garantias" },
          { id: "warranty-advisor", label: "Soporte por WhatsApp", icon: "📞", type: "whatsapp", value: "advisor" },
        ],
        suggestions: ["¿Cómo tramito garantía?", "¿Puedo hacer cambio?", "¿Qué cubre la garantía?"],
        },
        { emotion, tone, goal, companionMode, nluDebug }
      ),
      { status: 200 }
    );
  }

  if (intent === "orders") {
    return NextResponse.json<AskResponse>(
      finalizeResponse(
        {
        handled: true,
        intent,
        answer: "Para revisar estado de pedidos, entra a Mis pedidos. Si no tienes acceso, te ayudamos por WhatsApp.",
        actions: [
          { id: "orders-my", label: "Ir a Mis pedidos", type: "link", value: "/mis-pedidos" },
          { id: "orders-account", label: "Ir a Mi cuenta", type: "link", value: "/cuenta" },
          { id: "orders-advisor", label: "Ayuda por WhatsApp", icon: "📞", type: "whatsapp", value: "advisor" },
        ],
        suggestions: ["No encuentro mi pedido", "¿Cómo veo el estado del pago?", "Quiero soporte de una orden"],
        },
        { emotion, tone, goal, companionMode, nluDebug }
      ),
      { status: 200 }
    );
  }

  if (intent === "advisor") {
    return NextResponse.json<AskResponse>(
      finalizeResponse(
        {
        handled: true,
        intent,
        answer: "Te conecto con un asesor para resolverlo contigo en tiempo real.",
        actions: [
          { id: "advisor-open", label: "Abrir WhatsApp", icon: "📞", type: "whatsapp", value: "advisor" },
          { id: "advisor-menu", label: "Volver al menú", type: "command", value: "menu" },
        ],
        suggestions: ["Quiero ayuda con una compra", "Necesito cotización", "Tengo dudas de garantía"],
        },
        { emotion, tone, goal, companionMode: true, nluDebug }
      ),
      { status: 200 }
    );
  }

  return NextResponse.json<AskResponse>(
    finalizeResponse(
      {
      handled: false,
      intent: "unknown",
      answer: "No estoy segura de qué producto buscas. ¿Quieres que te ayude con sonido, instrumentos, cámaras, cables o formas de pago?",
      actions: [
        { id: "unknown-sound", label: "Cabinas y sonido", type: "prompt", value: "Quiero ver cabinas y sonido" },
        { id: "unknown-instruments", label: "Instrumentos musicales", type: "prompt", value: "Quiero ver instrumentos musicales" },
        { id: "unknown-security", label: "Cámaras de seguridad", type: "prompt", value: "Quiero ver cámaras de seguridad" },
        { id: "unknown-payments", label: "Formas de pago", type: "command", value: "payments" },
        { id: "unknown-advisor", label: "Hablar con asesor", icon: "📞", type: "command", value: "advisor" },
      ],
      suggestions: buildBaseSuggestions(),
      },
      { emotion, tone, goal, companionMode, nluDebug }
    ),
    { status: 200 }
  );
}
