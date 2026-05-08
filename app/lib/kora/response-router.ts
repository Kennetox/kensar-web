import type { KoraNluResult } from "./entities";

type RouterAction = {
  id: string;
  label: string;
  type: "command" | "link" | "whatsapp" | "prompt" | "add_to_cart";
  value: string;
  icon?: string;
};

export type RoutedResponse = {
  handled: boolean;
  intent: "products" | "payments" | "shipping" | "warranty" | "advisor" | "unknown";
  answer: string;
  actions: RouterAction[];
  suggestions: string[];
  confidence_score: number;
  resolution_kind: "direct" | "disambiguation" | "fallback";
};

type RouterMemory = {
  preferred_category?: string | null;
  last_product_name?: string | null;
  last_product_slug?: string | null;
};

const NLU_ROUTE_CONFIDENCE = 0.62;

function productIntentFromNlu(intent: KoraNluResult["intent"]) {
  return (
    intent === "product_search" ||
    intent === "product_recommendation" ||
    intent === "product_comparison" ||
    intent === "cheap_options" ||
    intent === "premium_options"
  );
}

export function canUseNluRoute(nlu: KoraNluResult | null) {
  if (!nlu) return false;
  if (nlu.confidence < NLU_ROUTE_CONFIDENCE) return false;
  return (
    productIntentFromNlu(nlu.intent) ||
    nlu.intent === "shipping" ||
    nlu.intent === "warranty" ||
    nlu.intent === "payments" ||
    nlu.intent === "human_advisor"
  );
}

function base(intent: RoutedResponse["intent"], answer: string, actions: RouterAction[], suggestions: string[], confidence: number): RoutedResponse {
  return {
    handled: true,
    intent,
    answer,
    actions,
    suggestions,
    confidence_score: confidence,
    resolution_kind: "direct",
  };
}

export function buildNluRoutedResponse(nlu: KoraNluResult, memory?: RouterMemory): RoutedResponse | null {
  if (!canUseNluRoute(nlu)) return null;

  if (nlu.followup_type === "cheaper") {
    const memoryCategory = memory?.preferred_category || null;
    if (memoryCategory || memory?.last_product_name) {
      return base(
        "products",
        `Claro. Te ayudo con opciones más económicas${memory?.last_product_name ? ` tomando como referencia ${memory.last_product_name}` : ""}.`,
        [
          { id: "nlu-cheaper-context", label: "Ver opciones económicas", type: "command", value: "products" },
          { id: "nlu-cheaper-whatsapp", label: "Hablar con asesor", type: "whatsapp", value: "asesoria_eleccion", icon: "📞" },
        ],
        ["Muéstrame una opción similar", "Quiero algo para empezar"],
        Math.max(0.76, nlu.confidence)
      );
    }
    return base(
      "products",
      "Claro, ¿más barato en qué producto: cabinas, guitarras, micrófonos, teclados u otro?",
      [
        { id: "nlu-cheaper-cabinas", label: "Cabinas económicas", type: "prompt", value: "Quiero cabinas económicas" },
        { id: "nlu-cheaper-guitarras", label: "Guitarras económicas", type: "prompt", value: "Quiero guitarras económicas" },
        { id: "nlu-cheaper-mics", label: "Micrófonos económicos", type: "prompt", value: "Quiero micrófonos económicos" },
        { id: "nlu-cheaper-keys", label: "Teclados económicos", type: "prompt", value: "Quiero teclados económicos" },
      ],
      ["Cabinas económicas", "Guitarras económicas"],
      Math.max(0.72, nlu.confidence)
    );
  }

  if (nlu.intent === "product_search" && nlu.category === "instrumentos" && nlu.matched_aliases.some((a) => /guitarr/i.test(a))) {
    return base(
      "products",
      "¡Claro! Te ayudo con guitarras. ¿La buscas acústica, eléctrica o electroacústica? También puedo mostrarte opciones económicas o para empezar.",
      [
        { id: "nlu-guitar-view", label: "Ver guitarras", type: "link", value: "/catalogo/categoria/instrumentos" },
        { id: "nlu-guitar-start", label: "Guitarra para empezar", type: "prompt", value: "Quiero una guitarra para empezar" },
        { id: "nlu-guitar-cheap", label: "Opciones económicas", type: "prompt", value: "Muéstrame guitarras económicas" },
        { id: "nlu-guitar-advisor", label: "Hablar con asesor", type: "whatsapp", value: "asesoria_eleccion", icon: "📞" },
      ],
      ["Quiero guitarra acústica", "Quiero guitarra eléctrica"],
      Math.max(0.8, nlu.confidence)
    );
  }

  if ((nlu.intent === "cheap_options" || nlu.attributes.includes("cheap")) && nlu.category === "audio-profesional") {
    return base(
      "products",
      "Claro, puedo ayudarte con cabinas económicas. Para recomendarte mejor, ¿la necesitas para casa, negocio, fiesta o iglesia?",
      [
        { id: "nlu-cheap-cabinas", label: "Ver cabinas económicas", type: "prompt", value: "Muéstrame cabinas económicas" },
        { id: "nlu-cheap-party", label: "Para fiesta", type: "prompt", value: "Necesito cabina para fiesta" },
        { id: "nlu-cheap-business", label: "Para negocio", type: "prompt", value: "Necesito cabina para negocio" },
        { id: "nlu-cheap-advisor", label: "Hablar con asesor", type: "whatsapp", value: "asesoria_eleccion", icon: "📞" },
      ],
      ["Para iglesia", "Para casa"],
      Math.max(0.8, nlu.confidence)
    );
  }

  if (nlu.attributes.includes("high_output_bass") && !nlu.category) {
    return base(
      "products",
      "Perfecto, buscas algo potente o con buen bajo. ¿Lo necesitas en cabinas, parlantes para casa, car audio o sonido profesional?",
      [
        { id: "nlu-power-cabinas", label: "Cabinas potentes", type: "prompt", value: "Quiero cabinas potentes" },
        { id: "nlu-power-home", label: "Parlantes para casa", type: "prompt", value: "Quiero parlantes potentes para casa" },
        { id: "nlu-power-car", label: "Car audio", type: "prompt", value: "Quiero car audio con buen bajo" },
        { id: "nlu-power-advisor", label: "Hablar con asesor", type: "whatsapp", value: "asesoria_eleccion", icon: "📞" },
      ],
      ["Sonido profesional", "Para fiesta"],
      Math.max(0.78, nlu.confidence)
    );
  }

  if (nlu.intent === "product_recommendation" && nlu.category === "instrumentos" && nlu.matched_aliases.some((a) => /piano|teclad/i.test(a))) {
    return base(
      "products",
      "Te ayudo. Para recomendarte bien, ¿es para aprender, tocar en iglesia, estudio o presentaciones?",
      [
        { id: "nlu-piano-learn", label: "Para aprender", type: "prompt", value: "Quiero piano para aprender" },
        { id: "nlu-piano-church", label: "Para iglesia", type: "prompt", value: "Quiero piano para iglesia" },
        { id: "nlu-piano-cheap", label: "Opciones económicas", type: "prompt", value: "Quiero teclados económicos" },
        { id: "nlu-piano-view", label: "Ver teclados/pianos", type: "link", value: "/catalogo/categoria/instrumentos" },
      ],
      ["Para estudio", "Para presentaciones"],
      Math.max(0.82, nlu.confidence)
    );
  }

  if (nlu.intent === "shipping") {
    return base(
      "shipping",
      "Claro. Te explico envíos: despachamos a diferentes ciudades y el tiempo depende de destino y disponibilidad.",
      [{ id: "nlu-shipping-contact", label: "Confirmar envío por WhatsApp", type: "whatsapp", value: "envio", icon: "📞" }],
      ["¿Envían a mi ciudad?", "¿Cuánto tarda?"],
      Math.max(0.78, nlu.confidence)
    );
  }

  if (nlu.intent === "warranty") {
    return base(
      "warranty",
      "Te ayudo con garantías. Si me dices producto o SKU te indico el proceso más rápido.",
      [{ id: "nlu-warranty-policy", label: "Ver políticas", type: "link", value: "/legal/cambios-devoluciones-garantias" }],
      ["¿Qué cubre la garantía?", "¿Cómo tramito un cambio?"],
      Math.max(0.78, nlu.confidence)
    );
  }

  if (nlu.intent === "payments") {
    return base(
      "payments",
      "Sí, te ayudo con pagos. Manejamos varios medios, incluyendo opciones digitales y financiación.",
      [{ id: "nlu-payments-open", label: "Ver opciones de pago", type: "link", value: "/pago" }],
      ["¿Reciben Nequi?", "¿Manejan cuotas?"],
      Math.max(0.78, nlu.confidence)
    );
  }

  if (nlu.intent === "human_advisor") {
    return base(
      "advisor",
      "Perfecto, te conecto con un asesor para ayudarte en tiempo real.",
      [{ id: "nlu-advisor-open", label: "Abrir WhatsApp", type: "whatsapp", value: "advisor_general", icon: "📞" }],
      ["Quiero cotización", "Necesito ayuda para elegir"],
      Math.max(0.82, nlu.confidence)
    );
  }

  return null;
}
