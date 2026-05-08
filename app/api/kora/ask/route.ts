import { NextResponse } from "next/server";
import { getCatalogProduct, getCatalogProducts, formatCatalogPrice, getStockLabel } from "@/app/lib/metrikCatalog";
import { extractKoraEntities, type KoraNluResult } from "@/app/lib/kora/entities";
import { buildNluRoutedResponse } from "@/app/lib/kora/response-router";
import { resolveKoraCatalogRecommendation } from "@/app/lib/kora/recommender";
import { getKoraBusinessKnowledge } from "@/app/lib/kora/business-knowledge";
import { resolveContextualSellingResponse } from "@/app/lib/kora/contextual-selling";
import { sanitizePageContext } from "@/app/lib/kora/page-context";
import type { KoraContextualSellingDebug, KoraPageContext } from "@/app/lib/kora/knowledge-types";

type AskRequest = {
  query?: string;
  path?: string;
  context?: ProductContext;
  pageContext?: KoraPageContext;
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
    last_intent?:
      | "products"
      | "payments"
      | "shipping"
      | "warranty"
      | "advisor"
      | "orders"
      | "business_location"
      | "business_hours"
      | "business_contact"
      | "business_support"
      | "returns_policy"
      | "shipping_policy"
      | "warranty_policy"
      | "business_info"
      | "menu"
      | "unknown"
      | null;
    last_non_product_intent?: "payments" | "shipping" | "warranty" | "advisor" | "orders" | "menu" | null;
    last_support_topic?: "payments" | "shipping" | "warranty" | "returns" | "advisor" | null;
    last_business_topic?: "location" | "hours" | "contact" | "support" | "business_info" | null;
    last_conversation_topic?:
      | "products"
      | "shipping"
      | "payments"
      | "warranty"
      | "returns"
      | "location"
      | "hours"
      | "contact"
      | "support"
      | "business_info"
      | "unknown"
      | null;
    last_answer_domain?: "products" | "business" | "support" | "unknown" | null;
    last_category_opening_context?: string | null;
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
    | "business_location"
    | "business_hours"
    | "business_contact"
    | "business_support"
    | "returns_policy"
    | "shipping_policy"
    | "warranty_policy"
    | "business_info"
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
    last_intent?:
      | "products"
      | "payments"
      | "shipping"
      | "warranty"
      | "advisor"
      | "orders"
      | "business_location"
      | "business_hours"
      | "business_contact"
      | "business_support"
      | "returns_policy"
      | "shipping_policy"
      | "warranty_policy"
      | "business_info"
      | "menu"
      | "unknown"
      | null;
    last_non_product_intent?: "payments" | "shipping" | "warranty" | "advisor" | "orders" | "menu" | null;
    last_support_topic?: "payments" | "shipping" | "warranty" | "returns" | "advisor" | null;
    last_business_topic?: "location" | "hours" | "contact" | "support" | "business_info" | null;
    last_conversation_topic?:
      | "products"
      | "shipping"
      | "payments"
      | "warranty"
      | "returns"
      | "location"
      | "hours"
      | "contact"
      | "support"
      | "business_info"
      | "unknown"
      | null;
    last_answer_domain?: "products" | "business" | "support" | "unknown" | null;
    last_category_opening_context?: string | null;
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
    last_intent?:
      | "products"
      | "payments"
      | "shipping"
      | "warranty"
      | "advisor"
      | "orders"
      | "business_location"
      | "business_hours"
      | "business_contact"
      | "business_support"
      | "returns_policy"
      | "shipping_policy"
      | "warranty_policy"
      | "business_info"
      | "menu"
      | "unknown"
      | null;
    last_non_product_intent?: "payments" | "shipping" | "warranty" | "advisor" | "orders" | "menu" | null;
    last_support_topic?: "payments" | "shipping" | "warranty" | "returns" | "advisor" | null;
    last_business_topic?: "location" | "hours" | "contact" | "support" | "business_info" | null;
    last_conversation_topic?:
      | "products"
      | "shipping"
      | "payments"
      | "warranty"
      | "returns"
      | "location"
      | "hours"
      | "contact"
      | "support"
      | "business_info"
      | "unknown"
      | null;
    last_answer_domain?: "products" | "business" | "support" | "unknown" | null;
    last_category_opening_context?: string | null;
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
  contextual_selling_debug?: KoraContextualSellingDebug;
  telemetry_meta?: {
    resolver_used:
      | "business_support"
      | "contextual_selling"
      | "recommender"
      | "product_page_assistant"
      | "memory_followup"
      | "nlu_router"
      | "fallback";
    response_type: "explanation" | "recommendation" | "support" | "fallback" | "menu";
    detected_intent: string;
    detected_category: string | null;
    detected_attributes: string[];
    fallback_used: boolean;
  };
};

type Emotion = AskResponse["emotion"];
type ToneMode = "friendly" | "professional";
type CustomerGoal = "gift" | "home" | "business" | "studio" | null;
type NonProductIntent = "payments" | "shipping" | "warranty" | "advisor" | "orders" | "menu";
type SupportTopic = "payments" | "shipping" | "warranty" | "returns" | "advisor";
type BusinessTopic = "location" | "hours" | "contact" | "support" | "business_info";
type ConversationTopic =
  | "products"
  | "shipping"
  | "payments"
  | "warranty"
  | "returns"
  | "location"
  | "hours"
  | "contact"
  | "support"
  | "business_info"
  | "unknown";

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
  return "";
}

function goalHint(goal: CustomerGoal, tone: ToneMode): string {
  if (goal === "gift") return tone === "professional" ? "Puedo priorizar opciones para regalo." : "Te priorizo opciones para regalo.";
  if (goal === "business") return tone === "professional" ? "Puedo enfocarlo para uso de negocio." : "Lo enfocamos para negocio.";
  if (goal === "home") return tone === "professional" ? "Puedo enfocarlo para uso en hogar." : "Lo enfocamos para casa.";
  if (goal === "studio") return tone === "professional" ? "Puedo enfocarlo para estudio/podcast." : "Lo enfocamos para estudio o podcast.";
  return "";
}

function prependLead(answer: string, lead: string, hint: string) {
  const parts = [lead, answer].filter(Boolean);
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
    { id: "companion-advisor", label: "Hablar por WhatsApp ahora", icon: "📞", type: "whatsapp", value: "advisor_general" },
    ...actions,
  ];
}

function mapIntentToConversationTopic(intent: AskResponse["intent"]): ConversationTopic {
  if (intent === "products") return "products";
  if (intent === "shipping" || intent === "shipping_policy") return "shipping";
  if (intent === "payments") return "payments";
  if (intent === "warranty" || intent === "warranty_policy") return "warranty";
  if (intent === "returns_policy") return "returns";
  if (intent === "business_location") return "location";
  if (intent === "business_hours") return "hours";
  if (intent === "business_contact") return "contact";
  if (intent === "business_support") return "support";
  if (intent === "business_info") return "business_info";
  return "unknown";
}

function mapConversationTopicToDomain(topic: ConversationTopic): "products" | "business" | "support" | "unknown" {
  if (topic === "products") return "products";
  if (topic === "shipping" || topic === "payments" || topic === "warranty" || topic === "returns") return "support";
  if (topic === "location" || topic === "hours" || topic === "contact" || topic === "support" || topic === "business_info") return "business";
  return "unknown";
}

function finalizeResponse(
  base: Omit<AskResponse, "emotion" | "companion_mode">,
  context: {
    emotion: Emotion;
    tone: ToneMode;
    goal: CustomerGoal;
    companionMode: boolean;
    nluDebug?: KoraNluResult | null;
    contextualSellingDebug?: KoraContextualSellingDebug | null;
  }
): AskResponse {
  const lead = buildEmpathyLead(context.emotion, context.tone);
  const hint = goalHint(context.goal, context.tone);
  const showDebug = process.env.NODE_ENV !== "production";
  const topic = mapIntentToConversationTopic(base.intent);
  const domain = mapConversationTopicToDomain(topic);
  const supportTopic: SupportTopic | undefined =
    topic === "shipping" ? "shipping" :
    topic === "payments" ? "payments" :
    topic === "warranty" ? "warranty" :
    topic === "returns" ? "returns" :
    base.intent === "advisor" ? "advisor" :
    undefined;
  const businessTopic: BusinessTopic | undefined =
    topic === "location" ? "location" :
    topic === "hours" ? "hours" :
    topic === "contact" ? "contact" :
    topic === "support" ? "support" :
    topic === "business_info" ? "business_info" :
    undefined;
  const isSupportIntent =
    base.intent === "payments" ||
    base.intent === "shipping" ||
    base.intent === "warranty" ||
    base.intent === "returns_policy" ||
    base.intent === "shipping_policy" ||
    base.intent === "warranty_policy" ||
    base.intent === "business_location" ||
    base.intent === "business_hours" ||
    base.intent === "business_contact" ||
    base.intent === "business_support" ||
    base.intent === "business_info" ||
    base.intent === "advisor";
  const resolverUsed =
    context.contextualSellingDebug
      ? "contextual_selling"
      : base.recommendation_debug
        ? "recommender"
        : isSupportIntent
          ? "business_support"
          : base.intent === "products" && base.memory_updates?.last_product_slug
            ? "product_page_assistant"
            : base.intent === "products" && base.memory_patch?.last_recommendation_type === "followup"
              ? "memory_followup"
              : base.intent === "menu"
                ? "nlu_router"
                : base.handled
                  ? "nlu_router"
                  : "fallback";
  const responseType: "explanation" | "recommendation" | "support" | "fallback" | "menu" =
    base.intent === "menu"
      ? "menu"
      : !base.handled || base.resolution_kind === "fallback"
        ? "fallback"
        : context.contextualSellingDebug?.detectedGuidanceIntent === "attribute_explanation"
          ? "explanation"
          : isSupportIntent
            ? "support"
            : "recommendation";
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
        base.intent === "payments" ||
        base.intent === "shipping" ||
        base.intent === "warranty" ||
        base.intent === "advisor" ||
        base.intent === "orders" ||
        base.intent === "menu"
          ? base.intent
          : base.intent === "returns_policy"
            ? "warranty"
          : base.memory_updates?.last_non_product_intent,
      last_support_topic:
        supportTopic ?? base.memory_updates?.last_support_topic,
      last_business_topic:
        businessTopic ?? base.memory_updates?.last_business_topic,
      last_conversation_topic:
        topic ?? base.memory_updates?.last_conversation_topic,
      last_answer_domain:
        domain ?? base.memory_updates?.last_answer_domain,
    },
    recommendation_debug: showDebug ? base.recommendation_debug : undefined,
    nlu_debug: showDebug ? context.nluDebug || undefined : undefined,
    contextual_selling_debug: showDebug ? context.contextualSellingDebug || undefined : undefined,
    telemetry_meta: {
      resolver_used: resolverUsed,
      response_type: responseType,
      detected_intent: context.nluDebug?.intent || base.intent,
      detected_category: context.nluDebug?.category || null,
      detected_attributes: context.nluDebug?.attributes || [],
      fallback_used: !base.handled || base.resolution_kind === "fallback",
    },
  };
}

function isShortAmbiguousFollowup(text: string) {
  const normalized = normalize(text);
  if (!normalized) return false;
  if (normalized.length > 62) return false;
  if (/\b(quiero|busco|necesito|recomiend|guitarra|cabina|microfono|piano|teclado|camara|cable|parlante)\b/.test(normalized)) return false;
  return (
    /\b(y|y si|y a|como asi|como así|cuanto|cuánto|tarda|demora|costo|vale|cubre|reclamo|reclamar|nequi|transferencia|cuotas|contra entrega|ciudad|medellin|bogota|barranquilla|contacto|correo|numero|número|ubicados|ubicacion|ubicación|abren|domingos|hoy)\b/.test(
      normalized
    ) || normalized.split(/\s+/).length <= 4
  );
}

function resolveSupportTopicFromMemory(memory?: AskRequest["memory"]): SupportTopic | null {
  const topic = memory?.last_support_topic;
  if (topic === "shipping" || topic === "payments" || topic === "warranty" || topic === "returns" || topic === "advisor") return topic;
  const fallback = memory?.last_non_product_intent;
  if (fallback === "shipping" || fallback === "payments" || fallback === "warranty" || fallback === "advisor") return fallback;
  return null;
}

function resolveBusinessTopicFromMemory(memory?: AskRequest["memory"]): BusinessTopic | null {
  const topic = memory?.last_business_topic;
  if (topic === "location" || topic === "hours" || topic === "contact" || topic === "support" || topic === "business_info") return topic;
  const conversation = memory?.last_conversation_topic;
  if (conversation === "location" || conversation === "hours" || conversation === "contact" || conversation === "support" || conversation === "business_info") {
    return conversation;
  }
  return null;
}

function hasStrongNewProductIntent(currentIntent: AskResponse["intent"], nlu: KoraNluResult | null) {
  if (currentIntent === "products") return true;
  if (nlu?.category) return true;
  return (
    nlu?.intent === "product_search" ||
    nlu?.intent === "product_recommendation" ||
    nlu?.intent === "cheap_options" ||
    nlu?.intent === "premium_options" ||
    nlu?.intent === "product_comparison"
  );
}

function resolveUnifiedContextFollowup(
  query: string,
  currentIntent: AskResponse["intent"],
  nlu: KoraNluResult | null,
  memory?: AskRequest["memory"]
): Omit<AskResponse, "emotion" | "companion_mode"> | null {
  const normalized = normalize(query);
  const kb = getKoraBusinessKnowledge();
  const supportTopic = resolveSupportTopicFromMemory(memory);
  const businessTopic = resolveBusinessTopicFromMemory(memory);
  const activeTopic = businessTopic || supportTopic || memory?.last_conversation_topic || null;
  if (!activeTopic || activeTopic === "unknown") return null;

  if (hasStrongNewProductIntent(currentIntent, nlu)) return null;
  const hasStrongNewNonProductIntent =
    currentIntent === "payments" ||
    currentIntent === "shipping" ||
    currentIntent === "warranty" ||
    currentIntent === "returns_policy" ||
    currentIntent === "shipping_policy" ||
    currentIntent === "warranty_policy" ||
    currentIntent === "business_location" ||
    currentIntent === "business_hours" ||
    currentIntent === "business_contact" ||
    currentIntent === "business_support" ||
    currentIntent === "business_info";
  if (hasStrongNewNonProductIntent) return null;
  if (!isShortAmbiguousFollowup(normalized)) return null;

  if (activeTopic === "hours") {
    return {
      handled: true,
      intent: "business_hours",
      answer: `Nuestros horarios son:\n${kb.schedules.weekdays}\n${kb.schedules.saturday}\n${kb.schedules.sunday}`,
      actions: [
        { id: "ctx-hours-contact", label: "Contacto", type: "link", value: kb.key_pages.contact },
        { id: "ctx-hours-location", label: "Ubicación", type: "prompt", value: "Dónde están ubicados" },
        { id: "ctx-hours-whatsapp", label: "Hablar por WhatsApp", type: "whatsapp", value: "advisor_general", icon: "📞" },
      ],
      suggestions: ["¿Abren hoy?", "¿Abren domingos?", "¿Dónde están ubicados?"],
      memory_updates: { last_business_topic: "hours", last_conversation_topic: "hours", last_answer_domain: "business" },
    };
  }

  if (activeTopic === "contact") {
    return {
      handled: true,
      intent: "business_contact",
      answer: `Puedes escribirnos por WhatsApp al +${kb.whatsapp} o al correo ${kb.email}.`,
      actions: [
        { id: "ctx-contact-whatsapp", label: "Hablar por WhatsApp", type: "whatsapp", value: "advisor_general", icon: "📞" },
        { id: "ctx-contact-page", label: "Ver contacto", type: "link", value: kb.key_pages.contact },
        { id: "ctx-contact-maps", label: "Ver en Google Maps", type: "link", value: kb.maps_url },
      ],
      suggestions: ["¿Cuál es el número?", "¿Cuál es el correo?", "¿Dónde están ubicados?"],
      memory_updates: { last_business_topic: "contact", last_conversation_topic: "contact", last_answer_domain: "business" },
    };
  }

  if (activeTopic === "location") {
    return {
      handled: true,
      intent: "business_location",
      answer: `Estamos ubicados en ${kb.city}, en la ${kb.address}.`,
      actions: [
        { id: "ctx-location-maps", label: "Ver en Google Maps", type: "link", value: kb.maps_url },
        { id: "ctx-location-contact", label: "Contacto", type: "prompt", value: "Contacto" },
        { id: "ctx-location-whatsapp", label: "Hablar por WhatsApp", type: "whatsapp", value: "advisor_general", icon: "📞" },
      ],
      suggestions: ["¿Tienen tienda física?", "¿Cómo llego?", "¿Qué horario manejan?"],
      memory_updates: { last_business_topic: "location", last_conversation_topic: "location", last_answer_domain: "business" },
    };
  }

  if (supportTopic === "shipping") {
    if (/\b(ciudad|medellin|bogota|barranquilla|cali|cartagena|bucaramanga|manizales)\b/.test(normalized)) {
      return {
        handled: true,
        intent: "shipping",
        answer:
          "Sí, hacemos envíos a diferentes ciudades de Colombia. Si quieres, dime tu ciudad y te orientamos mejor sobre cobertura y tiempos.",
        actions: [
          { id: "shipping-followup-advisor", label: "Confirmar cobertura por WhatsApp", icon: "📞", type: "whatsapp", value: "envio" },
          { id: "shipping-followup-contact", label: "Ir a contacto", type: "link", value: "/contacto" },
        ],
        suggestions: ["Estoy en Medellín", "¿Cuánto tarda?", "¿Tiene costo?"],
        memory_updates: { last_support_topic: "shipping", last_non_product_intent: "shipping", last_conversation_topic: "shipping", last_answer_domain: "support" },
      };
    }
    if (/\b(tarda|demora|tiempo)\b/.test(normalized)) {
      return {
        handled: true,
        intent: "shipping",
        answer:
          "El tiempo depende de la ciudad y disponibilidad del producto, pero normalmente puede variar según el destino y la transportadora.",
        actions: [
          { id: "shipping-time-advisor", label: "Validar tiempo por WhatsApp", icon: "📞", type: "whatsapp", value: "envio" },
        ],
        suggestions: ["¿Envían a mi ciudad?", "¿Tiene costo?", "¿Puedo recoger en tienda?"],
        memory_updates: { last_support_topic: "shipping", last_non_product_intent: "shipping", last_conversation_topic: "shipping", last_answer_domain: "support" },
      };
    }
    if (/\b(costo|vale|precio|cuanto cuesta)\b/.test(normalized)) {
      return {
        handled: true,
        intent: "shipping",
        answer:
          "El valor del envío depende de la ciudad, tamaño del producto y transportadora.",
        actions: [
          { id: "shipping-cost-advisor", label: "Cotizar envío por WhatsApp", icon: "📞", type: "whatsapp", value: "envio" },
        ],
        suggestions: ["Estoy en Bogotá", "¿Cuánto tarda?", "¿Puedo recoger en tienda?"],
        memory_updates: { last_support_topic: "shipping", last_non_product_intent: "shipping", last_conversation_topic: "shipping", last_answer_domain: "support" },
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
        { id: "payments-followup-advisor", label: "Confirmar por WhatsApp", icon: "📞", type: "whatsapp", value: "cotizacion" },
      ],
      suggestions: ["¿Reciben transferencia?", "¿Manejan cuotas?", "¿Puedo pagar contra entrega?"],
      memory_updates: { last_support_topic: "payments", last_non_product_intent: "payments", last_conversation_topic: "payments", last_answer_domain: "support" },
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
        { id: "warranty-followup-advisor", label: "Soporte por WhatsApp", icon: "📞", type: "whatsapp", value: "garantia" },
      ],
      suggestions: ["¿Qué cubre la garantía?", "¿Cuánto tiempo cubre?", "¿Cómo reclamo?"],
      memory_updates: { last_support_topic: "warranty", last_non_product_intent: "warranty", last_conversation_topic: "warranty", last_answer_domain: "support" },
    };
  }

  if (supportTopic === "returns") {
    return {
      handled: true,
      intent: "returns_policy",
      answer: "Sí, te ayudamos con cambios y devoluciones según la política vigente. Si me dices el caso, te indico el paso exacto.",
      actions: [
        { id: "ctx-returns-policy", label: "Ver política de cambios/devoluciones", type: "link", value: kb.policies.returns },
        { id: "ctx-returns-whatsapp", label: "Hablar por WhatsApp", type: "whatsapp", value: "advisor_general", icon: "📞" },
      ],
      suggestions: ["¿Puedo cambiarlo?", "¿Me devuelven el dinero?", "¿Cuánto tiempo tengo?"],
      memory_updates: { last_support_topic: "returns", last_non_product_intent: "warranty", last_conversation_topic: "returns", last_answer_domain: "support" },
    };
  }

  if (supportTopic === "advisor") {
    return {
      handled: true,
      intent: "advisor",
      answer: "Claro, te conecto con un asesor para resolverlo rápido por WhatsApp.",
      actions: [
        { id: "advisor-followup-open", label: "Abrir WhatsApp", icon: "📞", type: "whatsapp", value: "advisor_general" },
        { id: "advisor-followup-menu", label: "Volver al menú", type: "command", value: "menu" },
      ],
      suggestions: ["Necesito cotización", "Tengo una duda de pago", "Quiero soporte de garantía"],
      memory_updates: { last_support_topic: "advisor", last_non_product_intent: "advisor", last_conversation_topic: "support", last_answer_domain: "support" },
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
  if (/\b(donde estan|dónde están|ubicad|tienda fisica|tienda física|donde los encuentro)\b/.test(text)) return "business_location";
  if (/\b(horario|horarios|a que hora abren|a qué hora abren|abren domingos|atienden hoy)\b/.test(text)) return "business_hours";
  if (/\b(cual es el whatsapp|cuál es el whatsapp|numero de whatsapp|número de whatsapp|correo|email|contacto)\b/.test(text)) return "business_contact";
  if (/\b(soporte tecnico|soporte técnico|arreglan equipos|servicio tecnico|servicio técnico)\b/.test(text)) return "business_support";
  if (/\b(devolucion|devolución|devoluciones|politica de cambios|política de cambios)\b/.test(text)) return "returns_policy";
  if (/\b(politica de envios|política de envíos|politica de envio|política de envío)\b/.test(text)) return "shipping_policy";
  if (/\b(politica de garantia|política de garantía|que cubre la garantia|qué cubre la garantía)\b/.test(text)) return "warranty_policy";
  if (/\b(asesor|whatsapp|humano|agente)\b/.test(text)) return "advisor";
  if (/\b(pago|pagos|tarjeta|credito|addi|sistecredito|cuotas)\b/.test(text)) return "payments";
  if (/\b(envio|envios|despacho|domicilio|entrega|ciudad)\b/.test(text)) return "shipping";
  if (/\b(garantia|garantias|devolucion|devoluciones|cambio|soporte)\b/.test(text)) return "warranty";
  if (/\b(orden|pedido|mis pedidos|estado)\b/.test(text)) return "orders";
  if (/\b(producto|productos|catalogo|sku|codigo|precio|recomienda|recomendacion|quiero)\b/.test(text)) return "products";
  return "unknown";
}

function resolveBusinessIntentFromNluOrText(nlu: KoraNluResult | null, query: string): AskResponse["intent"] | null {
  const normalized = normalize(query);
  if (/\b(cual es el whatsapp|cuál es el whatsapp|numero de whatsapp|número de whatsapp)\b/.test(normalized)) {
    return "business_contact";
  }
  const nluIntent = nlu?.intent || null;
  if (
    nluIntent === "business_location" ||
    nluIntent === "business_hours" ||
    nluIntent === "business_contact" ||
    nluIntent === "business_support" ||
    nluIntent === "returns_policy" ||
    nluIntent === "shipping_policy" ||
    nluIntent === "warranty_policy" ||
    nluIntent === "business_info"
  ) {
    return nluIntent;
  }
  const byText = detectIntent(normalized);
  if (
    byText === "business_location" ||
    byText === "business_hours" ||
    byText === "business_contact" ||
    byText === "business_support" ||
    byText === "returns_policy" ||
    byText === "shipping_policy" ||
    byText === "warranty_policy" ||
    byText === "business_info"
  ) {
    return byText;
  }
  return null;
}

function resolveBusinessKnowledgeResponse(nlu: KoraNluResult | null, query: string): Omit<AskResponse, "emotion" | "companion_mode"> | null {
  const intent = resolveBusinessIntentFromNluOrText(nlu, query);
  if (!intent) return null;
  const kb = getKoraBusinessKnowledge();

  if (intent === "business_location") {
    return {
      handled: true,
      intent,
      answer: `Estamos ubicados en ${kb.city}, en la ${kb.address}.`,
      actions: [
        { id: "biz-maps", label: "Ver en Google Maps", type: "link", value: kb.maps_url },
        { id: "biz-whatsapp-location", label: "Hablar por WhatsApp", type: "whatsapp", value: "advisor_general", icon: "📞" },
        { id: "biz-hours", label: "Ver horarios", type: "prompt", value: "Qué horario manejan" },
      ],
      suggestions: ["¿Tienen tienda física?", "¿Qué horario manejan?", "¿Abren domingos?"],
    };
  }

  if (intent === "business_hours") {
    return {
      handled: true,
      intent,
      answer: `Nuestros horarios son:\n${kb.schedules.weekdays}\n${kb.schedules.saturday}\n${kb.schedules.sunday}`,
      actions: [
        { id: "biz-contact-hours", label: "Contacto", type: "link", value: kb.key_pages.contact },
        { id: "biz-whatsapp-hours", label: "Hablar por WhatsApp", type: "whatsapp", value: "advisor_general", icon: "📞" },
      ],
      suggestions: ["¿Abren hoy?", "¿Dónde están ubicados?", "¿Tienen tienda física?"],
    };
  }

  if (intent === "business_contact") {
    return {
      handled: true,
      intent,
      answer: `Puedes escribirnos por WhatsApp al +${kb.whatsapp} o al correo ${kb.email}.`,
      actions: [
        { id: "biz-contact-whatsapp", label: "Hablar por WhatsApp", type: "whatsapp", value: "advisor_general", icon: "📞" },
        { id: "biz-contact-page", label: "Ver contacto", type: "link", value: kb.key_pages.contact },
      ],
      suggestions: ["¿Dónde están ubicados?", "¿Qué horario manejan?", "¿Hacen soporte técnico?"],
    };
  }

  if (intent === "business_support") {
    return {
      handled: true,
      intent,
      answer: `${kb.support.technical_support} ${kb.support.repair_services}`,
      actions: [
        { id: "biz-support-whatsapp", label: "Contactar soporte por WhatsApp", type: "whatsapp", value: "servicio_tecnico", icon: "📞" },
        { id: "biz-support-warranty", label: "Política de garantía", type: "link", value: kb.policies.warranty },
      ],
      suggestions: ["¿Cómo funciona la garantía?", "¿Cómo reclamo?", "¿Dónde los contacto?"],
    };
  }

  if (intent === "returns_policy") {
    return {
      handled: true,
      intent,
      answer: "La política de devoluciones y cambios está disponible en nuestro sitio. Si quieres, te guiamos según tu caso y producto.",
      actions: [
        { id: "biz-returns-policy", label: "Ver política de cambios/devoluciones", type: "link", value: kb.policies.returns },
        { id: "biz-returns-whatsapp", label: "Hablar con asesor", type: "whatsapp", value: "advisor_general", icon: "📞" },
      ],
      suggestions: ["¿Cómo funciona la garantía?", "¿Hacen soporte técnico?", "¿Dónde están ubicados?"],
    };
  }

  if (intent === "shipping_policy") {
    return {
      handled: true,
      intent,
      answer: "La política de envíos depende de ciudad, disponibilidad y tipo de producto. Te guiamos con el caso exacto por contacto o WhatsApp.",
      actions: [
        { id: "biz-shipping-policy", label: "Ver contacto", type: "link", value: kb.policies.shipping },
        { id: "biz-shipping-whatsapp", label: "Hablar por WhatsApp", type: "whatsapp", value: "envio", icon: "📞" },
      ],
      suggestions: ["¿Envían a mi ciudad?", "¿Cuánto tarda?", "¿Tiene costo?"],
    };
  }

  if (intent === "warranty_policy") {
    return {
      handled: true,
      intent,
      answer: "La política de garantía está publicada en nuestro sitio. Si me compartes el producto o SKU, te orientamos paso a paso.",
      actions: [
        { id: "biz-warranty-policy", label: "Ver política de garantía", type: "link", value: kb.policies.warranty },
        { id: "biz-warranty-whatsapp", label: "Soporte por WhatsApp", type: "whatsapp", value: "garantia", icon: "📞" },
      ],
      suggestions: ["¿Qué cubre la garantía?", "¿Cómo reclamo?", "¿Hacen soporte técnico?"],
    };
  }

  return {
    handled: true,
    intent: "business_info",
    answer: `${kb.business_name} está en ${kb.city}. Te ayudamos con productos, pagos, envíos, garantías y soporte por WhatsApp.`,
    actions: [
      { id: "biz-info-catalog", label: "Ver catálogo", type: "link", value: kb.key_pages.catalog },
      { id: "biz-info-contact", label: "Ver contacto", type: "link", value: kb.key_pages.contact },
      { id: "biz-info-whatsapp", label: "Hablar por WhatsApp", type: "whatsapp", value: "advisor_general", icon: "📞" },
    ],
    suggestions: ["¿Dónde están ubicados?", "¿Qué horario manejan?", "¿Hacen soporte técnico?"],
  };
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

function hasStrongExplanatoryIntent(text: string) {
  return /\b(que es|qué es|que son|qué son|que significa|qué significa|para que sirve|para qué sirve|como funciona|cómo funciona|diferencia entre|diferencia hay entre|cual es la diferencia|cuál es la diferencia|explicame|explícame)\b/.test(
    text
  );
}

function hasAmbiguousGuidanceIntent(text: string) {
  return /\b(no se cual comprar|no sé cuál comprar|cual me recomiendas|cuál me recomiendas|ayudame a escoger|ayúdame a escoger|quiero algo para|necesito sonido para|buen bajo|bajo potente|que suene duro)\b/.test(
    text
  );
}

function hasLearningGuidanceIntent(text: string) {
  return /\b(guitarra|teclado|piano|microfono|micrófono)\b/.test(text) && /\b(principiante|aprender|me sirve para cantar|me sirve)\b/.test(text);
}

function hasChurchAudioGuidanceIntent(text: string) {
  return /\b(iglesia|templo|culto)\b/.test(text) && /\b(sonido|cabina|cabinas|microfono|micrófono|parlante|equipo)\b/.test(text);
}

function isShortAttributeRefinement(text: string, nlu: KoraNluResult | null, memory?: AskRequest["memory"]) {
  if (!nlu || !memory) return false;
  if (!memory.last_recommendation_category && memory.last_conversation_topic !== "products") return false;
  const hasAttr = Array.isArray(nlu.attributes) && nlu.attributes.length > 0;
  if (!hasAttr) return false;
  const looksShort = text.length <= 60 || text.split(/\s+/).length <= 6;
  const hasRefineToken =
    /\b(bluetooth|inalambrico|inalámbrico|recargable|bateria|batería|bajo|potente|mas potente|más potente|con buen bajo)\b/.test(text);
  return looksShort && hasRefineToken;
}

function mergeRecommendationAttributes(
  prev: string[] | undefined,
  current: string[] | undefined
): Array<"cheap" | "premium" | "high_output_bass" | "bluetooth" | "rechargeable"> {
  const allowed = new Set(["cheap", "premium", "high_output_bass", "bluetooth", "rechargeable"]);
  const merged = new Set<string>([...(prev || []), ...(current || [])].filter((value) => allowed.has(value)));
  return Array.from(merged) as Array<"cheap" | "premium" | "high_output_bass" | "bluetooth" | "rechargeable">;
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
        { id: "kora-advisor-fallback", label: "Hablar por WhatsApp", icon: "📞", type: "whatsapp", value: "advisor_general" },
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
        { id: "kora-advisor-empty", label: "Hablar por WhatsApp", icon: "📞", type: "whatsapp", value: "advisor_general" },
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
    value: "asesoria_eleccion",
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
    { id: "product-welcome-whatsapp", label: "Conectar asesor por WhatsApp", icon: "📞", type: "whatsapp", value: "asesoria_eleccion" }
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
  const pageContext = sanitizePageContext(body?.pageContext);
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
  const explanatoryFirst = hasStrongExplanatoryIntent(normalized);
  const ambiguousGuidanceFirst = hasAmbiguousGuidanceIntent(normalized);
  const learningGuidanceFirst = hasLearningGuidanceIntent(normalized);
  const churchAudioGuidanceFirst = hasChurchAudioGuidanceIntent(normalized);

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
        { emotion, tone, goal, companionMode, nluDebug, contextualSellingDebug: null }
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

    const openingByPageContext = resolveContextualSellingResponse({
      message: query,
      nlu: nluDebug,
      memory: {
        preferred_category: body?.memory?.preferred_category,
        last_recommendation_category: body?.memory?.last_recommendation_category,
        last_usage_context: body?.memory?.last_usage_context,
        last_answer_domain: body?.memory?.last_answer_domain,
        last_category_opening_context: body?.memory?.last_category_opening_context,
      },
      pageContext,
    });
    if (openingByPageContext && openingByPageContext.debug?.contextualSellingReason === "category_page_opening") {
      return NextResponse.json<AskResponse>(
        finalizeResponse(
          {
            handled: true,
            intent: "products",
            answer: openingByPageContext.answer,
            actions: openingByPageContext.actions,
            suggestions: openingByPageContext.suggestions,
            memory_updates: openingByPageContext.memory_updates,
          },
          { emotion, tone, goal, companionMode, nluDebug, contextualSellingDebug: openingByPageContext.debug || null }
        ),
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

  const businessReply = resolveBusinessKnowledgeResponse(nluDebug, query);
  if (businessReply) {
    return NextResponse.json<AskResponse>(
      finalizeResponse(businessReply, { emotion, tone, goal, companionMode, nluDebug, contextualSellingDebug: null }),
      { status: 200 }
    );
  }

  const supportFollowup = resolveUnifiedContextFollowup(query, intent, nluDebug, body?.memory);
  if (supportFollowup) {
    return NextResponse.json<AskResponse>(
      finalizeResponse(supportFollowup, { emotion, tone, goal, companionMode, nluDebug, contextualSellingDebug: null }),
      { status: 200 }
    );
  }

  const contextualSelling = resolveContextualSellingResponse({
    message: query,
    nlu: nluDebug,
    memory: {
      preferred_category: body?.memory?.preferred_category,
      last_recommendation_category: body?.memory?.last_recommendation_category,
      last_usage_context: body?.memory?.last_usage_context,
      last_answer_domain: body?.memory?.last_answer_domain,
      last_category_opening_context: body?.memory?.last_category_opening_context,
    },
    pageContext,
  });
  if (contextualSelling && (explanatoryFirst || ambiguousGuidanceFirst || learningGuidanceFirst || churchAudioGuidanceFirst)) {
    return NextResponse.json<AskResponse>(
      finalizeResponse(
        {
          handled: true,
          intent: "products",
          answer: contextualSelling.answer,
          actions: contextualSelling.actions,
          suggestions: contextualSelling.suggestions,
          memory_updates: contextualSelling.memory_updates,
        },
        { emotion, tone, goal, companionMode, nluDebug, contextualSellingDebug: contextualSelling.debug || null }
      ),
      { status: 200 }
    );
  }

  let nluForRecommendation = nluDebug;
  let queryForRecommendation = query;
  if (isShortAttributeRefinement(normalized, nluDebug, body?.memory)) {
    nluForRecommendation = {
      ...(nluDebug as KoraNluResult),
      intent: "product_recommendation",
      attributes: mergeRecommendationAttributes(
        body?.memory?.last_recommendation_attributes || [],
        nluDebug?.attributes || []
      ),
      category: nluDebug?.category || body?.memory?.last_recommendation_category || body?.memory?.preferred_category || null,
      confidence: Math.max(nluDebug?.confidence || 0.6, 0.72),
    };
    queryForRecommendation = `${body?.memory?.last_recommendation_query || body?.memory?.last_query || body?.memory?.last_recommendation_category || ""} ${query}`.trim();
  }

  if (nluForRecommendation) {
    const recommendation = await resolveKoraCatalogRecommendation({
      query: queryForRecommendation,
      nlu: nluForRecommendation,
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
      if (nluForRecommendation.attributes?.length) {
        const mergedAttrs = mergeRecommendationAttributes(
          body?.memory?.last_recommendation_attributes || [],
          nluForRecommendation.attributes
        );
        recommendation.memory_patch = {
          ...(recommendation.memory_patch || {}),
          last_recommendation_attributes: mergedAttrs,
        };
      }
      return NextResponse.json<AskResponse>(
        finalizeResponse(recommendation, { emotion, tone, goal, companionMode, nluDebug, contextualSellingDebug: null }),
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
        finalizeResponse(routed, { emotion, tone, goal, companionMode, nluDebug, contextualSellingDebug: null }),
        { status: 200 }
      );
    }
  }

  if (contextualSelling) {
    return NextResponse.json<AskResponse>(
      finalizeResponse(
        {
          handled: true,
          intent: "products",
          answer: contextualSelling.answer,
          actions: contextualSelling.actions,
          suggestions: contextualSelling.suggestions,
          memory_updates: contextualSelling.memory_updates,
        },
        { emotion, tone, goal, companionMode, nluDebug, contextualSellingDebug: contextualSelling.debug || null }
      ),
      { status: 200 }
    );
  }

  const contextualProductReply = await resolveProductPageAssistantResponse(query, body?.path, body?.context);
  if (contextualProductReply) {
    return NextResponse.json<AskResponse>(
      finalizeResponse(contextualProductReply, { emotion, tone, goal, companionMode, nluDebug, contextualSellingDebug: null }),
      { status: 200 }
    );
  }

  const memoryFollowupReply = await resolveMemoryProductFollowup(query, body?.memory);
  if (memoryFollowupReply) {
    return NextResponse.json<AskResponse>(
      finalizeResponse(memoryFollowupReply, { emotion, tone, goal, companionMode, nluDebug, contextualSellingDebug: null }),
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
          { id: "payments-advisor", label: "Hablar por WhatsApp", icon: "📞", type: "whatsapp", value: "cotizacion" },
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
          { id: "shipping-advisor", label: "Confirmar envío por WhatsApp", icon: "📞", type: "whatsapp", value: "envio" },
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
          { id: "warranty-advisor", label: "Soporte por WhatsApp", icon: "📞", type: "whatsapp", value: "garantia" },
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
          { id: "orders-advisor", label: "Ayuda por WhatsApp", icon: "📞", type: "whatsapp", value: "advisor_general" },
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
          { id: "advisor-open", label: "Abrir WhatsApp", icon: "📞", type: "whatsapp", value: "advisor_general" },
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
