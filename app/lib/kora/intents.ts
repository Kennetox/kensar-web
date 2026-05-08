export type KoraIntentId =
  | "product_search"
  | "product_recommendation"
  | "product_comparison"
  | "cheap_options"
  | "premium_options"
  | "shipping"
  | "warranty"
  | "payments"
  | "human_advisor"
  | "business_location"
  | "business_hours"
  | "business_contact"
  | "business_support"
  | "returns_policy"
  | "shipping_policy"
  | "warranty_policy"
  | "business_info"
  | "unknown";

export type KoraIntentDefinition = {
  id: KoraIntentId;
  priority: number;
  aliases: string[];
  examples: string[];
};

export const KORA_INTENTS: KoraIntentDefinition[] = [
  {
    id: "business_contact",
    priority: 98,
    aliases: ["whatsapp", "contacto", "telefono", "teléfono", "correo", "email", "como los contacto", "cómo los contacto"],
    examples: ["cuál es el whatsapp", "cómo los contacto"],
  },
  {
    id: "business_location",
    priority: 97,
    aliases: ["donde estan", "dónde están", "ubicados", "ubicacion", "ubicación", "tienda fisica", "tienda física", "donde los encuentro"],
    examples: ["dónde están ubicados", "tienen tienda física"],
  },
  {
    id: "business_hours",
    priority: 96,
    aliases: ["horario", "horarios", "a que hora abren", "a qué hora abren", "abren domingos", "atienden hoy"],
    examples: ["qué horario manejan", "abren domingos"],
  },
  {
    id: "business_support",
    priority: 95,
    aliases: ["soporte tecnico", "soporte técnico", "arreglan equipos", "servicio tecnico", "servicio técnico", "contacto soporte"],
    examples: ["hacen soporte técnico", "arreglan equipos"],
  },
  {
    id: "returns_policy",
    priority: 94,
    aliases: ["devolucion", "devolución", "devoluciones", "cambios", "politica de cambios", "política de cambios"],
    examples: ["cómo funcionan las devoluciones", "política de cambios"],
  },
  {
    id: "shipping_policy",
    priority: 94,
    aliases: ["politica de envios", "política de envíos", "politica de envio", "política de envío", "como es el envio", "cómo es el envío"],
    examples: ["política de envíos", "cómo funciona el envío"],
  },
  {
    id: "warranty_policy",
    priority: 94,
    aliases: ["politica de garantia", "política de garantía", "garantia", "garantía", "que cubre la garantia", "qué cubre la garantía"],
    examples: ["política de garantía", "qué cubre la garantía"],
  },
  {
    id: "business_info",
    priority: 92,
    aliases: ["quienes son", "quiénes son", "informacion de la empresa", "información de la empresa", "sobre ustedes"],
    examples: ["quiénes son ustedes", "información de la empresa"],
  },
  {
    id: "human_advisor",
    priority: 100,
    aliases: ["asesor", "whatsapp", "humano", "agente", "hablar con alguien"],
    examples: ["quiero hablar con asesor", "me atiende un humano"],
  },
  {
    id: "payments",
    priority: 95,
    aliases: ["pago", "pagos", "tarjeta", "nequi", "daviplata", "addi", "sistecredito", "cuotas"],
    examples: ["reciben nequi?", "puedo pagar a cuotas?"],
  },
  {
    id: "shipping",
    priority: 90,
    aliases: ["envio", "envíos", "despacho", "domicilio", "entrega", "ciudad"],
    examples: ["como funcionan los envios", "hacen envios a cali"],
  },
  {
    id: "warranty",
    priority: 90,
    aliases: ["garantia", "garantias", "devolucion", "cambio", "soporte"],
    examples: ["como son las garantias", "como tramito garantia"],
  },
  {
    id: "cheap_options",
    priority: 85,
    aliases: ["barato", "barata", "economico", "baratica", "no tan caro", "mas barato", "más barato", "mas barata", "más barata", "económica"],
    examples: ["busco una cabina barata", "tienen guitarras economicas"],
  },
  {
    id: "premium_options",
    priority: 84,
    aliases: ["fino", "profesional", "de calidad", "bueno", "mas potente", "más potente", "gama alta"],
    examples: ["quiero algo fino", "dame algo profesional"],
  },
  {
    id: "product_comparison",
    priority: 82,
    aliases: ["comparar", "comparacion", "vs", "similar", "parecido", "otro parecido"],
    examples: ["comparame este con otro", "otro parecido"],
  },
  {
    id: "product_recommendation",
    priority: 80,
    aliases: ["recomienda", "recomiendas", "que me recomiendas", "que piano me recomiendas", "opcion para"],
    examples: ["que piano me recomiendas", "que cabina recomiendas para iglesia"],
  },
  {
    id: "product_search",
    priority: 75,
    aliases: ["quiero", "busco", "tienen", "que speakers tienes", "producto", "catalogo", "guitarra", "cabina", "speaker", "piano"],
    examples: ["quiero una guitarra", "que speakers tienes"],
  },
  {
    id: "unknown",
    priority: 1,
    aliases: [],
    examples: ["no se bien que quiero"],
  },
];
