import { getCatalogProduct, getCatalogProducts, formatCatalogPrice, type WebCatalogProductCard } from "@/app/lib/metrikCatalog";
import { normalizeKoraCatalogQuery } from "./query-normalizer";
import type { KoraNluResult } from "./entities";
import {
  productMatchesExplicitConstraints,
  productMatchesRequestedFamilies,
  type KoraProductFamily,
} from "./product-family-guards";
import {
  buildProductKnowledgeProfile,
  isKnowledgeSafeForRecommendation,
  type ProductKnowledgeProfile,
} from "./product-knowledge";
import {
  buildSalesRecommendationNarrative,
  knowledgeFitScore,
  productMeetsKnowledgeConstraints,
} from "./sales-advisor";
import {
  mergeRecommendationConstraints,
  type KoraPostRecommendationInterpretation,
  type KoraRecommendationState,
} from "./recommendation-state";

type RecommenderMemory = {
  preferred_category?: string | null;
  budget_cop?: number | null;
  last_query?: string | null;
  last_recommended_products?: Array<{
    id: number;
    slug: string;
    name: string;
    price: number | null;
    category_path: string | null;
    category_name: string | null;
    brand: string | null;
    score?: number | null;
  }>;
  last_recommendation_query?: string | null;
  last_recommendation_category?: string | null;
  last_recommendation_attributes?: string[];
  last_usage_context?: string | null;
  last_recommendation_type?: string | null;
  recommendation_state?: KoraRecommendationState | null;
};

type RecommenderAction = {
  id: string;
  label: string;
  type: "command" | "link" | "whatsapp" | "prompt" | "add_to_cart";
  value: string;
  icon?: string;
};

type ProductReason =
  | "opcion_economica"
  | "precio_visible"
  | "categoria_relacionada"
  | "incluye_bluetooth"
  | "incluye_recargable"
  | "perfil_profesional"
  | "relacion_seguridad"
  | "relacion_sonido_potente"
  | "conocimiento_clasificado";

export type KoraRecommenderResponse = {
  handled: boolean;
  intent: "products";
  answer: string;
  actions: RecommenderAction[];
  suggestions: string[];
  confidence_score: number;
  resolution_kind: "direct" | "disambiguation" | "fallback";
  memory_updates?: {
    preferred_category?: string | null;
    budget_cop?: number | null;
    last_query?: string | null;
  };
  memory_patch?: {
    last_recommended_products?: Array<{
      id: number;
      slug: string;
      name: string;
      price: number | null;
      category_path: string | null;
      category_name: string | null;
      brand: string | null;
      score?: number | null;
    }>;
    last_recommendation_query?: string | null;
    last_recommendation_category?: string | null;
    last_recommendation_attributes?: string[];
    last_usage_context?: string | null;
    last_recommendation_type?: string | null;
    recommendation_state?: KoraRecommendationState | null;
  };
  recommendation_debug?: {
    normalized_query: string;
    applied_aliases: string[];
    expanded_queries: string[];
    selected_category_paths: string[];
    product_scores: Array<{ id: number; slug: string; score: number }>;
    product_knowledge?: Array<{
      id: number;
      family: string;
      role: string;
      subtype: string | null;
      coverage_score: number;
      review_flags: string[];
      sales_facts?: string[];
    }>;
  };
  product_cards?: Array<{
    id: number;
    slug: string;
    name: string;
    price: number | null;
    price_mode: string | null;
    brand: string | null;
    category_name: string | null;
    image_url: string | null;
    reason: string | null;
    url: string;
  }>;
};

const MAX_FETCH = 12;
const HIGH_OUTPUT_TOKENS = ["watts", "w", "rms", "12", "15", "activa", "subwoofer", "bajo", "bass", "potencia", "potente"];

type CategoryMapRule = {
  aliases: string[];
  categories: string[];
  family: KoraProductFamily;
};

const CATEGORY_MAP: CategoryMapRule[] = [
  { aliases: ["amplificador", "amplificadores", "planta de sonido", "preamplificador"], categories: ["amplificadores"], family: "amplificadores" },
  { aliases: ["cabina", "cabinas", "speaker", "speakers", "sonido duro", "potente"], categories: ["cabinas-activas", "sonido"], family: "cabinas" },
  { aliases: ["consola", "consolas", "mezclador", "mixer"], categories: ["consolas"], family: "consolas" },
  { aliases: ["interfaz de audio", "interface de audio"], categories: ["produccion-de-audio"], family: "interfaces_audio" },
  { aliases: ["bajo electrico", "requinto", "ukelele", "violin"], categories: ["instrumentos-de-cuerda"], family: "instrumentos_cuerda" },
  { aliases: ["megafono", "megafonos"], categories: ["megafonos"], family: "megafonos" },
  { aliases: ["microfono", "microfonos", "micrófono", "micrófonos"], categories: ["microfonos"], family: "microfonos" },
  { aliases: ["bateria", "bongo", "campana", "conga", "timbal", "guiro", "maraca", "percusion"], categories: ["percusion", "instrumentos-salseros"], family: "percusion" },
  { aliases: ["ecualizador", "crossover", "procesador de audio"], categories: ["consolas", "produccion-de-audio"], family: "procesamiento_audio" },
  { aliases: ["guitarra", "guitarras"], categories: ["instrumentos-de-cuerda", "instrumentos-musicales"], family: "guitarras" },
  { aliases: ["teclado", "piano", "pianos"], categories: ["teclados", "instrumentos-musicales"], family: "teclados" },
  { aliases: ["camara", "cámara", "seguridad", "camaras wifi"], categories: ["camaras-de-seguridad"], family: "seguridad" },
  { aliases: ["solar", "luz solar", "reflector solar"], categories: ["luz-solar"], family: "solar" },
  { aliases: ["televisor", "tv", "base tv"], categories: ["televisores", "hogar-y-entretenimiento"], family: "televisores" },
  { aliases: ["hdmi", "cable hdmi"], categories: ["cables-hdmi"], family: "hdmi" },
  { aliases: ["rca", "cable rca"], categories: ["cables-rca"], family: "rca" },
  { aliases: ["cable red", "red", "ethernet", "cat 6"], categories: ["cables-de-red"], family: "red" },
  { aliases: ["xlr", "canon", "cable microfono"], categories: ["cables-y-accesorios", "audio-profesional"], family: "xlr" },
];

const MAIN_PRODUCT_QUERY_GUARDS: Record<Exclude<CategoryMapRule["family"], "hdmi" | "rca" | "red" | "xlr">, string[]> = {
  amplificadores: ["amplificador", "planta", "preamplificador"],
  cabinas: ["cabina", "parlante", "bafle", "speaker", "sonido"],
  consolas: ["consola", "mezclador", "mixer"],
  interfaces_audio: ["interfaz", "interface"],
  instrumentos_cuerda: ["bajo electrico", "requinto", "ukelele", "violin"],
  megafonos: ["megafono"],
  microfonos: ["microfono", "micro", "inalambrico"],
  percusion: ["bateria", "bongo", "campana", "conga", "timbal", "guiro", "maraca"],
  procesamiento_audio: ["ecualizador", "crossover", "procesador"],
  guitarras: ["guitarra", "electroacustica", "acustica", "electrica"],
  teclados: ["teclado", "piano", "organeta"],
  seguridad: ["camara", "cctv", "seguridad", "vigilancia"],
  solar: ["solar", "reflector", "panel"],
  televisores: ["televisor", "tv", "smart"],
};

function normalize(value: string) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿?¡!.,;:()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectBudget(text: string, fallback?: number | null): number | null {
  const normalized = normalize(text);
  const milMatch = normalized.match(/(?:hasta|max(?:imo)?)\s+(\d{1,4})\s*mil\b/);
  if (milMatch) return Number.parseInt(milMatch[1], 10) * 1000;
  const rawMatch = normalized.match(/(?:hasta|max(?:imo)?)\s+\$?\s*([\d\.\,]{4,12})/);
  if (!rawMatch) return fallback ?? null;
  const digits = rawMatch[1].replace(/[^\d]/g, "");
  if (!digits) return fallback ?? null;
  const value = Number.parseInt(digits, 10);
  return Number.isFinite(value) ? value : fallback ?? null;
}

function parseTerms(value: string) {
  return normalize(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function detectCategoryHints(query: string, nlu: KoraNluResult | null, preferredCategory?: string | null) {
  const normalized = normalize(query);
  const candidateCategories = new Set<string>();
  const families = new Set<CategoryMapRule["family"]>();
  if (preferredCategory) candidateCategories.add(normalize(preferredCategory));
  if (nlu?.category) candidateCategories.add(normalize(nlu.category));

  for (const row of CATEGORY_MAP) {
    if (!row.aliases.some((alias) => normalized.includes(normalize(alias)))) continue;
    row.categories.forEach((category) => candidateCategories.add(normalize(category)));
    families.add(row.family);
  }

  return {
    categories: Array.from(candidateCategories).filter(Boolean),
    families: Array.from(families),
  };
}

function isAccessoryCategory(path: string) {
  const normalized = normalize(path);
  return normalized.includes("cable") || normalized.includes("accesorio");
}

function hasMainProductSignal(normalizedQuery: string, families: string[]) {
  for (const family of families) {
    if (!(family in MAIN_PRODUCT_QUERY_GUARDS)) continue;
    const tokens = MAIN_PRODUCT_QUERY_GUARDS[family as keyof typeof MAIN_PRODUCT_QUERY_GUARDS];
    if (tokens.some((token) => normalizedQuery.includes(token))) return true;
  }
  return false;
}

function hasMainProductHintInText(text: string, families: string[]) {
  for (const family of families) {
    if (!(family in MAIN_PRODUCT_QUERY_GUARDS)) continue;
    const tokens = MAIN_PRODUCT_QUERY_GUARDS[family as keyof typeof MAIN_PRODUCT_QUERY_GUARDS];
    if (tokens.some((token) => text.includes(token))) return true;
  }
  return false;
}

function scoreProduct(
  product: WebCatalogProductCard,
  knowledge: ProductKnowledgeProfile,
  normalizedQuery: string,
  categories: string[],
  families: string[],
  nlu: KoraNluResult | null
) {
  const terms = parseTerms(normalizedQuery);
  const name = normalize(product.name || "");
  const categoryText = normalize(`${product.category_path || ""} ${product.category_name || ""}`);
  const brand = normalize(product.brand || "");
  const desc = normalize(`${product.short_description || ""} ${product.long_description || ""}`);
  const fullText = `${name} ${categoryText} ${brand} ${desc}`;
  const reasons: ProductReason[] = [];
  let score = 0;

  if (terms.some((term) => name.includes(term))) score += 40;
  if (categories.some((category) => categoryText.includes(category))) {
    score += 25;
    reasons.push("categoria_relacionada");
  }
  if (terms.some((term) => brand.includes(term))) score += 10;
  if (terms.some((term) => desc.includes(term))) score += 15;
  if (product.price_mode === "visible" && product.price !== null) {
    score += 10;
    reasons.push("precio_visible");
  } else {
    score -= 5;
  }
  if (product.image_url || product.image_thumb_url || (Array.isArray(product.gallery) && product.gallery.length > 0)) score += 5;
  if (product.featured) score += 5;
  if (product.stock_status === "in_stock") score += 5;
  if (product.stock_status === "out_of_stock") score -= 2;

  if (nlu?.attributes.includes("high_output_bass") && HIGH_OUTPUT_TOKENS.some((token) => fullText.includes(token))) {
    score += 14;
    reasons.push("relacion_sonido_potente");
  }
  if (nlu?.attributes.includes("bluetooth") && fullText.includes("bluetooth")) {
    score += 12;
    reasons.push("incluye_bluetooth");
  }
  if (nlu?.attributes.includes("rechargeable") && (fullText.includes("recargable") || fullText.includes("bateria"))) {
    score += 12;
    reasons.push("incluye_recargable");
  }
  if (nlu?.attributes.includes("premium")) {
    if (brand) score += 5;
    if (product.long_description && product.long_description.length > 80) {
      score += 5;
      reasons.push("perfil_profesional");
    }
  }
  if (families.includes("seguridad") && categoryText.includes("camaras-de-seguridad")) reasons.push("relacion_seguridad");
  if (
    families.includes(knowledge.classification.family.value as KoraProductFamily) &&
    knowledge.classification.role.value === "main_product"
  ) {
    score += 12;
    reasons.push("conocimiento_clasificado");
  }
  if (knowledge.coverage_score >= 60) score += 4;
  score += knowledgeFitScore(knowledge, normalizedQuery);

  const requestMainProduct =
    families.includes("cabinas") || families.includes("guitarras") || families.includes("teclados") || families.includes("microfonos");
  const queryRequestsMainProduct = requestMainProduct && hasMainProductSignal(normalizedQuery, families);
  if (queryRequestsMainProduct && isAccessoryCategory(product.category_path || "")) score -= 28;
  if (queryRequestsMainProduct && !isAccessoryCategory(product.category_path || "")) {
    if (hasMainProductHintInText(`${name} ${categoryText}`, families)) score += 8;
  }

  return { score, reasons };
}

function applyAttributeOrdering(
  rows: Array<{ product: WebCatalogProductCard; score: number; reasons: ProductReason[] }>,
  nlu: KoraNluResult | null
) {
  const priced = rows.filter((row) => typeof row.product.price === "number");
  const maxPrice = Math.max(...priced.map((row) => row.product.price as number), 1);
  const minPrice = Math.min(...priced.map((row) => row.product.price as number), maxPrice);
  const range = Math.max(maxPrice - minPrice, 1);

  return rows
    .map((row) => {
      let score = row.score;
      const reasons = [...row.reasons];
      if (nlu?.attributes.includes("cheap") && typeof row.product.price === "number") {
        const relative = ((row.product.price as number) - minPrice) / range;
        score += (1 - relative) * 12;
        reasons.push("opcion_economica");
      }
      if (nlu?.attributes.includes("premium") && typeof row.product.price === "number") {
        const relative = ((row.product.price as number) - minPrice) / range;
        score += relative * 10;
      }
      return { ...row, score, reasons };
    })
    .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name));
}

function reasonToPhrase(reason: ProductReason): string {
  if (reason === "opcion_economica") return "opción económica";
  if (reason === "precio_visible") return "buena opción por precio";
  if (reason === "categoria_relacionada") return "relacionada con la categoría que pediste";
  if (reason === "incluye_bluetooth") return "incluye bluetooth según descripción";
  if (reason === "incluye_recargable") return "incluye recargable/batería según descripción";
  if (reason === "perfil_profesional") return "más orientada a uso profesional";
  if (reason === "relacion_seguridad") return "relacionada con cámaras de seguridad";
  if (reason === "conocimiento_clasificado") return "identificada como producto principal de la familia solicitada";
  return "relacionada con potencia y buen bajo";
}

function buildIntentLead(nlu: KoraNluResult | null, normalizedQuery: string) {
  const context = nlu?.usage_context;
  if (nlu?.intent === "cheap_options") {
    return "Te organicé algunas opciones empezando por las más económicas que encontré.";
  }
  if (nlu?.intent === "premium_options") {
    return "Te muestro opciones más orientadas a calidad/profesional, según nombre, categoría y descripción.";
  }
  if (nlu?.attributes.includes("high_output_bass")) {
    return "Busqué opciones relacionadas con cabinas activas, potencia y buen bajo. Si me dices si es para casa, fiesta o negocio, puedo afinar más.";
  }
  if (nlu?.intent === "product_search" || nlu?.intent === "product_recommendation") {
    const q = normalizedQuery.includes("guitarra")
      ? "guitarras"
      : normalizedQuery.includes("teclado")
        ? "teclados"
        : normalizedQuery.includes("microfono")
          ? "micrófonos"
          : normalizedQuery.includes("camara")
            ? "cámaras de seguridad"
            : "tu búsqueda";
    return `Te muestro algunas opciones relacionadas con ${q} que tenemos publicadas.`;
  }
  if (context) {
    return "Encontré opciones relacionadas, pero para recomendarte mejor dime si lo quieres para casa, negocio, iglesia o evento.";
  }
  return "Te muestro algunas opciones reales que tenemos publicadas.";
}

function applyUsageContextScore(
  row: { product: WebCatalogProductCard; score: number; reasons: ProductReason[] },
  usage: KoraNluResult["usage_context"]
) {
  if (!usage) return row;
  const text = normalize(`${row.product.name} ${row.product.category_path || ""} ${row.product.long_description || ""}`);
  let score = row.score;
  if (usage === "iglesia") {
    if (text.includes("microfono") || text.includes("cabina") || text.includes("consola") || text.includes("mezcl")) score += 8;
  }
  if (usage === "fiesta_evento") {
    if (text.includes("cabina") || text.includes("activa") || text.includes("12") || text.includes("15") || text.includes("potencia")) score += 10;
  }
  if (usage === "negocio") {
    if (text.includes("cabina") || text.includes("microfono") || text.includes("amplificador")) score += 6;
  }
  if (usage === "principiante") {
    if (typeof row.product.price === "number" && row.product.price < 600000) score += 7;
    if (text.includes("inicio") || text.includes("aprend")) score += 4;
  }
  if (usage === "estudio") {
    if (text.includes("studio") || text.includes("microfono") || text.includes("monitor") || text.includes("interface")) score += 9;
  }
  return { ...row, score };
}

async function searchCatalog(q: string, category?: string, page = 1) {
  return getCatalogProducts({
    q: q || undefined,
    category: category || undefined,
    page,
    page_size: MAX_FETCH,
  }).catch(() => null);
}

async function getCatalogProductForKnowledge(slug: string) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      getCatalogProduct(slug).catch(() => null),
      new Promise<null>((resolve) => {
        timeout = setTimeout(() => resolve(null), 2500);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function stripReplacedConstraintTerms(query: string, dimensions: Set<string>) {
  let result = normalize(query);
  const patterns: Partial<Record<string, RegExp>> = {
    price: /\b(barat[oa]s?|economic[oa]s?|premium|gama alta|precio|costos[oa]s?)\b/g,
    power: /\b(potente|potencia|suene duro|buen bajo)\b/g,
    size: /\b(pequen[oa]s?|median[oa]s?|grandes?|compact[oa]s?)\b/g,
    portability: /\b(portatil|livian[oa]s?|transportar|cargar)\b/g,
    subtype: /\b(acustica|clasica|electrica|electroacustica|dinamico|condensador|activa|pasiva)\b/g,
    quality: /\b(profesional|premium|gama alta|calidad)\b/g,
  };
  dimensions.forEach((dimension) => {
    const pattern = patterns[dimension];
    if (pattern) result = result.replace(pattern, " ");
  });
  return result.replace(/\s+/g, " ").trim();
}

function constraintToSearchText(constraint: KoraRecommendationState["active_constraints"][number]) {
  if (constraint.mode === "exclude") return "";
  const values: Partial<Record<typeof constraint.dimension, Record<string, string>>> = {
    price: { lower: "economico", premium: "premium profesional" },
    power: { higher: "potente buen bajo" },
    size: { smaller: "compacto pequeno", medium: "mediano", larger: "grande" },
    portability: { important: "portatil liviano" },
    quality: { professional: "profesional" },
    input_count: { higher: "mas entradas mas canales" },
    environment: { outdoor: "exterior aire libre", indoor: "interior" },
    experience: { beginner: "principiante" },
  };
  const mapped = values[constraint.dimension]?.[String(constraint.value)];
  if (mapped) return mapped;
  if (constraint.dimension === "brand" || constraint.dimension === "feature" || constraint.dimension === "subtype" || constraint.dimension === "use") {
    return String(constraint.value);
  }
  return constraint.evidence;
}

export async function resolveKoraCatalogRecommendation(input: {
  query: string;
  nlu: KoraNluResult | null;
  memory?: RecommenderMemory;
  postRecommendation?: KoraPostRecommendationInterpretation | null;
}): Promise<KoraRecommenderResponse | null> {
  const postOperation = input.postRecommendation?.operation;
  const isPostFollowup = postOperation === "more_options" || postOperation === "refine" || postOperation === "reject";
  const isFollowup = isPostFollowup || input.nlu?.followup_type === "cheaper" || input.nlu?.followup_type === "more_powerful" || input.nlu?.followup_type === "similar";
  const priorState = input.memory?.recommendation_state || null;
  const activeConstraints = mergeRecommendationConstraints(
    priorState?.active_constraints || [],
    input.postRecommendation?.constraints || []
  );
  const updatedDimensions = new Set((input.postRecommendation?.constraints || []).map((constraint) => constraint.dimension));
  const rawRememberedBase = priorState?.base_query || input.memory?.last_recommendation_query || input.memory?.last_query || "";
  const rememberedBase = stripReplacedConstraintTerms(rawRememberedBase, updatedDimensions);
  const constraintQuery = activeConstraints.map(constraintToSearchText).filter(Boolean).join(" ");
  const anchorQuery = priorState?.current_results
    .filter((product) => input.postRecommendation?.referenced_product_ids.includes(product.id))
    .map((product) => product.name)
    .join(" ") || "";
  const baseQuery = isPostFollowup
    ? `${rememberedBase} ${anchorQuery} ${constraintQuery}`.trim()
    : isFollowup && rememberedBase
      ? `${rememberedBase} ${input.query}`
      : input.query;
  const { normalizedQuery, expandedQueries, appliedAliases } = normalizeKoraCatalogQuery(baseQuery);
  const budget = detectBudget(input.query, input.memory?.budget_cop ?? null);
  const hints = detectCategoryHints(
    normalizedQuery,
    input.nlu,
    input.memory?.last_recommendation_category || input.memory?.preferred_category || null
  );
  const intent = input.nlu?.intent || "unknown";
  const productIntent =
    intent === "product_search" ||
    intent === "product_recommendation" ||
    intent === "cheap_options" ||
    intent === "premium_options" ||
    input.nlu?.followup_type === "cheaper" ||
    input.nlu?.followup_type === "more_powerful" ||
    input.nlu?.followup_type === "similar";
  if (!productIntent) return null;

  const seen = new Map<number, WebCatalogProductCard>();
  const primary = await searchCatalog(normalizedQuery);
  (primary?.items || []).forEach((item) => seen.set(item.id, item));

  if (seen.size < 3) {
    for (const expanded of expandedQueries.slice(0, 5)) {
      const result = await searchCatalog(expanded);
      for (const item of result?.items || []) seen.set(item.id, item);
      if (seen.size >= 12) break;
    }
  }

  if (seen.size < 5 && hints.categories.length) {
    for (const category of hints.categories.slice(0, 2)) {
      const result = await searchCatalog(normalizedQuery, category);
      for (const item of result?.items || []) seen.set(item.id, item);
      if (seen.size >= 12) break;
    }
  }

  if (isPostFollowup && hints.categories.length) {
    const broaderPages = await Promise.all(
      hints.categories.slice(0, 2).flatMap((category) => [1, 2].map((page) => searchCatalog("", category, page)))
    );
    broaderPages.forEach((result) => {
      for (const item of result?.items || []) seen.set(item.id, item);
    });
  }

  const all = Array.from(seen.values());
  const familyCandidates = all.filter(
    (item) =>
      productMatchesRequestedFamilies(item, hints.families) &&
      productMatchesExplicitConstraints(item, normalizedQuery, hints.families)
  );
  const detailsById = new Map(
    await Promise.all(
      familyCandidates.map(async (item) => [item.id, await getCatalogProductForKnowledge(item.slug)] as const)
    )
  );
  const knowledgeById = new Map(
    familyCandidates.map((item) => {
      const detail = detailsById.get(item.id);
      return [
        item.id,
        buildProductKnowledgeProfile({
          id: item.id,
          slug: item.slug,
          sku: item.sku,
          name: detail?.name || item.name,
          category_path: detail?.category_path || item.category_path,
          category_name: detail?.category_name || item.category_name,
          short_description: detail?.short_description || item.short_description,
          long_description: detail?.long_description || item.long_description,
          specs: detail?.specs || null,
          service: detail?.stock_status === "service" || item.stock_status === "service",
        }),
      ] as const;
    })
  );
  const familySafe = familyCandidates.filter((item) => {
    const knowledge = knowledgeById.get(item.id);
    return Boolean(
      knowledge &&
        isKnowledgeSafeForRecommendation(knowledge, hints.families) &&
        productMeetsKnowledgeConstraints(knowledge, normalizedQuery)
    );
  });
  const filteredByBudget = budget ? familySafe.filter((item) => item.price === null || item.price <= budget) : familySafe;
  const previousIds = new Set([
    ...(input.memory?.last_recommended_products || []).map((item) => item.id),
    ...(priorState?.shown_product_ids || []),
    ...(priorState?.rejected_product_ids || []),
  ]);
  let rows = filteredByBudget.map((product) => {
    const knowledge = knowledgeById.get(product.id) as ProductKnowledgeProfile;
    const { score, reasons } = scoreProduct(product, knowledge, normalizedQuery, hints.categories, hints.families, input.nlu);
    return { product, score, reasons };
  });
  rows = rows.map((row) => applyUsageContextScore(row, input.nlu?.usage_context || null));
  rows = applyAttributeOrdering(rows, input.nlu).filter((row) => row.score >= 14);

  const excludedBrands = activeConstraints
    .filter((item) => item.dimension === "brand" && item.mode === "exclude")
    .flatMap((item) => String(item.value).split(","))
    .map(normalize)
    .filter(Boolean);
  if (excludedBrands.length) {
    rows = rows.filter((row) => !excludedBrands.includes(normalize(row.product.brand || "")));
  }

  if (previousIds.size) {
    rows = rows
      .map((row) => ({
        ...row,
        score: previousIds.has(row.product.id) ? row.score - 9 : row.score,
      }))
      .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name));
  }

  if (input.nlu?.followup_type === "more_powerful" || activeConstraints.some((item) => item.dimension === "power" && item.value === "higher")) {
    rows = rows
      .map((row) => {
        const full = normalize(`${row.product.name} ${row.product.long_description || ""} ${row.product.short_description || ""}`);
        const bonus = HIGH_OUTPUT_TOKENS.some((token) => full.includes(token)) ? 8 : 0;
        return { ...row, score: row.score + bonus };
      })
      .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name));
  }
  if (input.nlu?.followup_type === "cheaper" || activeConstraints.some((item) => item.dimension === "price" && item.value === "lower")) {
    rows = rows.sort((a, b) => (a.product.price ?? Number.MAX_SAFE_INTEGER) - (b.product.price ?? Number.MAX_SAFE_INTEGER));
  }
  if ((postOperation === "more_options" || postOperation === "reject") && previousIds.size > 0) {
    rows = rows.filter((row) => !previousIds.has(row.product.id));
  } else if (isFollowup && previousIds.size > 0) {
    const nonRepeated = rows.filter((row) => !previousIds.has(row.product.id));
    if (nonRepeated.length >= 1) rows = nonRepeated;
  }

  const top = rows.slice(0, 5).map((row) => row.product);
  if (!top.length) {
    const exhaustedFollowup = postOperation === "more_options" || postOperation === "reject";
    return {
      handled: exhaustedFollowup,
      intent: "products",
      answer: exhaustedFollowup
        ? "No encontré más productos nuevos que cumplan bien con los criterios actuales; ya te mostré las opciones válidas disponibles. Podemos ampliar un criterio o comparar las que vimos."
        : "No encontré opciones claras con esa búsqueda, pero puedo ayudarte a revisar el catálogo o pasarte con un asesor.",
      actions: exhaustedFollowup
        ? [
            { id: "rec-exhausted-broaden", label: "Ampliar criterios", type: "prompt", value: "Ayúdame a ampliar los criterios sin perder lo más importante" },
            { id: "rec-exhausted-compare", label: "Comparar las anteriores", type: "prompt", value: "Compara las dos mejores opciones que vimos" },
          ]
        : [
            { id: "rec-fallback-catalog", label: "Ver catálogo", type: "link", value: "/catalogo" },
            { id: "rec-fallback-advisor", label: "Hablar por WhatsApp", type: "whatsapp", value: "advisor_general", icon: "📞" },
            { id: "rec-fallback-retry", label: "Intentar otra búsqueda", type: "prompt", value: "Quiero buscar otra opción" },
          ],
      suggestions: exhaustedFollowup ? ["Acepto una opción un poco más grande", "Cambia el rango de precio"] : ["Quiero algo económico", "Muéstrame cabinas", "Muéstrame guitarras"],
      confidence_score: 0.58,
      resolution_kind: exhaustedFollowup ? "direct" : "fallback",
      memory_updates: {
        preferred_category: hints.categories[0] || input.memory?.preferred_category || null,
        budget_cop: budget ?? input.memory?.budget_cop ?? null,
        last_query: normalizedQuery,
      },
      memory_patch: {
        last_recommendation_query: normalizedQuery,
        last_recommendation_category: hints.categories[0] || input.memory?.preferred_category || null,
        last_recommendation_attributes: input.nlu?.attributes || [],
        last_usage_context: input.nlu?.usage_context || null,
        last_recommendation_type: isFollowup ? "followup" : "fallback",
        recommendation_state: priorState,
      },
      recommendation_debug: {
        normalized_query: normalizedQuery,
        applied_aliases: appliedAliases,
        expanded_queries: expandedQueries,
        selected_category_paths: hints.categories,
        product_scores: rows.slice(0, 8).map((row) => ({ id: row.product.id, slug: row.product.slug, score: Number(row.score.toFixed(2)) })),
      },
      product_cards: [],
    };
  }

  const actions: RecommenderAction[] = top.map((product) => ({
    id: `rec-product-${product.id}`,
    label: `${product.name} · ${formatCatalogPrice(product.price)}`,
    type: "link",
    value: `/catalogo/${product.slug}`,
  }));
  actions.push(
    { id: "rec-open-catalog", label: "Ver catálogo completo", type: "link", value: "/catalogo" },
    { id: "rec-open-advisor", label: "Hablar con asesor", type: "whatsapp", value: "asesoria_eleccion", icon: "📞" }
  );

  const lead = buildIntentLead(input.nlu, normalizedQuery);
  const salesNarrative = buildSalesRecommendationNarrative({
    lead,
    query: normalizedQuery,
    rows: rows.slice(0, 3).map((row) => ({
      product: row.product,
      knowledge: knowledgeById.get(row.product.id) as ProductKnowledgeProfile,
    })),
  });
  const reasonByProduct = new Map<number, string | null>();
  salesNarrative.pitches.forEach((pitch) => reasonByProduct.set(pitch.product_id, pitch.card_reason));
  rows.slice(0, 5).forEach((row) => {
    if (reasonByProduct.has(row.product.id)) return;
    const firstReason = row.reasons[0];
    reasonByProduct.set(row.product.id, firstReason ? reasonToPhrase(firstReason) : "Buena relación precio/categoría");
  });

  const recommendationProducts = rows.slice(0, 5).map((row) => ({
    id: row.product.id,
    slug: row.product.slug,
    name: row.product.name,
    price: row.product.price,
    category_path: row.product.category_path,
    category_name: row.product.category_name,
    brand: row.product.brand || null,
    score: Number(row.score.toFixed(2)),
  }));
  const recommendationState: KoraRecommendationState = {
    schema_version: "kora-recommendation-v1",
    family: hints.families[0] || priorState?.family || null,
    base_query: isPostFollowup ? rememberedBase : normalizedQuery,
    active_constraints: activeConstraints,
    shown_product_ids: Array.from(new Set([...(priorState?.shown_product_ids || []), ...recommendationProducts.map((item) => item.id)])).slice(-60),
    current_results: recommendationProducts,
    selected_product_ids: priorState?.selected_product_ids || [],
    rejected_product_ids: priorState?.rejected_product_ids || [],
    comparison_product_ids: [],
    round: isPostFollowup ? Math.min((priorState?.round || 1) + 1, 50) : 1,
  };

  return {
    handled: true,
    intent: "products",
    answer: postOperation === "more_options"
      ? `Claro. Te muestro opciones nuevas manteniendo lo que ya me dijiste.\n\n${salesNarrative.answer}`
      : postOperation === "refine"
        ? `Ajusté la búsqueda con ese criterio.\n\n${salesNarrative.answer}`
        : salesNarrative.answer,
    actions: actions.slice(0, 7),
    suggestions: [
      "Dame opciones económicas",
      "Muéstrame algo más profesional",
      "Quiero filtrar por marca",
    ],
    confidence_score: 0.82,
    resolution_kind: "direct",
    memory_updates: {
      preferred_category: top[0]?.category_path || hints.categories[0] || input.memory?.preferred_category || null,
      budget_cop: budget ?? input.memory?.budget_cop ?? null,
      last_query: normalizedQuery,
    },
    memory_patch: {
      last_recommended_products: recommendationProducts,
      last_recommendation_query: normalizedQuery,
      last_recommendation_category: top[0]?.category_path || hints.categories[0] || input.memory?.preferred_category || null,
      last_recommendation_attributes: input.nlu?.attributes || [],
      last_usage_context: input.nlu?.usage_context || null,
      last_recommendation_type: isFollowup ? "followup" : input.nlu?.intent || "product_search",
      recommendation_state: recommendationState,
    },
    recommendation_debug: {
      normalized_query: normalizedQuery,
      applied_aliases: appliedAliases,
      expanded_queries: expandedQueries,
      selected_category_paths: hints.categories,
      product_scores: rows.slice(0, 8).map((row) => ({ id: row.product.id, slug: row.product.slug, score: Number(row.score.toFixed(2)) })),
      product_knowledge: rows.slice(0, 8).map((row) => {
        const knowledge = knowledgeById.get(row.product.id) as ProductKnowledgeProfile;
        return {
          id: row.product.id,
          family: knowledge.classification.family.value,
          role: knowledge.classification.role.value,
          subtype: knowledge.classification.subtype?.value || null,
          coverage_score: knowledge.coverage_score,
          review_flags: knowledge.review_flags,
          sales_facts: salesNarrative.pitches.find((pitch) => pitch.product_id === row.product.id)?.used_facts || [],
        };
      }),
    },
    product_cards: top.slice(0, 5).map((product) => ({
      id: product.id,
      slug: product.slug || "",
      name: product.name,
      price: product.price,
      price_mode: product.price_mode || null,
      brand: product.brand || null,
      category_name: product.category_name || null,
      image_url: product.image_thumb_url || product.image_url || null,
      reason: reasonByProduct.get(product.id) || "Buena relación precio/categoría",
      url: product.slug ? `/catalogo/${product.slug}` : "/catalogo",
    })),
  };
}
