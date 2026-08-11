import type { KoraPageContext } from "./knowledge-types";

export type KoraFollowupMemory = {
  budget_cop?: number | null;
  last_recommendation_type?: string | null;
  last_recommended_products?: Array<{ slug: string; name: string }>;
  last_support_topic?: "payments" | "shipping" | "warranty" | "returns" | "advisor" | null;
};

export type KoraFollowupNudge = {
  id: "qualification" | "cart" | "product_comparison" | "recommendation" | "support";
  text: string;
};

type FollowupInput = {
  hasConversation: boolean;
  memory?: KoraFollowupMemory | null;
  pageContext?: KoraPageContext | null;
  currentProductSlug?: string | null;
  cartItemsCount?: number;
};

const SUPPORT_MESSAGES: Record<NonNullable<KoraFollowupMemory["last_support_topic"]>, string> = {
  payments: "¿Te ayudo a elegir cómo pagar?",
  shipping: "¿Revisamos el envío para tu ciudad?",
  warranty: "¿Te quedó alguna duda de la garantía?",
  returns: "¿Te explico cómo solicitar un cambio?",
  advisor: "¿Aún necesitas hablar con un asesor?",
};

export function resolveKoraFollowupNudge(input: FollowupInput): KoraFollowupNudge | null {
  if (!input.hasConversation) return null;

  const memory = input.memory || {};
  const recommendations = memory.last_recommended_products || [];

  if (memory.last_recommendation_type === "qualification") {
    return {
      id: "qualification",
      text: memory.budget_cop
        ? "¿Seguimos? Me falta afinar tu necesidad"
        : "¿Seguimos? Me falta conocer tu presupuesto",
    };
  }

  if (Number(input.cartItemsCount) > 0) {
    return {
      id: "cart",
      text: "¿Revisamos que no te falte nada?",
    };
  }

  if (input.pageContext?.pageType === "product" && recommendations.length > 0) {
    const isRecommendedProduct = recommendations.some(
      (product) =>
        product.slug === input.currentProductSlug ||
        product.name === input.pageContext?.productName
    );
    return {
      id: "product_comparison",
      text: isRecommendedProduct
        ? "Este producto encaja con tu búsqueda"
        : "¿Comparo este con los que vimos?",
    };
  }

  if (recommendations.length > 0) {
    return {
      id: "recommendation",
      text: "¿Comparamos las opciones que vimos?",
    };
  }

  if (memory.last_support_topic) {
    return {
      id: "support",
      text: SUPPORT_MESSAGES[memory.last_support_topic],
    };
  }

  return null;
}

export type KoraFollowupCourtesyState = {
  shownCount: number;
  lastShownAt: number;
  shownPaths: string[];
};

export function canShowKoraFollowup(input: {
  state: KoraFollowupCourtesyState;
  pathname: string;
  now: number;
  maxPerSession?: number;
  cooldownMs?: number;
}) {
  const maxPerSession = input.maxPerSession ?? 2;
  const cooldownMs = input.cooldownMs ?? 10 * 60 * 1000;
  if (input.state.shownCount >= maxPerSession) return false;
  if (input.state.shownPaths.includes(input.pathname)) return false;
  if (input.state.lastShownAt > 0 && input.now - input.state.lastShownAt < cooldownMs) return false;
  return true;
}
