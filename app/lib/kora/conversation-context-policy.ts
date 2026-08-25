import type { KoraPageContext } from "./knowledge-types";

export type KoraContextMessage = {
  id: string;
  role: "bot" | "user";
  text: string;
  kind?: "contextual_intro" | "conversation";
  contextKey?: string;
};

export function hasKoraUserEngaged(messages: KoraContextMessage[]) {
  return messages.some((message) => message.role === "user");
}

export function reconcileUntouchedKoraConversation<T extends KoraContextMessage>(input: {
  messages: T[];
  greeting: { message: string; contextKey: string };
  createId: () => string;
}): T[] {
  if (hasKoraUserEngaged(input.messages)) return input.messages;
  const current = input.messages[0];
  if (
    input.messages.length === 1 &&
    current?.role === "bot" &&
    current.text === input.greeting.message &&
    current.contextKey === input.greeting.contextKey
  ) {
    return input.messages;
  }
  return [
    {
      id: current?.role === "bot" ? current.id : input.createId(),
      role: "bot",
      text: input.greeting.message,
      kind: "contextual_intro",
      contextKey: input.greeting.contextKey,
    } as T,
  ];
}

export function buildKoraContextTransitionNotice(pageContext?: KoraPageContext | null) {
  if (!pageContext || pageContext.pageType === "unknown") return null;
  if (pageContext.pageType === "home") {
    return "Ahora estás en Inicio. La conversación anterior sigue disponible.";
  }
  if (pageContext.pageType === "product") {
    const name = (pageContext.productName || "este producto").trim();
    return `Ahora estás viendo ${name}. Puedes preguntarme por este producto sin perder lo hablado.`;
  }
  if (pageContext.pageType === "category" || pageContext.pageType === "subcategory") {
    const name = (
      pageContext.subcategoryName ||
      pageContext.categoryName ||
      "esta sección"
    ).trim();
    return `Ahora estás viendo ${name}. La conversación anterior sigue disponible.`;
  }
  return null;
}

export function referencesCurrentPageProduct(query: string) {
  const text = (query || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return /\b(este|esta|esto|este producto|el que estoy viendo|la que estoy viendo|el de esta pagina|la de esta pagina)\b/.test(text);
}
