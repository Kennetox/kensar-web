"use client";

import { FormEvent, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { useWebCart } from "@/app/components/WebCartProvider";
import { buildKoraContextualGreeting } from "@/app/lib/kora/contextual-greetings";
import type { KoraPageContext } from "@/app/lib/kora/knowledge-types";
import { buildWhatsAppPrefill } from "@/app/lib/kora/whatsapp-handoff";
import { getOrCreateHandoffSessionId, readStoredPageContext, resolveCurrentUrlFromWindow } from "@/app/lib/kora/handoff-client";

type ActionType = "command" | "link" | "whatsapp" | "prompt" | "add_to_cart";
type CommandValue = "menu" | "products" | "payments" | "shipping" | "warranty" | "advisor";
type KoraEventName =
  | "chat_opened"
  | "chat_closed"
  | "action_clicked"
  | "message_submitted"
  | "intent_detected"
  | "whatsapp_opened"
  | "handoff_initiated"
  | "conversation_reset";

type ChatAction = {
  id: string;
  label: string;
  icon?: string;
  type: ActionType;
  value: string;
  payload?: {
    product_id?: number;
    product_name?: string;
    product_slug?: string;
    product_sku?: string | null;
    image_url?: string | null;
    brand?: string | null;
    stock_status?: "in_stock" | "low_stock" | "out_of_stock" | "service" | "consultar";
    unit_price?: number;
    compare_price?: number | null;
  };
};

type ChatMessage = {
  id: string;
  role: "bot" | "user";
  text: string;
  actions?: ChatAction[];
  productCards?: Array<{
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

type KoraCategoryItem = {
  path: string;
  name: string;
  product_count: number;
};

type KoraEvent = {
  event: KoraEventName;
  path: string;
  timestamp: string;
  payload?: Record<string, string | number | boolean | null>;
};

type KoraAskResponse = {
  handled: boolean;
  intent: CommandValue | "orders" | "unknown";
  answer: string;
  actions?: ChatAction[];
  suggestions?: string[];
  confidence_score?: number;
  resolution_kind?: "direct" | "disambiguation" | "fallback";
  emotion?: "neutral" | "frustrated" | "urgent" | "happy" | "doubtful";
  companion_mode?: boolean;
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
  telemetry_meta?: {
    resolver_used?:
      | "business_support"
      | "contextual_selling"
      | "recommender"
      | "product_page_assistant"
      | "memory_followup"
      | "nlu_router"
      | "fallback";
    response_type?: "explanation" | "recommendation" | "support" | "fallback" | "menu";
    detected_intent?: string;
    detected_category?: string | null;
    detected_attributes?: string[];
    fallback_used?: boolean;
  };
};

const SESSION_KEY = "kensar_kora_session_v1";
const SESSION_OPEN_KEY = "kensar_kora_open_v1";
const EVENTS_SESSION_KEY = "kensar_kora_events_v1";
const MEMORY_SESSION_KEY = "kensar_kora_memory_v1";
const GREETING_CONTEXTS_SESSION_KEY = "kensar_kora_greeting_contexts_v1";
const RESPONSE_DELAYS = [520, 640, 760] as const;
const KORA_NUDGE_TEXT = "Asistente 24/7";
const KORA_AVATAR_SRC = "/branding/kora-avatar.png";
const KORA_NUDGE_INITIAL_DELAY_MS = 9000;
const KORA_NUDGE_VISIBLE_MS = 3200;
const KORA_NUDGE_PULSE_MS = 920;
const KORA_WHATSAPP_MIN_GAP_MS = 4500;

const MAIN_ACTIONS: ChatAction[] = [
  { id: "products", label: "Ver catálogo", icon: "🛍️", type: "command", value: "products" },
  { id: "payments", label: "Métodos de pago", icon: "💳", type: "command", value: "payments" },
  { id: "shipping", label: "Envíos", icon: "🚚", type: "command", value: "shipping" },
  { id: "warranty", label: "Garantías", icon: "🛡️", type: "command", value: "warranty" },
  { id: "advisor", label: "Hablar por WhatsApp", icon: "📞", type: "command", value: "advisor" },
];

const FALLBACK_PRODUCT_ACTIONS: ChatAction[] = [
  { id: "cat-audio", label: "Audio / Sonido", type: "link", value: "/catalogo/categoria/audio-profesional" },
  { id: "cat-security", label: "Seguridad", type: "link", value: "/catalogo/categoria/camaras" },
  { id: "cat-instruments", label: "Instrumentos", type: "link", value: "/catalogo/categoria/instrumentos" },
  { id: "cat-accessories", label: "Accesorios", type: "link", value: "/catalogo/categoria/accesorios" },
  { id: "cat-home", label: "Hogar y entretenimiento", type: "link", value: "/catalogo/categoria/tecnologia" },
  { id: "menu-from-products", label: "Volver al menú", type: "command", value: "menu" },
];

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeMessage(value: string) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿?¡!.,;:()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function loadTelemetrySessionId() {
  return getOrCreateHandoffSessionId();
}

function createWelcomeMessage(pageContext?: KoraPageContext | null): ChatMessage {
  const greeting = buildKoraContextualGreeting({ pageContext: pageContext || null });
  return {
    id: createId(),
    role: "bot",
    text: greeting.message,
  };
}

function createAdvisorMessage(): ChatMessage {
  return {
    id: createId(),
    role: "bot",
    text: "Te conecto con un asesor por WhatsApp para ayudarte de inmediato.",
    actions: [
      { id: "open-advisor-whatsapp", label: "Abrir WhatsApp", icon: "📞", type: "whatsapp", value: "advisor_general" },
      { id: "menu-from-advisor", label: "Volver al menú", type: "command", value: "menu" },
    ],
  };
}

function createUnknownMessage(): ChatMessage {
  return {
    id: createId(),
    role: "bot",
    text: "No estoy segura de qué producto buscas. ¿Quieres que te ayude con sonido, instrumentos, cámaras, cables o formas de pago?",
    actions: [
      { id: "unknown-sound", label: "Cabinas y sonido", type: "prompt", value: "Quiero ver cabinas y sonido" },
      { id: "unknown-instruments", label: "Instrumentos musicales", type: "prompt", value: "Quiero ver instrumentos musicales" },
      { id: "unknown-security", label: "Cámaras de seguridad", type: "prompt", value: "Quiero ver cámaras de seguridad" },
      { id: "unknown-payments", label: "Formas de pago", type: "command", value: "payments" },
      { id: "unknown-advisor", label: "Hablar con asesor", icon: "📞", type: "command", value: "advisor" },
    ],
  };
}

function buildBotReply(command: CommandValue, productActions: ChatAction[]): ChatMessage {
  if (command === "products") {
    return {
      id: createId(),
      role: "bot",
      text: "Perfecto. Elige la categoría que quieres explorar:",
      actions: productActions,
    };
  }

  if (command === "payments") {
    return {
      id: createId(),
      role: "bot",
      text: "Aceptamos múltiples métodos de pago como tarjetas, financiación y pagos en línea.\nSi tienes dudas sobre alguno, podemos ayudarte.",
      actions: [
        { id: "go-payments", label: "Ver opciones de pago", type: "link", value: "/pago" },
        { id: "menu-from-payments", label: "Volver al menú", type: "command", value: "menu" },
      ],
    };
  }

  if (command === "shipping") {
    return {
      id: createId(),
      role: "bot",
      text: "Realizamos envíos a diferentes ciudades y también puedes recoger en tienda.\nLos tiempos y costos dependen de tu ubicación.",
      actions: [{ id: "menu-from-shipping", label: "Volver al menú", type: "command", value: "menu" }],
    };
  }

  if (command === "warranty") {
    return {
      id: createId(),
      role: "bot",
      text: "Todos nuestros productos cuentan con garantía.\nSi necesitas soporte, puedes escribirnos directamente.",
      actions: [
        { id: "go-contact", label: "Ir a contacto", type: "link", value: "/contacto" },
        { id: "menu-from-warranty", label: "Volver al menú", type: "command", value: "menu" },
      ],
    };
  }

  if (command === "advisor") {
    return createAdvisorMessage();
  }

  return {
    id: createId(),
    role: "bot",
    text: "Listo. Estoy aquí para ayudarte. ¿Qué deseas revisar?",
    actions: MAIN_ACTIONS,
  };
}

function resolveCommandFromText(input: string): CommandValue | "unknown" {
  const value = input.toLowerCase();

  if (value.includes("hola") || value.includes("inicio") || value.includes("menu")) return "menu";
  if (value.includes("pago") || value.includes("tarjeta") || value.includes("addi") || value.includes("sistecredito")) return "payments";
  if (value.includes("envio") || value.includes("despacho") || value.includes("ciudad") || value.includes("entrega")) return "shipping";
  if (value.includes("garantia") || value.includes("devol") || value.includes("cambio") || value.includes("soporte")) return "warranty";
  if (value.includes("asesor") || value.includes("whatsapp") || value.includes("humano") || value.includes("agente")) return "advisor";
  if (
    value.includes("producto") ||
    value.includes("catalogo") ||
    value.includes("audio") ||
    value.includes("seguridad") ||
    value.includes("instrumento") ||
    value.includes("accesorio") ||
    value.includes("hogar")
  ) return "products";

  return "unknown";
}

function loadShownGreetingContexts(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(GREETING_CONTEXTS_SESSION_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value) => typeof value === "string").slice(-30);
  } catch {
    return [];
  }
}

function persistShownGreetingContexts(items: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(GREETING_CONTEXTS_SESSION_KEY, JSON.stringify(items.slice(-30)));
  } catch {
    return;
  }
}

function loadInitialMessages(pageContext?: KoraPageContext | null): ChatMessage[] {
  const greeting = buildKoraContextualGreeting({ pageContext: pageContext || null });

  const initialMessage = {
    id: createId(),
    role: "bot" as const,
    text: greeting.message,
  };

  if (typeof window === "undefined") {
    return [initialMessage];
  }

  const rawMessages = window.sessionStorage.getItem(SESSION_KEY);
  if (!rawMessages) {
    return [initialMessage];
  }

  try {
    const parsed = JSON.parse(rawMessages) as ChatMessage[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    return [initialMessage];
  }

  return [initialMessage];
}

function loadInitialOpen(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.sessionStorage.getItem(SESSION_OPEN_KEY) === "1";
}

function normalizeCategoryLabel(name: string) {
  return name.replace(/\s+/g, " ").trim();
}

function getCurrentProductSlugFromPath(pathname: string): string | null {
  if (!pathname.startsWith("/catalogo/")) return null;
  const slug = pathname.replace(/^\/catalogo\//, "").split("/")[0]?.trim();
  return slug ? decodeURIComponent(slug) : null;
}

function buildProductActionsFromCategories(items: KoraCategoryItem[]) {
  const mapped = items
    .filter((item) => item.path)
    .slice(0, 5)
    .map((item) => ({
      id: `cat-${item.path}`,
      label: normalizeCategoryLabel(item.name),
      type: "link" as const,
      value: `/catalogo/categoria/${encodeURIComponent(item.path)}`,
    }));

  if (!mapped.length) {
    return FALLBACK_PRODUCT_ACTIONS;
  }

  return [...mapped, { id: "menu-from-products", label: "Volver al menú", type: "command" as const, value: "menu" }];
}

function persistKoraEventInSession(event: KoraEvent) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.sessionStorage.getItem(EVENTS_SESSION_KEY);
    const parsed = raw ? (JSON.parse(raw) as KoraEvent[]) : [];
    const next = [...parsed.slice(-79), event];
    window.sessionStorage.setItem(EVENTS_SESSION_KEY, JSON.stringify(next));
  } catch {
    window.sessionStorage.removeItem(EVENTS_SESSION_KEY);
  }
}

function trackKoraEvent(event: KoraEvent) {
  if (typeof window === "undefined") return;

  persistKoraEventInSession(event);
  const body = JSON.stringify(event);

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon("/api/kora/events", blob);
    return;
  }

  void fetch("/api/kora/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  });
}

type KoraSessionMemory = {
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

function loadKoraMemory(): KoraSessionMemory {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(MEMORY_SESSION_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as KoraSessionMemory;
    return {
      preferred_category: typeof parsed?.preferred_category === "string" ? parsed.preferred_category : undefined,
      budget_cop: Number.isFinite(Number(parsed?.budget_cop)) ? Number(parsed?.budget_cop) : undefined,
      tone_mode: parsed?.tone_mode === "professional" ? "professional" : parsed?.tone_mode === "friendly" ? "friendly" : undefined,
      customer_goal:
        parsed?.customer_goal === "gift" ||
        parsed?.customer_goal === "home" ||
        parsed?.customer_goal === "business" ||
        parsed?.customer_goal === "studio"
          ? parsed.customer_goal
          : undefined,
      last_emotion:
        parsed?.last_emotion === "frustrated" ||
        parsed?.last_emotion === "urgent" ||
        parsed?.last_emotion === "happy" ||
        parsed?.last_emotion === "doubtful" ||
        parsed?.last_emotion === "neutral"
          ? parsed.last_emotion
          : undefined,
      last_product_slug: typeof parsed?.last_product_slug === "string" ? parsed.last_product_slug : undefined,
      last_product_name: typeof parsed?.last_product_name === "string" ? parsed.last_product_name : undefined,
      last_product_sku: typeof parsed?.last_product_sku === "string" ? parsed.last_product_sku : undefined,
      last_query: typeof parsed?.last_query === "string" ? parsed.last_query : undefined,
      last_recommended_products: Array.isArray(parsed?.last_recommended_products)
        ? parsed.last_recommended_products
            .slice(0, 5)
            .map((row) => ({
              id: Number(row?.id) || 0,
              slug: typeof row?.slug === "string" ? row.slug : "",
              name: typeof row?.name === "string" ? row.name : "",
              price: Number.isFinite(Number(row?.price)) ? Number(row.price) : null,
              category_path: typeof row?.category_path === "string" ? row.category_path : null,
              category_name: typeof row?.category_name === "string" ? row.category_name : null,
              brand: typeof row?.brand === "string" ? row.brand : null,
              score: Number.isFinite(Number(row?.score)) ? Number(row.score) : undefined,
            }))
            .filter((row) => row.id > 0 && row.slug && row.name)
        : undefined,
      last_recommendation_query: typeof parsed?.last_recommendation_query === "string" ? parsed.last_recommendation_query : undefined,
      last_recommendation_category: typeof parsed?.last_recommendation_category === "string" ? parsed.last_recommendation_category : undefined,
      last_recommendation_attributes: Array.isArray(parsed?.last_recommendation_attributes)
        ? parsed.last_recommendation_attributes.filter((value) => typeof value === "string").slice(0, 8)
        : undefined,
      last_usage_context: typeof parsed?.last_usage_context === "string" ? parsed.last_usage_context : undefined,
      last_recommendation_type: typeof parsed?.last_recommendation_type === "string" ? parsed.last_recommendation_type : undefined,
      last_intent: typeof parsed?.last_intent === "string" ? parsed.last_intent : undefined,
      last_non_product_intent: typeof parsed?.last_non_product_intent === "string" ? parsed.last_non_product_intent : undefined,
      last_support_topic: typeof parsed?.last_support_topic === "string" ? parsed.last_support_topic : undefined,
      last_business_topic: typeof parsed?.last_business_topic === "string" ? parsed.last_business_topic : undefined,
      last_conversation_topic: typeof parsed?.last_conversation_topic === "string" ? parsed.last_conversation_topic : undefined,
      last_answer_domain: typeof parsed?.last_answer_domain === "string" ? parsed.last_answer_domain : undefined,
      last_category_opening_context:
        typeof parsed?.last_category_opening_context === "string" ? parsed.last_category_opening_context : undefined,
    };
  } catch {
    return {};
  }
}

function persistKoraMemory(memory: KoraSessionMemory) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(MEMORY_SESSION_KEY, JSON.stringify(memory));
  } catch {
    return;
  }
}

function readPageContextFromSession(pathname: string): KoraPageContext | null {
  return readStoredPageContext(pathname);
}

export default function KoraChat({ pageContext }: { pageContext?: KoraPageContext }) {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );
  const [isOpen, setIsOpen] = useState(loadInitialOpen);
  const [effectivePageContext, setEffectivePageContext] = useState<KoraPageContext | null>(
    () => pageContext || readPageContextFromSession(pathname)
  );
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    loadInitialMessages(pageContext || readPageContextFromSession(pathname))
  );
  const [isTyping, setIsTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const [productActions, setProductActions] = useState<ChatAction[]>(FALLBACK_PRODUCT_ACTIONS);
  const [nudgeVisible, setNudgeVisible] = useState(false);
  const [nudgePulse, setNudgePulse] = useState(false);
  const [memory, setMemory] = useState<KoraSessionMemory>(loadKoraMemory);
  const telemetrySessionIdRef = useRef<string>(loadTelemetrySessionId());
  const endRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const delayIndexRef = useRef(0);
  const lastWhatsappNudgeRef = useRef(0);
  const openChatRef = useRef<(source: string) => void>(() => undefined);
  const processUserInputRef = useRef<(input: string, source?: "message" | "prompt") => void>(() => undefined);
  const isDisabledRoute = pathname === "/pago" || pathname.startsWith("/pago/") || pathname === "/legal" || pathname.startsWith("/legal/");
  const isCatalogRoute = pathname === "/catalogo" || pathname.startsWith("/catalogo/");
  const koraNudgeLoopMs = isCatalogRoute ? 45000 : 27000;
  const { addItem } = useWebCart();

  useEffect(() => {
    if (typeof window === "undefined") return;
    function onPageContextUpdate(event: Event) {
      const detail = (event as CustomEvent<{ pathname?: string; pageContext?: KoraPageContext }>).detail;
      if (!detail || detail.pathname !== pathname) return;
      if (detail.pageContext) {
        setEffectivePageContext(detail.pageContext);
      }
    }
    window.addEventListener("kensar:kora-page-context", onPageContextUpdate as EventListener);
    return () => {
      window.removeEventListener("kensar:kora-page-context", onPageContextUpdate as EventListener);
    };
  }, [pathname]);

  function sendTelemetryEvent(payload: Record<string, unknown>) {
    const body = JSON.stringify(payload);
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/kora/telemetry", blob);
      return;
    }
    void fetch("/api/kora/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => undefined);
  }

  useEffect(() => {
    if (!hydrated || isDisabledRoute) return;
    persistKoraMemory(memory);
  }, [hydrated, isDisabledRoute, memory]);

  useEffect(() => {
    if (!hydrated || !messages.length || isDisabledRoute) return;
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(messages));
  }, [hydrated, messages, isDisabledRoute]);

  useEffect(() => {
    if (!hydrated || isDisabledRoute) return;
    window.sessionStorage.setItem(SESSION_OPEN_KEY, isOpen ? "1" : "0");
  }, [hydrated, isOpen, isDisabledRoute]);

  useEffect(() => {
    if (!hydrated || !isOpen) return;
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [hydrated, messages, isTyping, isOpen]);

  useEffect(() => {
    if (isDisabledRoute) return;

    const controller = new AbortController();
    void fetch("/api/kora/categories", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json() as Promise<{ items?: KoraCategoryItem[] }>;
      })
      .then((data) => {
        if (!data?.items || !Array.isArray(data.items)) return;
        setProductActions(buildProductActionsFromCategories(data.items));
      })
      .catch(() => {
        return;
      });

    return () => controller.abort();
  }, [isDisabledRoute]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!hydrated || isDisabledRoute || isOpen) return;

    let active = true;
    const timeouts: number[] = [];

    function schedule(callback: () => void, delay: number) {
      const timeoutId = window.setTimeout(() => {
        if (!active) return;
        callback();
      }, delay);
      timeouts.push(timeoutId);
    }

    function onWhatsAppNudge(event: Event) {
      const detail = (event as CustomEvent<{ timestamp?: number }>).detail;
      const timestamp = Number(detail?.timestamp);
      lastWhatsappNudgeRef.current = Number.isFinite(timestamp) ? timestamp : Date.now();
    }

    function triggerKoraPulse() {
      setNudgePulse(false);
      schedule(() => setNudgePulse(true), 20);
      schedule(() => setNudgePulse(false), KORA_NUDGE_PULSE_MS);
    }

    function runCycle() {
      const deltaWithWhatsApp = Date.now() - lastWhatsappNudgeRef.current;
      if (deltaWithWhatsApp < KORA_WHATSAPP_MIN_GAP_MS) {
        schedule(runCycle, KORA_WHATSAPP_MIN_GAP_MS - deltaWithWhatsApp + 700);
        return;
      }

      triggerKoraPulse();
      setNudgeVisible(true);
      schedule(() => {
        setNudgeVisible(false);
        schedule(runCycle, koraNudgeLoopMs);
      }, KORA_NUDGE_VISIBLE_MS);
    }

    window.addEventListener("kensar:whatsapp-nudge", onWhatsAppNudge as EventListener);
    schedule(runCycle, KORA_NUDGE_INITIAL_DELAY_MS);

    return () => {
      active = false;
      timeouts.forEach((id) => window.clearTimeout(id));
      window.removeEventListener("kensar:whatsapp-nudge", onWhatsAppNudge as EventListener);
    };
  }, [hydrated, isDisabledRoute, isOpen, koraNudgeLoopMs]);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const rootElement = rootRef.current;
      if (!rootElement) return;

      const path = typeof event.composedPath === "function" ? event.composedPath() : [];
      if (path.includes(rootElement)) return;
      setIsOpen(false);
      trackKoraEvent({
        event: "chat_closed",
        path: pathname,
        timestamp: new Date().toISOString(),
        payload: { source: "outside_click" },
      });
    }

    window.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [isOpen, pathname]);

  function pushUserMessage(text: string) {
    setMessages((current) => [...current, { id: createId(), role: "user", text }]);
  }

  function emitEvent(event: KoraEventName, payload?: Record<string, string | number | boolean | null>) {
    trackKoraEvent({
      event,
      path: pathname,
      timestamp: new Date().toISOString(),
      payload,
    });
  }

  function openChat(source: string) {
    setIsOpen(true);
    emitEvent("chat_opened", { source });
    const greeting = buildKoraContextualGreeting({ pageContext: effectivePageContext || null });
    const shown = loadShownGreetingContexts();
    if (!shown.includes(greeting.contextKey)) {
      setMessages((current) => {
        if (!current.length) return [{ id: createId(), role: "bot", text: greeting.message }];
        const next = [...current];
        if (next[0]?.role === "bot") {
          next[0] = { ...next[0], text: greeting.message };
          return next;
        }
        return [{ id: createId(), role: "bot", text: greeting.message }, ...next];
      });
      persistShownGreetingContexts([...shown, greeting.contextKey]);
      sendTelemetryEvent({
        event_type: "contextual_greeting_shown",
        sessionId: telemetrySessionIdRef.current,
        timestamp: new Date().toISOString(),
        greetingType: greeting.greetingType,
        contextKey: greeting.contextKey,
        pageContext: effectivePageContext || null,
        routePath: pathname,
      });
    }
  }

  function closeChat(source: string) {
    setIsOpen(false);
    emitEvent("chat_closed", { source });
  }

  function runCommand(command: CommandValue) {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setIsTyping(true);
    const delay = RESPONSE_DELAYS[delayIndexRef.current % RESPONSE_DELAYS.length];
    delayIndexRef.current += 1;
    timeoutRef.current = window.setTimeout(() => {
      const nextMessage = buildBotReply(command, productActions);
      setMessages((current) => [...current, nextMessage]);
      setIsTyping(false);
      timeoutRef.current = null;
    }, delay);
  }

  async function askKora(query: string): Promise<KoraAskResponse | null> {
    try {
      const currentProductSlug = getCurrentProductSlugFromPath(pathname);
      const response = await fetch("/api/kora/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          path: pathname,
          context: currentProductSlug ? { currentProductSlug } : undefined,
          pageContext: effectivePageContext || undefined,
          memory,
        }),
      });
      if (!response.ok) return null;
      const data = (await response.json()) as KoraAskResponse;
      if (!data || typeof data.answer !== "string") return null;
      return data;
    } catch {
      return null;
    }
  }

  function buildSuggestionActions(suggestions: string[] | undefined): ChatAction[] {
    if (!Array.isArray(suggestions) || suggestions.length === 0) return [];
    return suggestions
      .slice(0, 3)
      .map((text) => String(text || "").trim())
      .filter(Boolean)
      .map((text, index) => ({
        id: `sug-${index}-${text.slice(0, 18).replace(/\s+/g, "-").toLowerCase()}`,
        label: text,
        type: "prompt" as const,
        value: text,
      }));
  }

function sanitizeApiActions(actions: ChatAction[] | undefined): ChatAction[] {
    if (!Array.isArray(actions)) return [];
    return actions
      .slice(0, 6)
      .filter((action) => {
        if (!action || typeof action !== "object") return false;
        if (!action.id || !action.label || !action.type || !action.value) return false;
        return true;
      });
  }

  function processUserInput(input: string, source: "message" | "prompt" = "message") {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    pushUserMessage(input);
    emitEvent("message_submitted", { length: input.length, source });
    setIsTyping(true);

    const delay = RESPONSE_DELAYS[delayIndexRef.current % RESPONSE_DELAYS.length];
    delayIndexRef.current += 1;
    timeoutRef.current = window.setTimeout(async () => {
      const aiReply = await askKora(input);
      if (aiReply) {
        const productIdsShown = Array.isArray(aiReply.product_cards)
          ? aiReply.product_cards.map((card) => Number(card.id)).filter((id) => Number.isFinite(id))
          : [];
        sendTelemetryEvent({
          event_type: "conversation_turn",
          sessionId: telemetrySessionIdRef.current,
          timestamp: new Date().toISOString(),
          userMessage: input,
          normalizedMessage: normalizeMessage(input),
          detectedIntent: aiReply.telemetry_meta?.detected_intent || aiReply.intent,
          detectedCategory:
            aiReply.telemetry_meta?.detected_category ||
            aiReply.memory_patch?.last_recommendation_category ||
            aiReply.memory_updates?.preferred_category ||
            null,
          detectedAttributes:
            aiReply.telemetry_meta?.detected_attributes ||
            aiReply.memory_patch?.last_recommendation_attributes ||
            [],
          resolverUsed: aiReply.telemetry_meta?.resolver_used || "fallback",
          responseType: aiReply.telemetry_meta?.response_type || (aiReply.handled ? "recommendation" : "fallback"),
          pageContext: effectivePageContext || null,
          productIdsShown,
          clickedProductId: null,
          clickedWhatsApp: null,
          fallbackUsed: Boolean(aiReply.telemetry_meta?.fallback_used ?? !aiReply.handled),
          conversationMessageCount: messages.length + 2,
          routePath: pathname,
        });
        emitEvent("intent_detected", {
          detected_intent: aiReply.intent,
          handled: aiReply.handled,
          confidence_score: typeof aiReply.confidence_score === "number" ? Number(aiReply.confidence_score.toFixed(3)) : null,
          resolution_kind: aiReply.resolution_kind || null,
          emotion: aiReply.emotion ?? null,
          companion_mode: Boolean(aiReply.companion_mode),
        });
        if (
          (aiReply.memory_updates && typeof aiReply.memory_updates === "object") ||
          (aiReply.memory_patch && typeof aiReply.memory_patch === "object")
        ) {
          const mergedPatch = {
            ...(aiReply.memory_updates || {}),
            ...(aiReply.memory_patch || {}),
          };
          setMemory((prev) => ({
            ...prev,
            preferred_category:
              typeof mergedPatch?.preferred_category === "string"
                ? mergedPatch.preferred_category
                : prev.preferred_category,
            budget_cop: Number.isFinite(Number(mergedPatch?.budget_cop))
              ? Number(mergedPatch?.budget_cop)
              : prev.budget_cop,
            tone_mode:
              mergedPatch?.tone_mode === "professional" || mergedPatch?.tone_mode === "friendly"
                ? mergedPatch.tone_mode
                : prev.tone_mode,
            customer_goal:
              mergedPatch?.customer_goal === "gift" ||
              mergedPatch?.customer_goal === "home" ||
              mergedPatch?.customer_goal === "business" ||
              mergedPatch?.customer_goal === "studio"
                ? mergedPatch.customer_goal
                : prev.customer_goal,
            last_emotion:
              mergedPatch?.last_emotion === "frustrated" ||
              mergedPatch?.last_emotion === "urgent" ||
              mergedPatch?.last_emotion === "happy" ||
              mergedPatch?.last_emotion === "doubtful" ||
              mergedPatch?.last_emotion === "neutral"
                ? mergedPatch.last_emotion
                : prev.last_emotion,
            last_product_slug:
              typeof mergedPatch?.last_product_slug === "string"
                ? mergedPatch.last_product_slug
                : prev.last_product_slug,
            last_product_name:
              typeof mergedPatch?.last_product_name === "string"
                ? mergedPatch.last_product_name
                : prev.last_product_name,
            last_product_sku:
              typeof mergedPatch?.last_product_sku === "string"
                ? mergedPatch.last_product_sku
                : prev.last_product_sku,
            last_query:
              typeof mergedPatch?.last_query === "string"
                ? mergedPatch.last_query
                : prev.last_query,
            last_recommended_products:
              Array.isArray(mergedPatch?.last_recommended_products)
                ? mergedPatch.last_recommended_products
                    .slice(0, 5)
                    .map((row) => ({
                      id: Number(row?.id) || 0,
                      slug: typeof row?.slug === "string" ? row.slug : "",
                      name: typeof row?.name === "string" ? row.name : "",
                      price: Number.isFinite(Number(row?.price)) ? Number(row.price) : null,
                      category_path: typeof row?.category_path === "string" ? row.category_path : null,
                      category_name: typeof row?.category_name === "string" ? row.category_name : null,
                      brand: typeof row?.brand === "string" ? row.brand : null,
                      score: Number.isFinite(Number(row?.score)) ? Number(row.score) : undefined,
                    }))
                    .filter((row) => row.id > 0 && row.slug && row.name)
                : prev.last_recommended_products,
            last_recommendation_query:
              typeof mergedPatch?.last_recommendation_query === "string"
                ? mergedPatch.last_recommendation_query
                : prev.last_recommendation_query,
            last_recommendation_category:
              typeof mergedPatch?.last_recommendation_category === "string"
                ? mergedPatch.last_recommendation_category
                : prev.last_recommendation_category,
            last_recommendation_attributes:
              Array.isArray(mergedPatch?.last_recommendation_attributes)
                ? mergedPatch.last_recommendation_attributes.filter((value) => typeof value === "string").slice(0, 8)
                : prev.last_recommendation_attributes,
            last_usage_context:
              typeof mergedPatch?.last_usage_context === "string"
                ? mergedPatch.last_usage_context
                : prev.last_usage_context,
            last_recommendation_type:
              typeof mergedPatch?.last_recommendation_type === "string"
                ? mergedPatch.last_recommendation_type
                : prev.last_recommendation_type,
            last_intent:
              typeof mergedPatch?.last_intent === "string"
                ? mergedPatch.last_intent
                : prev.last_intent,
            last_non_product_intent:
              mergedPatch?.last_non_product_intent === "payments" ||
              mergedPatch?.last_non_product_intent === "shipping" ||
              mergedPatch?.last_non_product_intent === "warranty" ||
              mergedPatch?.last_non_product_intent === "advisor" ||
              mergedPatch?.last_non_product_intent === "orders" ||
              mergedPatch?.last_non_product_intent === "menu"
                ? mergedPatch.last_non_product_intent
                : prev.last_non_product_intent,
            last_support_topic:
              mergedPatch?.last_support_topic === "payments" ||
              mergedPatch?.last_support_topic === "shipping" ||
              mergedPatch?.last_support_topic === "warranty" ||
              mergedPatch?.last_support_topic === "returns" ||
              mergedPatch?.last_support_topic === "advisor"
                ? mergedPatch.last_support_topic
                : prev.last_support_topic,
            last_business_topic:
              mergedPatch?.last_business_topic === "location" ||
              mergedPatch?.last_business_topic === "hours" ||
              mergedPatch?.last_business_topic === "contact" ||
              mergedPatch?.last_business_topic === "support" ||
              mergedPatch?.last_business_topic === "business_info"
                ? mergedPatch.last_business_topic
                : prev.last_business_topic,
            last_conversation_topic:
              mergedPatch?.last_conversation_topic === "products" ||
              mergedPatch?.last_conversation_topic === "shipping" ||
              mergedPatch?.last_conversation_topic === "payments" ||
              mergedPatch?.last_conversation_topic === "warranty" ||
              mergedPatch?.last_conversation_topic === "returns" ||
              mergedPatch?.last_conversation_topic === "location" ||
              mergedPatch?.last_conversation_topic === "hours" ||
              mergedPatch?.last_conversation_topic === "contact" ||
              mergedPatch?.last_conversation_topic === "support" ||
              mergedPatch?.last_conversation_topic === "business_info" ||
              mergedPatch?.last_conversation_topic === "unknown"
                ? mergedPatch.last_conversation_topic
                : prev.last_conversation_topic,
            last_answer_domain:
              mergedPatch?.last_answer_domain === "products" ||
              mergedPatch?.last_answer_domain === "business" ||
              mergedPatch?.last_answer_domain === "support" ||
              mergedPatch?.last_answer_domain === "unknown"
                ? mergedPatch.last_answer_domain
                : prev.last_answer_domain,
            last_category_opening_context:
              typeof mergedPatch?.last_category_opening_context === "string"
                ? mergedPatch.last_category_opening_context
                : prev.last_category_opening_context,
          }));
        }
        const apiActions = sanitizeApiActions(aiReply.actions);
        const productCards = sanitizeProductCards(aiReply.product_cards);
        const productCardLinks = new Set(productCards.map((card) => card.url));
        const suggestionActions = buildSuggestionActions(aiReply.suggestions);
        const filteredApiActions = apiActions.filter((action) => !(action.type === "link" && productCardLinks.has(action.value)));
        const mergedActions = [...filteredApiActions, ...suggestionActions].slice(0, 7);
        setMessages((current) => [
          ...current,
          {
            id: createId(),
            role: "bot",
            text: aiReply.answer.trim() || createUnknownMessage().text,
            productCards: productCards.length ? productCards : undefined,
            actions: mergedActions.length ? mergedActions : undefined,
          },
        ]);
        setIsTyping(false);
        timeoutRef.current = null;
        return;
      }

      const command = resolveCommandFromText(input);
      emitEvent("intent_detected", { detected_intent: command });

      if (command === "unknown") {
        setMessages((current) => [...current, createUnknownMessage()]);
        setIsTyping(false);
        timeoutRef.current = null;
        return;
      }

      setIsTyping(false);
      timeoutRef.current = null;
      if (command === "advisor") {
        openWhatsAppWithContext(input, {
          id: "fallback-advisor",
          label: "Abrir WhatsApp",
          type: "whatsapp",
          value: "advisor_general",
        });
      }
      runCommand(command);
    }, delay);
  }

  function openWhatsAppWithContext(latestInput: string, action?: ChatAction) {
    const recentUserLines = messages
      .filter((message) => message.role === "user")
      .slice(-2)
      .map((message) => message.text.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .join(" | ");
    const prefill = buildWhatsAppPrefill({
      origin: "kora_chat",
      actionValue: action?.value || "advisor_general",
      latestInput,
      userMessage: recentUserLines || undefined,
      currentPath: pathname,
      currentUrl: resolveCurrentUrlFromWindow(pathname),
      pageContext: effectivePageContext || null,
      memoryContext: memory,
      intent: memory.last_intent || "unknown",
      productName: action?.payload?.product_name || memory.last_product_name || undefined,
      productSlug: action?.payload?.product_slug || memory.last_product_slug || undefined,
      productSku: action?.payload?.product_sku || memory.last_product_sku || undefined,
      categorySlug: memory.last_recommendation_category || memory.preferred_category || undefined,
      sessionId: telemetrySessionIdRef.current,
    });

    window.open(prefill.href, "_blank", "noopener,noreferrer");
    sendTelemetryEvent({
      event_type: "handoff_initiated",
      sessionId: prefill.metadata.session_id,
      timestamp: prefill.metadata.timestamp,
      event_name: "handoff_initiated",
      handoff_origin: prefill.metadata.handoff_origin,
      handoff_need: prefill.metadata.handoff_need,
      handoff_intent_detected: prefill.metadata.handoff_intent_detected,
      handoff_product_slug: prefill.metadata.handoff_product_slug,
      handoff_product_sku: prefill.metadata.handoff_product_sku,
      handoff_category: prefill.metadata.handoff_category,
      handoff_product_price: prefill.metadata.handoff_product_price,
      handoff_message_length: prefill.metadata.handoff_message_length,
      handoff_has_memory_context: prefill.metadata.handoff_has_memory_context,
      clickedProductId: null,
      clickedWhatsApp: true,
      routePath: prefill.metadata.path,
      userMessage: latestInput || null,
      conversationMessageCount: messages.length,
    });
    emitEvent("handoff_initiated", {
      origin: prefill.metadata.handoff_origin,
      need: prefill.metadata.handoff_need,
      handoff_intent: prefill.metadata.handoff_intent_detected,
      product_slug: prefill.metadata.handoff_product_slug,
      product_sku: prefill.metadata.handoff_product_sku,
      category: prefill.metadata.handoff_category,
      message_length: prefill.metadata.handoff_message_length,
      has_memory_context: prefill.metadata.handoff_has_memory_context,
    });
    emitEvent("whatsapp_opened", { latest_input: latestInput || null });
  }

  function handleAction(action: ChatAction) {
    if (action.type === "prompt") {
      processUserInput(action.value, "prompt");
      return;
    }

    if (action.type === "add_to_cart") {
      const productId =
        Number(action.payload?.product_id) || Number.parseInt(action.value, 10);
      if (!Number.isFinite(productId) || productId <= 0) {
        setMessages((current) => [
          ...current,
          { id: createId(), role: "bot", text: "No pude resolver ese producto para agregar al carrito." },
        ]);
        return;
      }

      pushUserMessage(`${action.icon ? `${action.icon} ` : ""}${action.label}`);
      emitEvent("action_clicked", {
        action_id: action.id,
        action_type: action.type,
        action_value: action.value,
      });
      void (async () => {
        try {
          await addItem(productId, 1, {
            product_name: action.payload?.product_name || `Producto ${productId}`,
            product_slug: action.payload?.product_slug || "",
            product_sku: action.payload?.product_sku || null,
            image_url: action.payload?.image_url || null,
            brand: action.payload?.brand || null,
            stock_status: action.payload?.stock_status || "in_stock",
            unit_price: Number(action.payload?.unit_price) || 0,
            compare_price:
              typeof action.payload?.compare_price === "number"
                ? action.payload.compare_price
                : null,
          });
          setMessages((current) => [
            ...current,
            {
              id: createId(),
              role: "bot",
              text: "Listo, lo agregué al carrito.",
              actions: [
                { id: `cart-open-${productId}`, label: "Ver carrito", type: "link", value: "/carrito" },
                { id: "cart-continue-shopping", label: "Seguir comprando", type: "link", value: "/catalogo" },
              ],
            },
          ]);
        } catch {
          setMessages((current) => [
            ...current,
            {
              id: createId(),
              role: "bot",
              text: "No pude agregarlo al carrito en este momento. ¿Quieres que te lleve al producto?",
              actions: action.payload?.product_slug
                ? [{ id: `go-product-${productId}`, label: "Ver producto", type: "link", value: `/catalogo/${action.payload.product_slug}` }]
                : undefined,
            },
          ]);
        }
      })();
      return;
    }

    pushUserMessage(`${action.icon ? `${action.icon} ` : ""}${action.label}`);
    emitEvent("action_clicked", {
      action_id: action.id,
      action_type: action.type,
      action_value: action.value,
    });
    const productIdFromAction =
      Number(action.payload?.product_id) ||
      Number.parseInt(String(action.value).replace(/[^\d]/g, ""), 10) ||
      Number.parseInt(String(action.id).replace(/[^\d]/g, ""), 10) ||
      null;
    sendTelemetryEvent({
      event_type: "interaction_click",
      sessionId: telemetrySessionIdRef.current,
      timestamp: new Date().toISOString(),
      clickedProductId: action.type === "link" && action.value.startsWith("/catalogo/") ? productIdFromAction : null,
      clickedWhatsApp: action.type === "whatsapp",
      actionType: action.type,
      actionId: action.id,
      actionValue: action.value,
      routePath: pathname,
      conversationMessageCount: messages.length,
    });

    if (action.type === "whatsapp") {
      openWhatsAppWithContext(action.label, action);
      runCommand("menu");
      return;
    }

    if (action.type === "link") {
      router.push(action.value);
      closeChat("link_navigation");
      return;
    }

    runCommand(action.value as CommandValue);
  }

  function handleResetConversation() {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsTyping(false);
    setDraft("");
    const greeting = buildKoraContextualGreeting({ pageContext: effectivePageContext || null });
    const shown = loadShownGreetingContexts();
    if (!shown.includes(greeting.contextKey)) {
      persistShownGreetingContexts([...shown, greeting.contextKey]);
    }
    setMessages([{ id: createId(), role: "bot", text: greeting.message }]);
    setMemory({});
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(MEMORY_SESSION_KEY);
    }
    emitEvent("conversation_reset");
  }

  function handleSubmitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isTyping) return;

    const input = draft.trim();
    if (!input) return;
    setDraft("");
    processUserInput(input, "message");
  }

  useEffect(() => {
    openChatRef.current = openChat;
    processUserInputRef.current = processUserInput;
  });

  useEffect(() => {
    if (!hydrated || isDisabledRoute) return;

    function onOpenKora(event: Event) {
      const detail = (event as CustomEvent<{ prompt?: string }>).detail;
      const prompt = String(detail?.prompt || "").trim();
      openChatRef.current("product_assist_link");
      if (prompt) {
        processUserInputRef.current(prompt, "prompt");
      }
    }

    window.addEventListener("kensar:kora-open", onOpenKora as EventListener);
    return () => {
      window.removeEventListener("kensar:kora-open", onOpenKora as EventListener);
    };
  }, [hydrated, isDisabledRoute]);

  if (!hydrated || isDisabledRoute) {
    return null;
  }

  return (
    <div className="kora-chat-root" ref={rootRef}>
      <div className={`kora-chat-nudge${nudgeVisible && !isOpen ? " is-visible" : ""}`} aria-hidden={isOpen || !nudgeVisible}>
        {KORA_NUDGE_TEXT}
      </div>
      <button
        type="button"
        className={`kora-chat-toggle${nudgePulse ? " is-notify-wave" : ""}`}
        onClick={() => (isOpen ? closeChat("toggle_button") : openChat("toggle_button"))}
        aria-label={isOpen ? "Cerrar asistente KORA" : "Abrir asistente KORA"}
        aria-expanded={isOpen}
      >
        <span className="kora-chat-toggle-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M4 6.8A2.8 2.8 0 0 1 6.8 4h10.4A2.8 2.8 0 0 1 20 6.8v7.4A2.8 2.8 0 0 1 17.2 17H10l-4.2 3v-3.1A2.8 2.8 0 0 1 4 14.2V6.8Z" />
          </svg>
        </span>
      </button>

      <section className={`kora-chat-panel${isOpen ? " is-open" : ""}`} aria-label="Asistente KORA" role="dialog">
        <header className="kora-chat-header">
          <div className="kora-chat-header-main">
            <span
              className="kora-chat-avatar"
              style={{ backgroundImage: `url('${KORA_AVATAR_SRC}')` }}
              aria-hidden="true"
            />
            <div>
              <p className="kora-chat-title">KORA</p>
              <p className="kora-chat-subtitle">Asistente comercial</p>
              <p className="kora-chat-status">
                <span className="kora-chat-status-dot" aria-hidden="true" />
                En línea
              </p>
            </div>
          </div>
          <div className="kora-chat-header-actions">
            <button
              type="button"
              className="kora-chat-reset"
              onClick={handleResetConversation}
              aria-label="Reiniciar conversación"
              title="Reiniciar conversación"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4h-4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button type="button" className="kora-chat-close" onClick={() => closeChat("header_close")} aria-label="Cerrar chat">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M6 9l6 6 6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </header>

        <div className="kora-chat-messages">
          {messages.map((message) => (
            <article
              key={message.id}
              className={`kora-chat-message ${message.role === "bot" ? "is-bot" : "is-user"}`}
            >
              <p>{message.text}</p>
              {message.productCards?.length ? (
                <div className="kora-product-cards">
                  <div className="kora-product-cards-track">
                    {message.productCards.map((card) => (
                      <button
                        type="button"
                        key={`card-${message.id}-${card.id}`}
                        className="kora-product-card"
                        onClick={() => handleAction({ id: `card-open-${card.id}`, label: `Ver ${card.name}`, type: "link", value: card.url })}
                        aria-label={`Ver ${card.name}`}
                      >
                        <ProductCardMedia
                          imageUrl={card.image_url}
                          name={card.name}
                          fallbackLabel={(card.category_name || card.name || "P").slice(0, 1).toUpperCase()}
                        />
                        <div className="kora-product-card-body">
                          <p className="kora-product-card-name">{card.name}</p>
                          <p className="kora-product-card-meta">{formatCardPrice(card.price, card.price_mode)}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {message.actions?.length ? (
                <div className="kora-chat-actions">
                  {message.actions.map((action) => (
                    <button
                      type="button"
                      key={action.id}
                      className="kora-chat-action-btn"
                      onClick={() => handleAction(action)}
                    >
                      {action.icon ? <span aria-hidden="true">{action.icon}</span> : null}
                      <span>{action.label}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </article>
          ))}

          {isTyping ? (
            <div className="kora-chat-typing" role="status" aria-live="polite" aria-label="KORA está escribiendo">
              <span className="kora-chat-typing-label">KORA está escribiendo</span>
              <span className="kora-chat-typing-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </div>
          ) : null}
          <div ref={endRef} />
        </div>

        <footer className="kora-chat-footer">
          <form className="kora-chat-input-form" onSubmit={handleSubmitMessage}>
            <input
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Escribe tu consulta..."
              className="kora-chat-input"
              maxLength={140}
              aria-label="Escribir consulta en KORA"
            />
            <button type="submit" className="kora-chat-send" disabled={isTyping || !draft.trim()} aria-label="Enviar">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M4 12.4 19 4l-3.9 16-4.1-5.1-7 1.5Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </form>
        </footer>
      </section>
    </div>
  );
}

function sanitizeProductCards(cards: KoraAskResponse["product_cards"]) {
  if (!Array.isArray(cards)) return [];
  return cards
    .slice(0, 5)
    .map((card) => ({
      id: Number(card?.id) || 0,
      slug: typeof card?.slug === "string" ? card.slug : "",
      name: typeof card?.name === "string" ? card.name : "",
      price: Number.isFinite(Number(card?.price)) ? Number(card?.price) : null,
      price_mode: typeof card?.price_mode === "string" ? card.price_mode : null,
      brand: typeof card?.brand === "string" ? card.brand : null,
      category_name: typeof card?.category_name === "string" ? card.category_name : null,
      image_url: typeof card?.image_url === "string" ? card.image_url : null,
      reason: typeof card?.reason === "string" ? card.reason : null,
      url: typeof card?.url === "string" ? card.url : "",
    }))
    .filter((card) => card.id > 0 && card.name && card.url);
}

function ProductCardMedia({
  imageUrl,
  name,
  fallbackLabel,
}: {
  imageUrl: string | null;
  name: string;
  fallbackLabel: string;
}) {
  const [failed, setFailed] = useState(false);
  const safeFallback = (fallbackLabel || "P").slice(0, 1).toUpperCase();

  return (
    <div className="kora-product-card-media" aria-hidden="true">
      {!imageUrl || failed ? (
        <span>{safeFallback}</span>
      ) : (
        <Image
          src={imageUrl}
          alt={name}
          width={92}
          height={92}
          unoptimized
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

function formatCardPrice(price: number | null, priceMode: string | null) {
  if (priceMode === "consultar" || price === null) return "Precio a consultar";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(price);
}
