import { findCategoryKnowledge } from "./category-knowledge";
import type { KoraPageContext } from "./knowledge-types";

export type KoraGreetingType =
  | "home"
  | "category"
  | "subcategory"
  | "product"
  | "product_out_of_stock"
  | "generic";

export type KoraContextualGreeting = {
  message: string;
  greetingType: KoraGreetingType;
  contextKey: string;
};

function normalize(value: string) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function title(value: string) {
  return (value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function productLooksOutOfStock(pageContext?: KoraPageContext | null) {
  if (!pageContext?.productAttributes || typeof pageContext.productAttributes !== "object") return false;
  const attrs = pageContext.productAttributes as Record<string, unknown>;
  const status = normalize(String(attrs.stock_status || attrs.stockStatus || ""));
  if (status === "out_of_stock" || status === "agotado" || status === "sin stock") return true;
  const stockRaw = Number(attrs.stock ?? attrs.inventory ?? attrs.qty);
  if (Number.isFinite(stockRaw) && stockRaw <= 0) return true;
  if (attrs.in_stock === false || attrs.inStock === false) return true;
  return false;
}

export function buildKoraContextualGreeting(input: {
  pageContext?: KoraPageContext | null;
}): KoraContextualGreeting {
  const pageContext = input.pageContext || null;

  if (!pageContext || pageContext.pageType === "unknown") {
    return {
      message: "Hola, soy KORA, asistente de Kensar 👋\n¿En qué te ayudo hoy?",
      greetingType: "generic",
      contextKey: "generic",
    };
  }

  if (pageContext.pageType === "home") {
    return {
      message: "Hola, soy KORA, asistente de Kensar 👋\n¿En qué te ayudo hoy?",
      greetingType: "home",
      contextKey: "home",
    };
  }

  if (pageContext.pageType === "category" || pageContext.pageType === "subcategory") {
    const slug = pageContext.subcategorySlug || pageContext.categorySlug || "";
    const key = `${pageContext.pageType}:${normalize(slug || "general")}`;
    const knowledge = findCategoryKnowledge(
      `${pageContext.subcategoryName || ""} ${pageContext.categoryName || ""} ${pageContext.subcategorySlug || ""} ${pageContext.categorySlug || ""}`
    );

    if (knowledge?.suggestedOpeningMessage) {
      return {
        message: knowledge.suggestedOpeningMessage,
        greetingType: pageContext.pageType,
        contextKey: key,
      };
    }

    const label = title(pageContext.subcategoryName || pageContext.categoryName || slug || "esta categoría");
    return {
      message: `Veo que estás mirando ${label} 👋\nPuedo ayudarte a elegir según tu uso y presupuesto.`,
      greetingType: pageContext.pageType,
      contextKey: key,
    };
  }

  if (pageContext.pageType === "product") {
    const productId = String(pageContext.productId || pageContext.productName || "producto");
    const contextKey = `product:${normalize(productId)}`;
    const name = pageContext.productName || "este producto";

    if (productLooksOutOfStock(pageContext)) {
      return {
        message:
          "Veo que este producto aparece sin stock.\nPuedo ayudarte a buscar una alternativa similar o consultar disponibilidad por WhatsApp.",
        greetingType: "product_out_of_stock",
        contextKey,
      };
    }

    return {
      message:
        `Veo que estás mirando ${name} 👋\nSi quieres, te ayudo a resolver dudas del producto, compararlo o asesorarte según tu uso.`,
      greetingType: "product",
      contextKey,
    };
  }

  return {
    message: "Hola, soy KORA, asistente de Kensar 👋\n¿En qué te ayudo hoy?",
    greetingType: "generic",
    contextKey: "generic",
  };
}
