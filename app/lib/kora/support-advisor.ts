import type { KoraIntentId } from "./intents";
import type { KoraBusinessKnowledge } from "./business-knowledge";

export type KoraSupportTopic = "payments" | "shipping" | "warranty" | "returns" | "technical_support";

type SupportAction = {
  id: string;
  label: string;
  type: "link" | "whatsapp" | "prompt";
  value: string;
  icon?: string;
};

export type KoraSupportAnswer = {
  topic: KoraSupportTopic;
  intent: "payments" | "shipping" | "warranty" | "returns_policy" | "business_support";
  answer: string;
  actions: SupportAction[];
  suggestions: string[];
};

function normalize(value: string) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectTopic(query: string, nluIntent?: KoraIntentId | null, memoryTopic?: string | null): KoraSupportTopic | null {
  const text = normalize(query);
  if (/\b(devolucion|devolver|cambio|cambiar producto|retracto)\b/.test(text) || nluIntent === "returns_policy") return "returns";
  if (/\b(soporte tecnico|servicio tecnico|reparacion|reparar|arreglan)\b/.test(text) || nluIntent === "business_support") return "technical_support";
  if (/\b(garantia|falla|reclamo)\b/.test(text) || nluIntent === "warranty" || nluIntent === "warranty_policy") return "warranty";
  if (
    /\b(envio|envios|despacho|entrega|domicilio|transportadora)\b/.test(text) ||
    (/\b(tarda|demora|tiempo|costo)\b/.test(text) && /\b(palmira|cali|ciudad|destino)\b/.test(text)) ||
    nluIntent === "shipping" ||
    nluIntent === "shipping_policy"
  ) return "shipping";
  if (/\b(pago|pagar|pse|nequi|efecty|wompi|mercado pago|cuotas|financiacion|tarjeta)\b/.test(text) || nluIntent === "payments") return "payments";
  if (memoryTopic === "returns") return "returns";
  if (memoryTopic === "warranty") return "warranty";
  if (memoryTopic === "shipping") return "shipping";
  if (memoryTopic === "payments") return "payments";
  return null;
}

function warrantyAnswer(query: string, kb: KoraBusinessKnowledge): KoraSupportAnswer {
  const text = normalize(query);
  const info = kb.customer_guidance.warranty;
  const hasActiveClaim = /\b(mi producto|mi pedido|se dano|no funciona|fallando|reclamo|reclamar|iniciar|tramitar)\b/.test(text);
  let answer = `La garantía ${info.coverage.toLowerCase()} Puede cubrir fallas atribuibles al producto; no cubre casos como ${info.exclusions.join(", ")}.`;
  if (/\b(como|proceso|reclamo|reclamar|tramitar|iniciar)\b/.test(text)) {
    answer = `Para iniciar una garantía necesitamos ${info.claim_requirements.join(", ")}. Después se hace una revisión técnica para confirmar si la falla está cubierta. ${info.timing}`;
  } else if (/\b(cuanto tiempo|duracion|meses|anos|tarda|demora|tiempo)\b/.test(text)) {
    answer = `La duración de la garantía depende del producto y del fabricante; no hay un único plazo para todo el catálogo. Compárteme el producto o SKU para revisar su garantía específica. ${info.timing}`;
  }
  return {
    topic: "warranty",
    intent: "warranty",
    answer,
    actions: hasActiveClaim
      ? [
          { id: "support-warranty-start", label: "Iniciar reclamo por WhatsApp", type: "whatsapp", value: "garantia", icon: "📞" },
          { id: "support-warranty-policy", label: "Ver política completa", type: "link", value: kb.policies.warranty },
        ]
      : [
          { id: "support-warranty-how", label: "Cómo iniciar un reclamo", type: "prompt", value: "¿Cómo inicio un reclamo de garantía?" },
          { id: "support-warranty-policy", label: "Ver política completa", type: "link", value: kb.policies.warranty },
        ],
    suggestions: [],
  };
}

function shippingAnswer(query: string, kb: KoraBusinessKnowledge): KoraSupportAnswer {
  const text = normalize(query);
  const info = kb.customer_guidance.shipping;
  let answer = `Hacemos envíos a ${info.coverage} ${info.free_shipping} Palmira tarda ${info.palmira_time.toLowerCase()} Cali, ${info.cali_time.toLowerCase()} y otras ciudades, ${info.national_time.toLowerCase()}`;
  if (/\bpalmira\b/.test(text)) answer = `${info.free_shipping} El tiempo estimado para Palmira es ${info.palmira_time.toLowerCase()}`;
  else if (/\bcali\b/.test(text)) answer = `${info.free_shipping} El tiempo estimado para Cali es ${info.cali_time.toLowerCase()}`;
  else if (/\b(tarda|demora|tiempo)\b/.test(text)) answer = `Tiempos estimados: Palmira, ${info.palmira_time.toLowerCase()} Cali, ${info.cali_time.toLowerCase()} Otras ciudades, ${info.national_time.toLowerCase()}`;
  else if (/\b(costo|vale|precio|cuanto cuesta)\b/.test(text)) answer = `${info.free_shipping} En otros casos el costo depende de ${info.cost_factors.join(", ")} y se confirma antes del despacho.`;
  return {
    topic: "shipping",
    intent: "shipping",
    answer,
    actions: [
      { id: "support-shipping-quote", label: "Confirmar mi envío", type: "whatsapp", value: "envio", icon: "📞" },
      { id: "support-shipping-policy", label: "Ver política completa", type: "link", value: kb.policies.shipping },
    ],
    suggestions: [],
  };
}

function paymentsAnswer(query: string, kb: KoraBusinessKnowledge): KoraSupportAnswer {
  const text = normalize(query);
  const payments = kb.customer_guidance.payments;
  const asksFinancing = /\b(cuotas|financiacion|financiar|credito|addi|sistecredito)\b/.test(text);
  return {
    topic: "payments",
    intent: "payments",
    answer: asksFinancing
      ? `En el checkout web están disponibles Mercado Pago (${payments.mercado_pago.join(", ")}) y Wompi (${payments.wompi.join(", ")}). La financiación no aparece como una opción general publicada; podemos confirmar alternativas para tu compra por WhatsApp.`
      : `Puedes pagar en línea con Mercado Pago mediante ${payments.mercado_pago.join(", ")}, o con Wompi mediante ${payments.wompi.join(" y ")}. La plataforma te redirige al proveedor elegido para completar el pago de forma segura.`,
    actions: asksFinancing
      ? [{ id: "support-payments-financing", label: "Consultar financiación", type: "whatsapp", value: "cotizacion", icon: "📞" }]
      : [{ id: "support-payments-checkout", label: "Ir al checkout", type: "link", value: kb.key_pages.payments }],
    suggestions: [],
  };
}

function returnsAnswer(kb: KoraBusinessKnowledge): KoraSupportAnswer {
  const info = kb.customer_guidance.returns;
  return {
    topic: "returns",
    intent: "returns_policy",
    answer: `Los cambios o devoluciones se revisan según ${info.conditions.join(", ")}. Para solicitarlo necesitamos ${info.request_requirements.join(", ")}; el equipo comercial o técnico valida el caso antes de aprobarlo.`,
    actions: [
      { id: "support-returns-start", label: "Consultar mi caso", type: "whatsapp", value: "garantia", icon: "📞" },
      { id: "support-returns-policy", label: "Ver política completa", type: "link", value: kb.policies.returns },
    ],
    suggestions: [],
  };
}

export function resolveKoraSupportAnswer(input: {
  query: string;
  nluIntent?: KoraIntentId | null;
  memoryTopic?: string | null;
  knowledge: KoraBusinessKnowledge;
}): KoraSupportAnswer | null {
  const topic = detectTopic(input.query, input.nluIntent, input.memoryTopic);
  if (!topic) return null;
  if (topic === "warranty") return warrantyAnswer(input.query, input.knowledge);
  if (topic === "shipping") return shippingAnswer(input.query, input.knowledge);
  if (topic === "payments") return paymentsAnswer(input.query, input.knowledge);
  if (topic === "returns") return returnsAnswer(input.knowledge);
  return {
    topic: "technical_support",
    intent: "business_support",
    answer: `${input.knowledge.support.technical_support} ${input.knowledge.support.repair_services} Para orientarte necesitamos el producto, la falla y si todavía está en garantía.`,
    actions: [
      { id: "support-technical-whatsapp", label: "Contactar soporte", type: "whatsapp", value: "servicio_tecnico", icon: "📞" },
    ],
    suggestions: [],
  };
}
