"use client";

import { FormEvent, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";

type ActionType = "command" | "link" | "whatsapp";
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

const SESSION_KEY = "kensar_kora_session_v1";
const SESSION_OPEN_KEY = "kensar_kora_open_v1";
const EVENTS_SESSION_KEY = "kensar_kora_events_v1";
const WHATSAPP_PHONE = "573185657508";
const RESPONSE_DELAYS = [520, 640, 760] as const;
const QUICK_HINTS = "Ejemplo: “métodos de pago”, “envíos”, “garantía”, “quiero audio”";

const MAIN_ACTIONS: ChatAction[] = [
  { id: "products", label: "Ver productos", icon: "🛍️", type: "command", value: "products" },
  { id: "payments", label: "Métodos de pago", icon: "💳", type: "command", value: "payments" },
  { id: "shipping", label: "Envíos", icon: "🚚", type: "command", value: "shipping" },
  { id: "warranty", label: "Garantías", icon: "🛡️", type: "command", value: "warranty" },
  { id: "advisor", label: "Hablar con asesor", icon: "📞", type: "command", value: "advisor" },
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
    text: "Hola, soy KORA 👋\nAsistente de Kensar.\nPuedo ayudarte a encontrar productos, resolver dudas o guiarte en tu compra.",
    actions: MAIN_ACTIONS,
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
  const endRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const delayIndexRef = useRef(0);
  const isDisabledRoute = pathname === "/pago" || pathname.startsWith("/pago/") || pathname === "/legal" || pathname.startsWith("/legal/");

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

  if (!hydrated || isDisabledRoute) {
    return null;
  }

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

  function openWhatsAppWithContext(latestInput: string) {
    const href = buildWhatsAppHrefWithContext(pathname, messages, latestInput);
    window.open(href, "_blank", "noopener,noreferrer");
    emitEvent("whatsapp_opened", { latest_input: latestInput || null });
  }

  function handleAction(action: ChatAction) {
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
    emitEvent("conversation_reset");
  }

  function handleSubmitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isTyping) return;

    const input = draft.trim();
    if (!input) return;

    pushUserMessage(input);
    setDraft("");
    emitEvent("message_submitted", { length: input.length });

    const command = resolveCommandFromText(input);
    emitEvent("intent_detected", { detected_intent: command });

    if (command === "unknown") {
      setIsTyping(true);
      const delay = RESPONSE_DELAYS[delayIndexRef.current % RESPONSE_DELAYS.length];
      delayIndexRef.current += 1;
      timeoutRef.current = window.setTimeout(() => {
        setMessages((current) => [...current, createUnknownMessage()]);
        setIsTyping(false);
        timeoutRef.current = null;
      }, delay);
      return;
    }

    if (command === "advisor") {
      openWhatsAppWithContext(input);
    }

    runCommand(command);
  }

  return (
    <div className="kora-chat-root" ref={rootRef}>
      <button
        type="button"
        className="kora-chat-toggle"
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
          <div>
            <p className="kora-chat-title">KORA</p>
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
