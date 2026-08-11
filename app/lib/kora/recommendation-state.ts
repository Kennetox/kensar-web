import type { KoraProductFamily } from "./product-family-guards";

export type KoraRecommendationProduct = {
  id: number;
  slug: string;
  name: string;
  price: number | null;
  category_path: string | null;
  category_name: string | null;
  brand: string | null;
  score?: number | null;
};

export type KoraRecommendationConstraint = {
  dimension:
    | "price"
    | "power"
    | "size"
    | "brand"
    | "feature"
    | "use"
    | "portability"
    | "subtype"
    | "quality"
    | "input_count"
    | "connectivity"
    | "environment"
    | "experience"
    | "compatibility";
  value: string | number;
  mode: "prefer" | "require" | "exclude";
  evidence: string;
};

export type KoraRecommendationState = {
  schema_version: "kora-recommendation-v1";
  family: KoraProductFamily | null;
  base_query: string;
  active_constraints: KoraRecommendationConstraint[];
  shown_product_ids: number[];
  current_results: KoraRecommendationProduct[];
  selected_product_ids: number[];
  rejected_product_ids: number[];
  comparison_product_ids: number[];
  round: number;
};

export type KoraPostRecommendationOperation =
  | "more_options"
  | "refine"
  | "compare"
  | "select"
  | "reject"
  | "product_question"
  | "new_family"
  | "none";

export type KoraPostRecommendationInterpretation = {
  operation: KoraPostRecommendationOperation;
  confidence: number;
  referenced_product_ids: number[];
  detected_family: KoraProductFamily | null;
  constraints: KoraRecommendationConstraint[];
  rejection_reason: string | null;
  source: "rules";
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

function includesAny(text: string, values: string[]) {
  return values.some((value) => text.includes(normalize(value)));
}

const FAMILY_RULES: Array<[KoraProductFamily, string[]]> = [
  ["cabinas", ["cabina", "cabinas", "parlante", "parlantes", "bafle"]],
  ["guitarras", ["guitarra", "guitarras"]],
  ["microfonos", ["microfono", "microfonos"]],
  ["consolas", ["consola", "consolas", "mezcladora", "mixer"]],
  ["interfaces_audio", ["interfaz de audio", "interface de audio"]],
  ["teclados", ["teclado", "teclados", "piano", "organeta"]],
  ["seguridad", ["camara de seguridad", "camaras de seguridad", "dvr", "nvr"]],
  ["megafonos", ["megafono", "megafonos"]],
  ["amplificadores", ["amplificador", "amplificadores", "planta de sonido"]],
  ["procesamiento_audio", ["procesador de audio", "crossover", "ecualizador"]],
  ["percusion", ["bateria", "bongo", "conga", "timbal", "campana", "guiro", "maraca"]],
  ["instrumentos_cuerda", ["bajo electrico", "ukelele", "violin", "requinto"]],
  ["televisores", ["televisor", "televisores", "smart tv"]],
];

export function detectRecommendationFamily(query: string): KoraProductFamily | null {
  const text = normalize(query);
  return FAMILY_RULES.find(([, aliases]) => aliases.some((alias) => text.includes(normalize(alias))))?.[0] || null;
}

function ordinalIndex(text: string): number | null {
  const rules: Array<[number, string[]]> = [
    [0, ["primera", "primero", "la 1", "el 1", "numero 1"]],
    [1, ["segunda", "segundo", "la 2", "el 2", "numero 2"]],
    [2, ["tercera", "tercero", "la 3", "el 3", "numero 3"]],
    [3, ["cuarta", "cuarto", "la 4", "el 4", "numero 4"]],
    [4, ["quinta", "quinto", "la 5", "el 5", "numero 5"]],
  ];
  return rules.find(([, aliases]) => aliases.some((alias) => text.includes(alias)))?.[0] ?? null;
}

export function resolveRecommendationReferences(
  query: string,
  state: KoraRecommendationState
): number[] {
  const text = normalize(query);
  const resolved: number[] = [];
  const add = (id: number | undefined) => {
    if (id && !resolved.includes(id)) resolved.push(id);
  };

  const ordinal = ordinalIndex(text);
  if (ordinal !== null) add(state.current_results[ordinal]?.id);

  for (const product of state.current_results) {
    const name = normalize(product.name);
    const brand = normalize(product.brand || "");
    const meaningfulNameTokens = name.split(" ").filter((token) => token.length >= 4);
    if ((brand.length >= 3 && text.includes(brand)) || meaningfulNameTokens.filter((token) => text.includes(token)).length >= 2) {
      add(product.id);
    }
  }

  if (!resolved.length && /\b(esta|este|esa|ese|la que vimos|el que vimos)\b/.test(text)) {
    add(state.selected_product_ids.at(-1) || state.current_results[0]?.id);
  }
  return resolved;
}

function extractConstraints(query: string): KoraRecommendationConstraint[] {
  const text = normalize(query);
  const result: KoraRecommendationConstraint[] = [];
  const add = (constraint: KoraRecommendationConstraint) => {
    const current = result.findIndex((item) => item.dimension === constraint.dimension);
    if (current >= 0) result[current] = constraint;
    else result.push(constraint);
  };

  if (includesAny(text, ["mas barata", "mas barato", "economica", "economico", "menor precio", "muy cara", "muy caro", "muy costosa", "muy costoso"])) {
    add({ dimension: "price", value: "lower", mode: "prefer", evidence: query });
  } else if (includesAny(text, ["premium", "gama alta", "mejor calidad", "mas profesional", "profesional"])) {
    add({ dimension: "price", value: "premium", mode: "prefer", evidence: query });
    add({ dimension: "quality", value: "professional", mode: "prefer", evidence: query });
  }
  if (includesAny(text, ["mas potente", "potente", "que suene mas duro", "mejor bajo"])) {
    add({ dimension: "power", value: "higher", mode: "prefer", evidence: query });
  }
  if (includesAny(text, ["no tan pequena", "no tan pequeno", "ya no pequena", "ya no pequeno"])) {
    add({ dimension: "size", value: "medium", mode: "prefer", evidence: query });
  } else if (includesAny(text, ["mas pequena", "mas pequeno", "compacta", "compacto"])) {
    add({ dimension: "size", value: "smaller", mode: "prefer", evidence: query });
  } else if (includesAny(text, ["mas grande", "mayor tamano"])) {
    add({ dimension: "size", value: "larger", mode: "prefer", evidence: query });
  }
  if (includesAny(text, ["ya no portatil", "no necesito que sea portatil", "no importa transportarla"])) {
    add({ dimension: "portability", value: "not_important", mode: "exclude", evidence: query });
  } else if (includesAny(text, ["portatil", "liviana", "liviano", "facil de transportar", "facil de cargar"])) {
    add({ dimension: "portability", value: "important", mode: "prefer", evidence: query });
  }
  if (includesAny(text, ["bluetooth", "recargable", "inalambrico", "inalambrica"])) {
    const feature = ["bluetooth", "recargable", "inalambrico"].find((value) => text.includes(value));
    if (feature) add({ dimension: "feature", value: feature, mode: "require", evidence: query });
  }
  if (includesAny(text, ["mas entradas", "mas canales", "mayor cantidad de entradas"])) {
    add({ dimension: "input_count", value: "higher", mode: "prefer", evidence: query });
  }
  if (includesAny(text, ["para exterior", "aire libre", "afuera"])) {
    add({ dimension: "environment", value: "outdoor", mode: "require", evidence: query });
  } else if (includesAny(text, ["para interior", "adentro"])) {
    add({ dimension: "environment", value: "indoor", mode: "prefer", evidence: query });
  }
  if (includesAny(text, ["principiante", "para empezar", "estoy aprendiendo"])) {
    add({ dimension: "experience", value: "beginner", mode: "prefer", evidence: query });
  }
  const subtype = ["acustica", "clasica", "electrica", "electroacustica", "dinamico", "condensador", "activa", "pasiva"]
    .find((value) => text.includes(value));
  if (subtype) add({ dimension: "subtype", value: subtype, mode: "require", evidence: query });
  const brandMatch = text.match(/\b(?:marca|solo|de)\s+([a-z0-9]{3,20})\b/);
  if (brandMatch && !["una", "este", "esta", "esas", "esos", "otra", "otro"].includes(brandMatch[1])) {
    add({ dimension: "brand", value: brandMatch[1], mode: "prefer", evidence: query });
  }
  return result;
}

function detectRejectionReason(text: string): string | null {
  if (includesAny(text, ["muy caro", "muy cara", "precio", "costosa", "costoso"])) return "price";
  if (includesAny(text, ["muy grande", "pesada", "pesado", "tamano"])) return "size";
  if (includesAny(text, ["marca", "no conozco esa marca"])) return "brand";
  if (includesAny(text, ["no tiene", "le falta", "caracteristica"])) return "features";
  return null;
}

export function interpretPostRecommendationTurn(input: {
  query: string;
  state: KoraRecommendationState;
}): KoraPostRecommendationInterpretation {
  const text = normalize(input.query);
  const references = resolveRecommendationReferences(input.query, input.state);
  const detectedFamily = detectRecommendationFamily(input.query);
  const constraints = extractConstraints(input.query);
  if (includesAny(text, ["otra marca", "marca diferente"])) {
    const brands = Array.from(new Set(input.state.current_results.map((item) => item.brand).filter(Boolean))) as string[];
    if (brands.length) constraints.push({ dimension: "brand", value: brands.join(","), mode: "exclude", evidence: input.query });
  }
  const changedFamily = Boolean(detectedFamily && detectedFamily !== input.state.family);
  const adjustsReferencedProduct = references.length > 0 && constraints.length > 0 && /\b(pero|parecido|similar|como)\b/.test(text);

  let operation: KoraPostRecommendationOperation = "none";
  let confidence = 0.35;
  if (changedFamily && includesAny(text, ["ahora", "mejor", "tambien", "quiero", "busco", "necesito", "muestrame"])) {
    operation = "new_family";
    confidence = 0.97;
  } else if (/\b(compara|comparame|comparar|diferencia|versus| vs |cual es mejor|cual me conviene|con cual me quedo)\b/.test(` ${text} `)) {
    operation = "compare";
    confidence = references.length >= 2 ? 0.98 : 0.82;
  } else if (adjustsReferencedProduct) {
    operation = "refine";
    confidence = 0.96;
  } else if (/\b(me gusta|me quedo con|quiero esa|quiero ese|elijo|prefiero|agrega|anade|comprar)\b/.test(text)) {
    operation = "select";
    confidence = references.length ? 0.96 : 0.75;
  } else if (/\b(ninguna|ninguno|no me gusta|no me sirven|no me convencen|descarto)\b/.test(text)) {
    operation = "reject";
    confidence = 0.96;
  } else if (includesAny(text, ["otras opciones", "otros modelos", "muestrame otras", "muestra otras", "dame otras", "hay otras", "que mas tienes", "alguna otra", "otra opcion"])) {
    operation = "more_options";
    confidence = 0.97;
  } else if (references.length && /\b(tiene|trae|sirve|funciona|conecta|compatible|garantia|material|pesa|mide|incluye|necesito)\b/.test(text)) {
    operation = "product_question";
    confidence = 0.9;
  } else if (constraints.length) {
    operation = "refine";
    confidence = 0.9;
  }

  return {
    operation,
    confidence,
    referenced_product_ids: references,
    detected_family: detectedFamily,
    constraints,
    rejection_reason: detectRejectionReason(text),
    source: "rules",
  };
}

export function mergeRecommendationConstraints(
  current: KoraRecommendationConstraint[],
  updates: KoraRecommendationConstraint[]
): KoraRecommendationConstraint[] {
  const merged = new Map(current.map((item) => [item.dimension, item]));
  updates.forEach((item) => merged.set(item.dimension, item));
  return Array.from(merged.values()).slice(0, 12);
}

export function sanitizeRecommendationState(value: unknown): KoraRecommendationState | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<KoraRecommendationState>;
  if (raw.schema_version !== "kora-recommendation-v1") return null;
  const cleanProducts = (items: unknown): KoraRecommendationProduct[] =>
    Array.isArray(items)
      ? items
          .slice(0, 8)
          .map((item) => item as Partial<KoraRecommendationProduct>)
          .filter((item) => Number(item.id) > 0 && typeof item.slug === "string" && typeof item.name === "string")
          .map((item) => ({
            id: Number(item.id),
            slug: String(item.slug),
            name: String(item.name),
            price: Number.isFinite(Number(item.price)) ? Number(item.price) : null,
            category_path: typeof item.category_path === "string" ? item.category_path : null,
            category_name: typeof item.category_name === "string" ? item.category_name : null,
            brand: typeof item.brand === "string" ? item.brand : null,
            score: Number.isFinite(Number(item.score)) ? Number(item.score) : null,
          }))
      : [];
  const ids = (items: unknown, limit: number) =>
    Array.isArray(items) ? Array.from(new Set(items.map(Number).filter((id) => Number.isInteger(id) && id > 0))).slice(-limit) : [];
  return {
    schema_version: "kora-recommendation-v1",
    family: raw.family || null,
    base_query: typeof raw.base_query === "string" ? raw.base_query.slice(0, 500) : "",
    active_constraints: Array.isArray(raw.active_constraints) ? raw.active_constraints.slice(0, 12) : [],
    shown_product_ids: ids(raw.shown_product_ids, 60),
    current_results: cleanProducts(raw.current_results),
    selected_product_ids: ids(raw.selected_product_ids, 8),
    rejected_product_ids: ids(raw.rejected_product_ids, 30),
    comparison_product_ids: ids(raw.comparison_product_ids, 5),
    round: Math.max(1, Math.min(Number(raw.round) || 1, 50)),
  };
}
