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
  | "unknown";

export type KoraIntentDefinition = {
  id: KoraIntentId;
  priority: number;
  aliases: string[];
  examples: string[];
};

export const KORA_INTENTS: KoraIntentDefinition[] = [
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
