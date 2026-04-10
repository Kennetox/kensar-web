"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type ActionType = "command" | "link" | "whatsapp";
type CommandValue = "menu" | "products" | "payments" | "shipping" | "warranty" | "advisor";

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

const SESSION_KEY = "kensar_kora_session_v1";
const SESSION_OPEN_KEY = "kensar_kora_open_v1";
const WHATSAPP_PHONE = "573185657508";
const WHATSAPP_MESSAGE = "Hola, vengo desde la web de Kensar y necesito ayuda";
const RESPONSE_DELAYS = [520, 640, 760] as const;

const MAIN_ACTIONS: ChatAction[] = [
  { id: "products", label: "Ver productos", icon: "🛍️", type: "command", value: "products" },
  { id: "payments", label: "Métodos de pago", icon: "💳", type: "command", value: "payments" },
  { id: "shipping", label: "Envíos", icon: "🚚", type: "command", value: "shipping" },
  { id: "warranty", label: "Garantías", icon: "🛡️", type: "command", value: "warranty" },
  { id: "advisor", label: "Hablar con asesor", icon: "📞", type: "whatsapp", value: "advisor" },
];

const PRODUCT_ACTIONS: ChatAction[] = [
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

function buildBotReply(command: CommandValue): ChatMessage {
  if (command === "products") {
    return {
      id: createId(),
      role: "bot",
      text: "Perfecto. Elige la categoría que quieres explorar:",
      actions: PRODUCT_ACTIONS,
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

  return {
    id: createId(),
    role: "bot",
    text: "Listo. Estoy aquí para ayudarte. ¿Qué deseas revisar?",
    actions: MAIN_ACTIONS,
  };
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

export default function KoraChat() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(loadInitialOpen);
  const [messages, setMessages] = useState<ChatMessage[]>(loadInitialMessages);
  const [isTyping, setIsTyping] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const delayIndexRef = useRef(0);
  const isDisabledRoute = pathname === "/pago" || pathname.startsWith("/pago/") || pathname === "/legal" || pathname.startsWith("/legal/");

  const whatsappHref = useMemo(
    () => `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`,
    [],
  );

  useEffect(() => {
    if (!messages.length || isDisabledRoute) return;
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(messages));
  }, [messages, isDisabledRoute]);

  useEffect(() => {
    if (isDisabledRoute) return;
    window.sessionStorage.setItem(SESSION_OPEN_KEY, isOpen ? "1" : "0");
  }, [isOpen, isDisabledRoute]);

  useEffect(() => {
    if (!isOpen) return;
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isTyping, isOpen]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (isDisabledRoute) {
    return null;
  }

  function pushUserMessage(text: string) {
    setMessages((current) => [...current, { id: createId(), role: "user", text }]);
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
      setMessages((current) => [...current, buildBotReply(command)]);
      setIsTyping(false);
      timeoutRef.current = null;
    }, delay);
  }

  function handleAction(action: ChatAction) {
    pushUserMessage(`${action.icon ? `${action.icon} ` : ""}${action.label}`);

    if (action.type === "whatsapp") {
      window.open(whatsappHref, "_blank", "noopener,noreferrer");
      runCommand("menu");
      return;
    }

    if (action.type === "link") {
      router.push(action.value);
      return;
    }

    runCommand(action.value as CommandValue);
  }

  return (
    <div className="kora-chat-root">
      <button
        type="button"
        className="kora-chat-toggle"
        onClick={() => setIsOpen((current) => !current)}
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
          <button type="button" className="kora-chat-close" onClick={() => setIsOpen(false)} aria-label="Cerrar chat">
            ×
          </button>
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
          <p>Próximamente podrás escribir consultas libres aquí.</p>
        </footer>
      </section>
    </div>
  );
}
