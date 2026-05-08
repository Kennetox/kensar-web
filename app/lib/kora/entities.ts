import { KORA_INTENTS, type KoraIntentDefinition, type KoraIntentId } from "./intents";

export type KoraAttribute = "cheap" | "premium" | "high_output_bass" | "bluetooth" | "rechargeable";
export type KoraUsageContext = "iglesia" | "fiesta_evento" | "negocio" | "principiante" | "estudio";
export type KoraFollowupType = "cheaper" | "more_powerful" | "similar" | null;

export type KoraNluResult = {
  normalized_text: string;
  intent: KoraIntentId;
  category: string | null;
  attributes: KoraAttribute[];
  usage_context: KoraUsageContext | null;
  budget: number | null;
  followup_type: KoraFollowupType;
  confidence: number;
  matched_aliases: string[];
};

const CATEGORY_ALIASES: Array<{ category: string; aliases: string[] }> = [
  { category: "instrumentos", aliases: ["guitarra", "guitarras", "piano", "teclado", "bateria", "batería", "instrumento"] },
  { category: "audio-profesional", aliases: ["cabina", "cabinas", "speaker", "speakers", "parlante", "bafle", "sonido"] },
  { category: "accesorios", aliases: ["accesorio", "cable", "soporte", "adaptador"] },
  { category: "camaras", aliases: ["camara", "cámara", "cctv", "vigilancia"] },
];

const ATTRIBUTE_ALIASES: Array<{ attribute: KoraAttribute; aliases: string[] }> = [
  { attribute: "cheap", aliases: ["barato", "barata", "económico", "economico", "baratica", "no tan caro"] },
  { attribute: "premium", aliases: ["fino", "profesional", "de calidad", "bueno"] },
  { attribute: "high_output_bass", aliases: ["que suene duro", "que suene más duro", "que suene mas duro", "potente", "con buen bajo", "duro"] },
  { attribute: "bluetooth", aliases: ["bluetooth", "inalambrico", "inalámbrico"] },
  { attribute: "rechargeable", aliases: ["recargable", "bateria", "batería"] },
];

const USAGE_CONTEXT_ALIASES: Array<{ usage: KoraUsageContext; aliases: string[] }> = [
  { usage: "iglesia", aliases: ["iglesia", "culto", "templo"] },
  { usage: "fiesta_evento", aliases: ["fiesta", "rumba", "reunion", "reunión", "evento"] },
  { usage: "negocio", aliases: ["negocio", "local", "bar", "restaurante"] },
  { usage: "principiante", aliases: ["principiante", "empezar", "aprender", "inicio"] },
  { usage: "estudio", aliases: ["estudio", "podcast", "grabacion", "grabación"] },
];

const FOLLOWUP_ALIASES: Array<{ type: Exclude<KoraFollowupType, null>; aliases: string[] }> = [
  { type: "cheaper", aliases: ["más barato", "mas barato", "más barata", "mas barata", "más económica", "mas economica", "mas económica"] },
  { type: "more_powerful", aliases: ["más potente", "mas potente", "que suene más duro", "que suene mas duro"] },
  { type: "similar", aliases: ["otro parecido", "similar", "parecido"] },
];

function normalize(value: string) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿?¡!.,;:()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findFirstAlias(text: string, aliases: string[]): string | null {
  for (const alias of aliases) {
    if (!alias) continue;
    const probe = normalize(alias);
    if (probe && text.includes(probe)) return alias;
  }
  return null;
}

function detectBudget(normalizedText: string): number | null {
  const milMatch = normalizedText.match(/(?:hasta|max(?:imo)?)\s+(\d{1,4})\s*mil\b/);
  if (milMatch) return Number.parseInt(milMatch[1], 10) * 1000;

  const rawMatch = normalizedText.match(/(?:hasta|max(?:imo)?)\s+\$?\s*([\d\.\,]{4,12})/);
  if (!rawMatch) return null;
  const digits = rawMatch[1].replace(/[^\d]/g, "");
  if (!digits) return null;
  const parsed = Number.parseInt(digits, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function detectIntent(text: string): { intent: KoraIntentId; matched: string[]; confidence: number } {
  let bestIntent: KoraIntentDefinition | null = null;
  let bestMatchCount = 0;
  let bestMatchedAliases: string[] = [];

  for (const intentDef of KORA_INTENTS) {
    if (intentDef.id === "unknown") continue;
    const matched: string[] = [];
    for (const alias of intentDef.aliases) {
      const probe = normalize(alias);
      if (probe && text.includes(probe)) matched.push(alias);
    }
    if (!matched.length) continue;
    if (
      !bestIntent ||
      intentDef.priority > bestIntent.priority ||
      (intentDef.priority === bestIntent.priority && matched.length > bestMatchCount)
    ) {
      bestIntent = intentDef;
      bestMatchCount = matched.length;
      bestMatchedAliases = matched;
    }
  }

  if (!bestIntent) {
    return { intent: "unknown", matched: [], confidence: 0.24 };
  }

  const confidence = Math.min(0.95, 0.55 + bestIntent.priority / 250 + bestMatchCount * 0.06);
  return { intent: bestIntent.id, matched: bestMatchedAliases, confidence };
}

export function extractKoraEntities(input: string): KoraNluResult {
  const normalizedText = normalize(input);
  const { intent, matched, confidence: intentConfidence } = detectIntent(normalizedText);

  let category: string | null = null;
  const categoryMatches: string[] = [];
  for (const row of CATEGORY_ALIASES) {
    const hit = findFirstAlias(normalizedText, row.aliases);
    if (hit) {
      category = row.category;
      categoryMatches.push(hit);
      break;
    }
  }

  const attributes: KoraAttribute[] = [];
  const attributeMatches: string[] = [];
  for (const row of ATTRIBUTE_ALIASES) {
    const hit = findFirstAlias(normalizedText, row.aliases);
    if (!hit) continue;
    attributes.push(row.attribute);
    attributeMatches.push(hit);
  }

  let usageContext: KoraUsageContext | null = null;
  const usageMatches: string[] = [];
  for (const row of USAGE_CONTEXT_ALIASES) {
    const hit = findFirstAlias(normalizedText, row.aliases);
    if (hit) {
      usageContext = row.usage;
      usageMatches.push(hit);
      break;
    }
  }

  let followupType: KoraFollowupType = null;
  const followupMatches: string[] = [];
  for (const row of FOLLOWUP_ALIASES) {
    const hit = findFirstAlias(normalizedText, row.aliases);
    if (hit) {
      followupType = row.type;
      followupMatches.push(hit);
      break;
    }
  }

  const budget = detectBudget(normalizedText);
  const matches = [...matched, ...categoryMatches, ...attributeMatches, ...usageMatches, ...followupMatches];
  let confidence = intentConfidence;
  if (category) confidence += 0.06;
  if (attributes.length) confidence += Math.min(0.14, attributes.length * 0.05);
  if (usageContext) confidence += 0.06;
  if (followupType) confidence += 0.05;
  if (budget !== null) confidence += 0.05;

  return {
    normalized_text: normalizedText,
    intent,
    category,
    attributes,
    usage_context: usageContext,
    budget,
    followup_type: followupType,
    confidence: Math.min(0.98, Number(confidence.toFixed(3))),
    matched_aliases: Array.from(new Set(matches)),
  };
}
