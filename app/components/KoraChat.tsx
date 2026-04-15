"use client";

import { FormEvent, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useWebCart } from "@/app/components/WebCartProvider";

type ActionType = "command" | "link" | "whatsapp" | "prompt" | "add_to_cart";
type CommandValue = "menu" | "products" | "payments" | "shipping" | "warranty" | "advisor";
type KoraEventName =
  | "chat_opened"
  | "chat_closed"
  | "action_clicked"
  | "message_submitted"
  | "intent_detected"
  | "whatsapp_opened"
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
  emotion?: "neutral" | "frustrated" | "urgent" | "happy" | "doubtful";
  companion_mode?: boolean;
  memory_updates?: {
    preferred_category?: string | null;
    budget_cop?: number | null;
    tone_mode?: "friendly" | "professional" | null;
    customer_goal?: "gift" | "home" | "business" | "studio" | null;
    last_emotion?: "neutral" | "frustrated" | "urgent" | "happy" | "doubtful" | null;
  };
};

const SESSION_KEY = "kensar_kora_session_v1";
const SESSION_OPEN_KEY = "kensar_kora_open_v1";
const EVENTS_SESSION_KEY = "kensar_kora_events_v1";
const MEMORY_SESSION_KEY = "kensar_kora_memory_v1";
const WHATSAPP_PHONE = "573185657508";
const RESPONSE_DELAYS = [520, 640, 760] as const;
const QUICK_HINTS = "Ejemplo: “métodos de pago”, “envíos”, “garantía”, “quiero audio”";
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
  { id: "cat-audio", label: "Audio / Sonido", type: "link", value: "/catalogo?category=audio-profesional" },
  { id: "cat-security", label: "Seguridad", type: "link", value: "/catalogo?category=camaras" },
  { id: "cat-instruments", label: "Instrumentos", type: "link", value: "/catalogo?category=instrumentos" },
  { id: "cat-accessories", label: "Accesorios", type: "link", value: "/catalogo?category=accesorios" },
  { id: "cat-home", label: "Hogar y entretenimiento", type: "link", value: "/catalogo?category=tecnologia" },
  { id: "menu-from-products", label: "Volver al menú", type: "command", value: "menu" },
];

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createWelcomeMessage(): ChatMessage {
  return {
    id: createId(),
    role: "bot",
    text: "Hola, soy KORA, asistente de Kensar 👋\n¿En qué te ayudo hoy?",
  };
}

function createAdvisorMessage(): ChatMessage {
  return {
    id: createId(),
    role: "bot",
    text: "Te conecto con un asesor por WhatsApp para ayudarte de inmediato.",
    actions: [
      { id: "open-advisor-whatsapp", label: "Abrir WhatsApp", icon: "📞", type: "whatsapp", value: "advisor" },
      { id: "menu-from-advisor", label: "Volver al menú", type: "command", value: "menu" },
    ],
  };
}

function createUnknownMessage(): ChatMessage {
  return {
    id: createId(),
    role: "bot",
    text: "Aún estoy en versión inicial. Puedo ayudarte con productos, pagos, envíos, garantías o contacto con asesor.",
    actions: MAIN_ACTIONS,
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

function loadInitialMessages(): ChatMessage[] {
  if (typeof window === "undefined") {
    return [createWelcomeMessage()];
  }

  const rawMessages = window.sessionStorage.getItem(SESSION_KEY);
  if (!rawMessages) {
    return [createWelcomeMessage()];
  }

  try {
    const parsed = JSON.parse(rawMessages) as ChatMessage[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    return [createWelcomeMessage()];
  }

  return [createWelcomeMessage()];
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
      value: `/catalogo?category=${encodeURIComponent(item.path)}`,
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

function buildWhatsAppHrefWithContext(pathname: string, messages: ChatMessage[], latestInput: string) {
  const recentUserMessages = messages
    .filter((message) => message.role === "user")
    .slice(-3)
    .map((message) => `- ${message.text.replace(/\s+/g, " ").trim()}`);

  const contextLines = recentUserMessages.length
    ? `\n\nContexto de mi consulta:\n${recentUserMessages.join("\n")}`
    : "";

  const latestLine = latestInput ? `\n\nNecesito ayuda con: ${latestInput}` : "";
  const routeLine = `\n\nRuta actual web: ${pathname}`;

  const text = `Hola, vengo desde la web de Kensar y necesito ayuda.${latestLine}${contextLines}${routeLine}`;
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(text)}`;
}

type KoraSessionMemory = {
  preferred_category?: string | null;
  budget_cop?: number | null;
  tone_mode?: "friendly" | "professional" | null;
  customer_goal?: "gift" | "home" | "business" | "studio" | null;
  last_emotion?: "neutral" | "frustrated" | "urgent" | "happy" | "doubtful" | null;
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

export default function KoraChat() {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );
  const [isOpen, setIsOpen] = useState(loadInitialOpen);
  const [messages, setMessages] = useState<ChatMessage[]>(loadInitialMessages);
  const [isTyping, setIsTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const [productActions, setProductActions] = useState<ChatAction[]>(FALLBACK_PRODUCT_ACTIONS);
  const [nudgeVisible, setNudgeVisible] = useState(false);
  const [nudgePulse, setNudgePulse] = useState(false);
  const [memory, setMemory] = useState<KoraSessionMemory>(loadKoraMemory);
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
        emitEvent("intent_detected", {
          detected_intent: aiReply.intent,
          emotion: aiReply.emotion ?? null,
          companion_mode: Boolean(aiReply.companion_mode),
        });
        if (aiReply.memory_updates && typeof aiReply.memory_updates === "object") {
          setMemory((prev) => ({
            ...prev,
            preferred_category:
              typeof aiReply.memory_updates?.preferred_category === "string"
                ? aiReply.memory_updates.preferred_category
                : prev.preferred_category,
            budget_cop: Number.isFinite(Number(aiReply.memory_updates?.budget_cop))
              ? Number(aiReply.memory_updates?.budget_cop)
              : prev.budget_cop,
            tone_mode:
              aiReply.memory_updates?.tone_mode === "professional" || aiReply.memory_updates?.tone_mode === "friendly"
                ? aiReply.memory_updates.tone_mode
                : prev.tone_mode,
            customer_goal:
              aiReply.memory_updates?.customer_goal === "gift" ||
              aiReply.memory_updates?.customer_goal === "home" ||
              aiReply.memory_updates?.customer_goal === "business" ||
              aiReply.memory_updates?.customer_goal === "studio"
                ? aiReply.memory_updates.customer_goal
                : prev.customer_goal,
            last_emotion:
              aiReply.memory_updates?.last_emotion === "frustrated" ||
              aiReply.memory_updates?.last_emotion === "urgent" ||
              aiReply.memory_updates?.last_emotion === "happy" ||
              aiReply.memory_updates?.last_emotion === "doubtful" ||
              aiReply.memory_updates?.last_emotion === "neutral"
                ? aiReply.memory_updates.last_emotion
                : prev.last_emotion,
          }));
        }
        const apiActions = sanitizeApiActions(aiReply.actions);
        const suggestionActions = buildSuggestionActions(aiReply.suggestions);
        const mergedActions = [...apiActions, ...suggestionActions].slice(0, 7);
        setMessages((current) => [
          ...current,
          {
            id: createId(),
            role: "bot",
            text: aiReply.answer.trim() || createUnknownMessage().text,
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
        openWhatsAppWithContext(input);
      }
      runCommand(command);
    }, delay);
  }

  function openWhatsAppWithContext(latestInput: string) {
    const href = buildWhatsAppHrefWithContext(pathname, messages, latestInput);
    window.open(href, "_blank", "noopener,noreferrer");
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

    if (action.type === "whatsapp") {
      openWhatsAppWithContext(action.label);
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
    setMessages([createWelcomeMessage()]);
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
            >
              Reiniciar
            </button>
            <button type="button" className="kora-chat-close" onClick={() => closeChat("header_close")} aria-label="Cerrar chat">
              ×
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

          {isTyping ? <p className="kora-chat-typing">KORA está escribiendo...</p> : null}
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
            <button type="submit" className="kora-chat-send" disabled={isTyping || !draft.trim()}>
              Enviar
            </button>
          </form>
          <p>{QUICK_HINTS}</p>
        </footer>
      </section>
    </div>
  );
}
