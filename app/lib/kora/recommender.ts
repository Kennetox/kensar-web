import { getCatalogProducts, formatCatalogPrice, type WebCatalogProductCard } from "@/app/lib/metrikCatalog";
import { normalizeKoraCatalogQuery } from "./query-normalizer";
import type { KoraNluResult } from "./entities";

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
  | "relacion_sonido_potente";

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
  };
  recommendation_debug?: {
    normalized_query: string;
    applied_aliases: string[];
    expanded_queries: string[];
    selected_category_paths: string[];
    product_scores: Array<{ id: number; slug: string; score: number }>;
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
  family:
    | "cabinas"
    | "microfonos"
    | "guitarras"
    | "teclados"
    | "seguridad"
    | "solar"
    | "televisores"
    | "hdmi"
    | "rca"
    | "red"
    | "xlr";
};

const CATEGORY_MAP: CategoryMapRule[] = [
  { aliases: ["cabina", "cabinas", "speaker", "speakers", "sonido duro", "potente"], categories: ["cabinas-activas", "sonido"], family: "cabinas" },
  { aliases: ["microfono", "microfonos", "micrófono", "micrófonos"], categories: ["microfonos"], family: "microfonos" },
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
  cabinas: ["cabina", "parlante", "bafle", "speaker", "sonido"],
  microfonos: ["microfono", "micro", "inalambrico"],
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

async function searchCatalog(q: string, category?: string) {
  return getCatalogProducts({
    q: q || undefined,
    category: category || undefined,
    page: 1,
    page_size: MAX_FETCH,
  }).catch(() => null);
}

export async function resolveKoraCatalogRecommendation(input: {
  query: string;
  nlu: KoraNluResult | null;
  memory?: RecommenderMemory;
}): Promise<KoraRecommenderResponse | null> {
  const isFollowup = input.nlu?.followup_type === "cheaper" || input.nlu?.followup_type === "more_powerful" || input.nlu?.followup_type === "similar";
  const baseQuery = isFollowup && (input.memory?.last_recommendation_query || input.memory?.last_query)
    ? `${input.memory?.last_recommendation_query || input.memory?.last_query} ${input.query}`
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

  const all = Array.from(seen.values());
  const filteredByBudget = budget ? all.filter((item) => item.price === null || item.price <= budget) : all;
  const previousIds = new Set((input.memory?.last_recommended_products || []).map((item) => item.id));
  let rows = filteredByBudget.map((product) => {
    const { score, reasons } = scoreProduct(product, normalizedQuery, hints.categories, hints.families, input.nlu);
    return { product, score, reasons };
  });
  rows = rows.map((row) => applyUsageContextScore(row, input.nlu?.usage_context || null));
  rows = applyAttributeOrdering(rows, input.nlu).filter((row) => row.score >= 14);

  if (previousIds.size) {
    rows = rows
      .map((row) => ({
        ...row,
        score: previousIds.has(row.product.id) ? row.score - 9 : row.score,
      }))
      .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name));
  }

  if (input.nlu?.followup_type === "more_powerful") {
    rows = rows
      .map((row) => {
        const full = normalize(`${row.product.name} ${row.product.long_description || ""} ${row.product.short_description || ""}`);
        const bonus = HIGH_OUTPUT_TOKENS.some((token) => full.includes(token)) ? 8 : 0;
        return { ...row, score: row.score + bonus };
      })
      .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name));
  }
  if (input.nlu?.followup_type === "cheaper") {
    rows = rows.sort((a, b) => (a.product.price ?? Number.MAX_SAFE_INTEGER) - (b.product.price ?? Number.MAX_SAFE_INTEGER));
  }
  if (isFollowup && previousIds.size > 0) {
    const nonRepeated = rows.filter((row) => !previousIds.has(row.product.id));
    if (nonRepeated.length >= 1) rows = nonRepeated;
  }

  const top = rows.slice(0, 5).map((row) => row.product);
  const topReasons = rows.slice(0, 3).flatMap((row) => row.reasons).slice(0, 3);

  if (!top.length) {
    return {
      handled: false,
      intent: "products",
      answer: "No encontré opciones claras con esa búsqueda, pero puedo ayudarte a revisar el catálogo o pasarte con un asesor.",
      actions: [
        { id: "rec-fallback-catalog", label: "Ver catálogo", type: "link", value: "/catalogo" },
        { id: "rec-fallback-advisor", label: "Hablar por WhatsApp", type: "whatsapp", value: "advisor_general", icon: "📞" },
        { id: "rec-fallback-retry", label: "Intentar otra búsqueda", type: "prompt", value: "Quiero buscar otra opción" },
      ],
      suggestions: ["Quiero algo económico", "Muéstrame cabinas", "Muéstrame guitarras"],
      confidence_score: 0.58,
      resolution_kind: "fallback",
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
  const reasonsText = topReasons.length
    ? `\n\nReferencias: ${Array.from(new Set(topReasons)).map(reasonToPhrase).join(", ")}.`
    : "";
  const reasonByProduct = new Map<number, string | null>();
  rows.slice(0, 5).forEach((row) => {
    const firstReason = row.reasons[0];
    reasonByProduct.set(row.product.id, firstReason ? reasonToPhrase(firstReason) : "Buena relación precio/categoría");
  });

  return {
    handled: true,
    intent: "products",
    answer: `${lead}${reasonsText}`,
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
      last_recommended_products: rows.slice(0, 5).map((row) => ({
        id: row.product.id,
        slug: row.product.slug,
        name: row.product.name,
        price: row.product.price,
        category_path: row.product.category_path,
        category_name: row.product.category_name,
        brand: row.product.brand || null,
        score: Number(row.score.toFixed(2)),
      })),
      last_recommendation_query: normalizedQuery,
      last_recommendation_category: top[0]?.category_path || hints.categories[0] || input.memory?.preferred_category || null,
      last_recommendation_attributes: input.nlu?.attributes || [],
      last_usage_context: input.nlu?.usage_context || null,
      last_recommendation_type: isFollowup ? "followup" : input.nlu?.intent || "product_search",
    },
    recommendation_debug: {
      normalized_query: normalizedQuery,
      applied_aliases: appliedAliases,
      expanded_queries: expandedQueries,
      selected_category_paths: hints.categories,
      product_scores: rows.slice(0, 8).map((row) => ({ id: row.product.id, slug: row.product.slug, score: Number(row.score.toFixed(2)) })),
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
