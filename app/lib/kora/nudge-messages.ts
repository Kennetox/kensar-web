import type { KoraPageContext } from "./knowledge-types";

const GENERAL_NUDGES = [
  "¿Buscas algo? Te ayudo a elegir",
  "Cuéntame qué necesitas",
  "Pregúntame antes de comprar",
  "Encuentra tu producto ideal",
] as const;

function compactLabel(value?: string) {
  const label = (value || "").replace(/\s+/g, " ").trim();
  if (!label) return "";
  return label.length <= 28 ? label : `${label.slice(0, 25).trim()}…`;
}

export function getKoraNudgeMessages(pageContext?: KoraPageContext | null): string[] {
  if (pageContext?.pageType === "product") {
    return [
      "¿Este producto es para ti?",
      "Te explico sus ventajas",
      "¿Quieres compararlo?",
      "Resuelvo tus dudas aquí",
    ];
  }

  if (pageContext?.pageType === "category" || pageContext?.pageType === "subcategory") {
    const category = compactLabel(pageContext.subcategoryName || pageContext.categoryName);
    return [
      category ? `Te ayudo a elegir en ${category}` : "Te ayudo a elegir mejor",
      "Cuéntame tu uso y presupuesto",
      "¿Comparamos opciones?",
      "Encuentra la mejor opción para ti",
    ];
  }

  return [...GENERAL_NUDGES];
}
