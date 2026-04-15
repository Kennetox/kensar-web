import { NextResponse } from "next/server";
import { getCatalogProduct, getCatalogProducts, formatCatalogPrice, getStockLabel } from "@/app/lib/metrikCatalog";

type AskRequest = {
  query?: string;
  path?: string;
  context?: ProductContext;
  memory?: {
    preferred_category?: string | null;
    budget_cop?: number | null;
    tone_mode?: "friendly" | "professional" | null;
    customer_goal?: "gift" | "home" | "business" | "studio" | null;
    last_emotion?: "neutral" | "frustrated" | "urgent" | "happy" | "doubtful" | null;
  };
};

type ProductContext = {
  currentProductSlug?: string | null;
};

type ActionType = "command" | "link" | "whatsapp" | "add_to_cart" | "prompt";

type AddToCartPayload = {
  product_id: number;
  product_name: string;
  product_slug: string;
  product_sku: string | null;
  image_url: string | null;
  brand: string | null;
  stock_status: "in_stock" | "low_stock" | "out_of_stock" | "service" | "consultar";
  unit_price: number;
  compare_price: number | null;
};

type ChatActionOut = {
  id: string;
  label: string;
  icon?: string;
  type: ActionType;
  value: string;
  payload?: AddToCartPayload;
};

type AskResponse = {
  handled: boolean;
  intent:
    | "products"
    | "payments"
    | "shipping"
    | "warranty"
    | "advisor"
    | "orders"
    | "menu"
    | "unknown";
  answer: string;
  actions: ChatActionOut[];
  suggestions: string[];
  emotion: "neutral" | "frustrated" | "urgent" | "happy" | "doubtful";
  companion_mode: boolean;
  memory_updates?: {
    preferred_category?: string | null;
    budget_cop?: number | null;
    tone_mode?: "friendly" | "professional" | null;
    customer_goal?: "gift" | "home" | "business" | "studio" | null;
    last_emotion?: "neutral" | "frustrated" | "urgent" | "happy" | "doubtful" | null;
  };
};

type Emotion = AskResponse["emotion"];
type ToneMode = "friendly" | "professional";
type CustomerGoal = "gift" | "home" | "business" | "studio" | null;

type ProductReference = {
  id: number;
  name: string;
  slug: string;
  sku: string | null;
  image_url: string | null;
  image_thumb_url?: string | null;
  brand: string | null;
  stock_status: "in_stock" | "low_stock" | "out_of_stock" | "service" | "consultar";
  price_mode: "visible" | "consultar";
  price: number | null;
  compare_price: number | null;
};

const CATEGORY_ALIASES: Array<{ aliases: string[]; path: string }> = [
  { aliases: ["audio", "sonido", "cabina", "parlante", "bafle", "amplificador"], path: "audio-profesional" },
  { aliases: ["camara", "camaras", "seguridad", "vigilancia", "cctv"], path: "camaras" },
  { aliases: ["instrumento", "instrumentos", "guitarra", "bateria", "teclado", "microfono", "microfonos"], path: "instrumentos" },
  { aliases: ["accesorio", "accesorios", "cable", "soporte", "adaptador"], path: "accesorios" },
  { aliases: ["hogar", "tecnologia", "entretenimiento"], path: "tecnologia" },
];

function normalize(value: string) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCurrentProductSlug(pathname?: string, context?: ProductContext): string | null {
  const byContext = normalize(String(context?.currentProductSlug || ""));
  if (byContext) return byContext;

  const path = String(pathname || "").trim();
  if (!path.startsWith("/catalogo/")) return null;
  const withoutPrefix = path.replace(/^\/catalogo\//, "");
  const slug = withoutPrefix.split("/")[0]?.trim();
  if (!slug) return null;
  return decodeURIComponent(slug);
}

function buildAddToCartAction(item: ProductReference, idPrefix = "kora-add"): ChatActionOut | null {
  if (item.price_mode !== "visible" || item.price === null) return null;
  if (item.stock_status === "out_of_stock" || item.stock_status === "service" || item.stock_status === "consultar") return null;
  return {
    id: `${idPrefix}-${item.id}`,
    label: `Agregar ${item.name}`,
    icon: "🛒",
    type: "add_to_cart",
    value: String(item.id),
    payload: {
      product_id: item.id,
      product_name: item.name,
      product_slug: item.slug,
      product_sku: item.sku,
      image_url: item.image_thumb_url || item.image_url,
      brand: item.brand || null,
      stock_status: item.stock_status,
      unit_price: item.price,
      compare_price: item.compare_price ?? null,
    },
  };
}

function isOnProductAssistantIntent(text: string) {
  return /\b(este|esta|producto|parecido|similar|alternativa|economico|economica|barato|barata|mejor|calidad|potencia|opinas|opinion|vale la pena|agregar|carrito|comprar)\b/.test(
    text
  );
}

function wantsCheaperAlternative(text: string) {
  return /\b(barato|barata|economico|economica|mas barato|mas economico|menor precio)\b/.test(text);
}

function wantsPremiumAlternative(text: string) {
  return /\b(mejor|mas calidad|premium|pro|mas potente|potencia|gama alta)\b/.test(text);
}

function wantsSimilar(text: string) {
  return /\b(parecido|similar|alternativa|opcion parecida|algo como)\b/.test(text);
}

function wantsOpinion(text: string) {
  return /\b(opinas|opinion|recomiendas|vale la pena|que tal|es bueno)\b/.test(text);
}

function wantsAddToCart(text: string) {
  return /\b(agregar|anadir|añadir|sumar|meter).*\b(carrito)\b|\bcomprar ahora\b/.test(text);
}

function detectEmotion(text: string): Emotion {
  if (!text) return "neutral";
  if (/\b(urgente|ya|ahora|rapido|rapido|hoy mismo|cuanto antes)\b/.test(text)) return "urgent";
  if (/\b(mal|pesimo|pésimo|frustra|molesto|enojado|no sirve|no funciona|cansado)\b/.test(text)) return "frustrated";
  if (/\b(gracias|excelente|genial|perfecto|buenisimo|buenisimo|chevere|chévere)\b/.test(text)) return "happy";
  if (/\b(no se|no sé|duda|confund|ayudame|ayúdame|no entiendo)\b/.test(text)) return "doubtful";
  return "neutral";
}

function detectTonePreference(text: string, fallback: ToneMode = "friendly"): ToneMode {
  if (/\b(formal|profesional|serio|tecnico|técnico)\b/.test(text)) return "professional";
  if (/\b(cercan|human|amable|casual|tranqui)\b/.test(text)) return "friendly";
  return fallback;
}

function detectCustomerGoal(text: string, fallback: CustomerGoal = null): CustomerGoal {
  if (/\b(regalo|obsequio|cumpleanos|cumpleaños)\b/.test(text)) return "gift";
  if (/\b(negocio|empresa|local|emprendimiento|tienda)\b/.test(text)) return "business";
  if (/\b(hogar|casa|apartamento|sala)\b/.test(text)) return "home";
  if (/\b(estudio|grabacion|grabación|podcast)\b/.test(text)) return "studio";
  return fallback;
}

function companionModeForEmotion(emotion: Emotion) {
  return emotion === "frustrated" || emotion === "urgent";
}

function buildEmpathyLead(emotion: Emotion, tone: ToneMode): string {
  if (emotion === "urgent") {
    return tone === "professional"
      ? "Entendido. Vamos a resolverlo de la forma más rápida."
      : "Entendido, te ayudo de una y rápido.";
  }
  if (emotion === "frustrated") {
    return tone === "professional"
      ? "Entiendo la molestia. Vamos a resolverlo paso a paso."
      : "Te entiendo, vamos a resolverlo juntos sin enredos.";
  }
  if (emotion === "doubtful") {
    return tone === "professional"
      ? "Perfecto, te lo explico de forma clara."
      : "Tranquilo, te lo explico fácil.";
  }
  if (emotion === "happy") {
    return tone === "professional"
      ? "Excelente, avancemos."
      : "¡Qué bueno! Sigamos.";
  }
  return tone === "professional"
    ? "Claro, te ayudo con eso."
    : "Listo, te ayudo.";
}

function goalHint(goal: CustomerGoal, tone: ToneMode): string {
  if (goal === "gift") return tone === "professional" ? "Puedo priorizar opciones para regalo." : "Te priorizo opciones para regalo.";
  if (goal === "business") return tone === "professional" ? "Puedo enfocarlo para uso de negocio." : "Lo enfocamos para negocio.";
  if (goal === "home") return tone === "professional" ? "Puedo enfocarlo para uso en hogar." : "Lo enfocamos para casa.";
  if (goal === "studio") return tone === "professional" ? "Puedo enfocarlo para estudio/podcast." : "Lo enfocamos para estudio o podcast.";
  return "";
}

function prependLead(answer: string, lead: string, hint: string) {
  const parts = [lead, answer];
  if (hint) parts.push(hint);
  return parts.join("\n\n");
}

function ensureCompanionActions(actions: ChatActionOut[], companionMode: boolean): ChatActionOut[] {
  if (!companionMode) return actions;
  const hasWhatsApp = actions.some((action) => action.type === "whatsapp");
  if (hasWhatsApp) {
    const sorted = [...actions].sort((a, b) => (a.type === "whatsapp" ? -1 : b.type === "whatsapp" ? 1 : 0));
    return sorted;
  }
  return [
    { id: "companion-advisor", label: "Hablar por WhatsApp ahora", icon: "📞", type: "whatsapp", value: "advisor" },
    ...actions,
  ];
}

function finalizeResponse(
  base: Omit<AskResponse, "emotion" | "companion_mode">,
  context: { emotion: Emotion; tone: ToneMode; goal: CustomerGoal; companionMode: boolean }
): AskResponse {
  const lead = buildEmpathyLead(context.emotion, context.tone);
  const hint = goalHint(context.goal, context.tone);
  return {
    ...base,
    answer: prependLead(base.answer, lead, hint),
    actions: ensureCompanionActions(base.actions, context.companionMode),
    emotion: context.emotion,
    companion_mode: context.companionMode,
    memory_updates: {
      ...(base.memory_updates ?? {}),
      tone_mode: context.tone,
      customer_goal: context.goal,
      last_emotion: context.emotion,
    },
  };
}

function detectIntent(text: string): AskResponse["intent"] {
  if (!text) return "unknown";
  if (/\b(hola|inicio|menu)\b/.test(text)) return "menu";
  if (/\b(asesor|whatsapp|humano|agente)\b/.test(text)) return "advisor";
  if (/\b(pago|pagos|tarjeta|credito|addi|sistecredito|cuotas)\b/.test(text)) return "payments";
  if (/\b(envio|envios|despacho|domicilio|entrega|ciudad)\b/.test(text)) return "shipping";
  if (/\b(garantia|garantias|devolucion|devoluciones|cambio|soporte)\b/.test(text)) return "warranty";
  if (/\b(orden|pedido|mis pedidos|estado)\b/.test(text)) return "orders";
  if (/\b(producto|productos|catalogo|sku|codigo|precio|recomienda|recomendacion|quiero)\b/.test(text)) return "products";
  return "unknown";
}

function isGreetingOnly(text: string) {
  return /^(hola|holi|buenas|buenos dias|buenas tardes|buenas noches|hey|hello|hi)\b[!. ]*$/.test(text);
}

function isSmallTalk(text: string) {
  return (
    /\b(como estas|como vas|que tal|todo bien|como te va|como andas)\b/.test(text) ||
    /^(bien y tu|y tu|todo bien\??|que cuentas)\b/.test(text)
  );
}

function parseBudgetCop(text: string): number | null {
  const normalized = normalize(text);
  const milMatch = normalized.match(/(?:hasta|max(?:imo)?)\s+(\d{1,4})\s*mil\b/);
  if (milMatch) {
    return Number.parseInt(milMatch[1], 10) * 1000;
  }

  const rawMatch = normalized.match(/(?:hasta|max(?:imo)?)\s+\$?\s*([\d\.\,]{4,12})/);
  if (!rawMatch) return null;

  const digits = rawMatch[1].replace(/[^\d]/g, "");
  if (!digits) return null;
  const value = Number.parseInt(digits, 10);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

function detectCategoryPath(text: string): string | null {
  for (const row of CATEGORY_ALIASES) {
    if (row.aliases.some((alias) => text.includes(alias))) return row.path;
  }
  return null;
}

function buildCatalogSearchQuery(text: string): string {
  return normalize(text)
    .replace(/\b(hola|menu|quiero|buscar|busca|necesito|producto|productos|catalogo|de|para|con|el|la|los|las|un|una)\b/g, " ")
    .replace(/\b(hasta|maximo|max)\b\s+\$?\s*[\d\.\,]+\s*(mil)?\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildBaseSuggestions(): string[] {
  return [
    "Quiero opciones de audio hasta 300 mil",
    "Qué métodos de pago manejan",
    "Cómo funciona la garantía",
  ];
}

async function resolveProductsResponse(
  query: string,
  memory?: AskRequest["memory"]
): Promise<AskResponse> {
  const normalized = normalize(query);
  const budget = parseBudgetCop(normalized) ?? (Number(memory?.budget_cop) || null);
  const categoryPath = detectCategoryPath(normalized) || (memory?.preferred_category || null);
  const searchQuery = buildCatalogSearchQuery(normalized);

  let result = await getCatalogProducts({
    q: searchQuery || undefined,
    category: categoryPath || undefined,
    page: 1,
  }).catch(() => null);

  if (!result && searchQuery) {
    result = await getCatalogProducts({ q: searchQuery, page: 1 }).catch(() => null);
  }

  if (!result) {
    return {
      handled: false,
      intent: "products",
      answer: "No pude consultar el catálogo en este momento. Intenta de nuevo o abre WhatsApp.",
      actions: [
        { id: "kora-catalog-fallback", label: "Ir al catálogo", type: "link", value: "/catalogo" },
        { id: "kora-advisor-fallback", label: "Hablar por WhatsApp", icon: "📞", type: "whatsapp", value: "advisor" },
      ],
      suggestions: buildBaseSuggestions(),
      emotion: "neutral",
      companion_mode: false,
    };
  }

  const filtered = budget
    ? result.items.filter((item) => item.price === null || item.price <= budget)
    : result.items;
  const topItems = filtered.slice(0, 3);

  if (!topItems.length) {
    const budgetText = budget ? ` por debajo de ${formatCatalogPrice(budget)}` : "";
    return {
      handled: false,
      intent: "products",
      answer: `No encontré resultados${budgetText} con esa búsqueda. Prueba con otra categoría o rango.`,
      actions: [
        { id: "kora-catalog-empty", label: "Ver catálogo completo", type: "link", value: "/catalogo" },
        { id: "kora-advisor-empty", label: "Hablar por WhatsApp", icon: "📞", type: "whatsapp", value: "advisor" },
      ],
      suggestions: [
        "Mostrar audio profesional",
        "Ver instrumentos",
        "Buscar por SKU",
      ],
      emotion: "neutral",
      companion_mode: false,
    };
  }

  const actions: ChatActionOut[] = topItems.map((item) => ({
    id: `kora-product-${item.id}`,
    label: `${item.name} · ${formatCatalogPrice(item.price)}`,
    type: "link",
    value: `/catalogo/${item.slug}`,
  }));

  topItems.slice(0, 2).forEach((item) => {
    if (item.price_mode !== "visible" || item.price === null) return;
    if (item.stock_status === "out_of_stock" || item.stock_status === "service" || item.stock_status === "consultar") return;
    actions.push({
      id: `kora-add-${item.id}`,
      label: `Agregar ${item.name}`,
      icon: "🛒",
      type: "add_to_cart",
      value: String(item.id),
      payload: {
        product_id: item.id,
        product_name: item.name,
        product_slug: item.slug,
        product_sku: item.sku,
        image_url: item.image_thumb_url || item.image_url,
        brand: item.brand || null,
        stock_status: item.stock_status,
        unit_price: item.price,
        compare_price: item.compare_price ?? null,
      },
    });
  });

  const params = new URLSearchParams();
  if (searchQuery) params.set("q", searchQuery);
  if (categoryPath) params.set("category", categoryPath);
  const catalogHref = `/catalogo${params.toString() ? `?${params.toString()}` : ""}`;

  actions.push({ id: "kora-open-catalog", label: "Ver más opciones", type: "link", value: catalogHref });

  const budgetLine = budget ? ` dentro de ${formatCatalogPrice(budget)}` : "";
  return {
    handled: true,
    intent: "products",
    answer: `Te encontré ${Math.min(filtered.length, 3)} opción(es)${budgetLine}. Si quieres, te filtro por marca o uso.`,
    actions,
    suggestions: [
      "Muéstrame solo Yamaha",
      "Dame opciones más económicas",
      "Quiero hablar con un asesor",
    ],
    emotion: "neutral",
    companion_mode: false,
    memory_updates: {
      preferred_category: categoryPath || undefined,
      budget_cop: budget || undefined,
    },
  };
}

async function resolveProductPageAssistantResponse(
  query: string,
  currentPath: string | undefined,
  context?: ProductContext
): Promise<AskResponse | null> {
  const normalized = normalize(query);
  const slug = parseCurrentProductSlug(currentPath, context);
  if (!slug) return null;
  if (!isOnProductAssistantIntent(normalized)) return null;

  const current = await getCatalogProduct(slug).catch(() => null);
  if (!current) return null;

  const catalogRows = await getCatalogProducts({
    category: current.category_path || undefined,
    page: 1,
  }).catch(() => null);
  const options = (catalogRows?.items || []).filter((item) => item.id !== current.id);

  const currentPrice = current.price_mode === "visible" ? current.price : null;
  const cheaper = currentPrice
    ? options
        .filter((item) => item.price_mode === "visible" && typeof item.price === "number" && item.price < currentPrice)
        .sort((a, b) => (a.price || 0) - (b.price || 0))
        .slice(0, 2)
    : [];

  const premium = currentPrice
    ? options
        .filter((item) => item.price_mode === "visible" && typeof item.price === "number" && item.price > currentPrice)
        .sort((a, b) => (b.price || 0) - (a.price || 0))
        .slice(0, 2)
    : [];

  const similar = options
    .filter((item) => item.price_mode === "visible" && item.price !== null)
    .sort((a, b) => {
      const aGap = currentPrice ? Math.abs((a.price || 0) - currentPrice) : 0;
      const bGap = currentPrice ? Math.abs((b.price || 0) - currentPrice) : 0;
      return aGap - bGap;
    })
    .slice(0, 2);

  const actions: ChatActionOut[] = [];
  const addCurrentAction = buildAddToCartAction(current, "current-product");
  if (addCurrentAction) actions.push(addCurrentAction);
  actions.push({
    id: "product-context-whatsapp",
    label: "Conectar asesor por WhatsApp",
    icon: "📞",
    type: "whatsapp",
    value: "advisor",
  });

  let comparedList = similar;
  let comparisonLead = "Te paso opciones parecidas para comparar.";

  if (wantsCheaperAlternative(normalized) && cheaper.length) {
    comparedList = cheaper;
    comparisonLead = "Te paso alternativas más económicas de esta misma línea.";
  } else if (wantsPremiumAlternative(normalized) && premium.length) {
    comparedList = premium;
    comparisonLead = "Si buscas más nivel, estas opciones suelen rendir mejor por potencia/calidad.";
  } else if (wantsSimilar(normalized) && similar.length) {
    comparedList = similar;
    comparisonLead = "Te paso opciones parecidas para que compares rápido.";
  } else if (wantsCheaperAlternative(normalized) && !cheaper.length) {
    comparisonLead = "Este producto ya está entre las opciones más económicas disponibles en esta categoría.";
  } else if (wantsPremiumAlternative(normalized) && !premium.length) {
    comparisonLead = "No encontré en esta categoría una opción más alta por precio en este momento.";
  }

  comparedList.forEach((item) => {
    actions.push({
      id: `product-alt-${item.id}`,
      label: `${item.name} · ${formatCatalogPrice(item.price)}`,
      type: "link",
      value: `/catalogo/${item.slug}`,
    });
    const addAltAction = buildAddToCartAction(item, "alt-add");
    if (addAltAction && actions.length < 6) {
      actions.push(addAltAction);
    }
  });

  actions.push({
    id: "product-context-open",
    label: "Ver producto completo",
    type: "link",
    value: `/catalogo/${current.slug}`,
  });

  let answer = `Veo que estás en ${current.name}${current.sku ? ` (SKU ${current.sku})` : ""}.`;
  if (wantsAddToCart(normalized)) {
    if (addCurrentAction) {
      answer = `${answer}\n\nClaro, te lo agrego de inmediato. También te dejo opciones relacionadas por si quieres comparar antes de cerrar compra.`;
    } else {
      answer = `${answer}\n\nEste producto no está listo para compra directa en carrito ahora mismo, pero te dejo opciones similares para avanzar.`;
    }
  } else if (wantsOpinion(normalized)) {
    answer = `${answer}\n\n${
      current.short_description?.trim() || "Es una opción sólida para uso general dentro de su categoría."
    }\n\nEstado: ${getStockLabel(current.stock_status)}${current.price_mode === "visible" ? ` · ${formatCatalogPrice(current.price)}` : " · Precio a consultar"}.\n\n${comparisonLead}`;
  } else {
    answer = `${answer}\n\nEstado: ${getStockLabel(current.stock_status)}${current.price_mode === "visible" ? ` · ${formatCatalogPrice(current.price)}` : " · Precio a consultar"}.\n\n${comparisonLead}`;
  }

  return {
    handled: true,
    intent: "products",
    answer,
    actions: actions.slice(0, 6),
    suggestions: [
      "Dame una opción más económica",
      "Muéstrame una de más potencia",
      "Agrega este producto al carrito",
    ],
    emotion: "neutral",
    companion_mode: false,
    memory_updates: {
      preferred_category: current.category_path || undefined,
    },
  };
}

async function resolveProductPageWelcome(
  currentPath: string | undefined,
  context?: ProductContext
): Promise<AskResponse | null> {
  const slug = parseCurrentProductSlug(currentPath, context);
  if (!slug) return null;

  const current = await getCatalogProduct(slug).catch(() => null);
  if (!current) return null;

  const actions: ChatActionOut[] = [];
  const addCurrentAction = buildAddToCartAction(current, "current-product-welcome");
  if (addCurrentAction) actions.push(addCurrentAction);
  actions.push(
    { id: "product-welcome-cheaper", label: "Ver una opción más económica", type: "prompt", value: "Dame una opción más económica" },
    { id: "product-welcome-premium", label: "Ver una de mayor potencia", type: "prompt", value: "Muéstrame una de más potencia" },
    { id: "product-welcome-opinion", label: "¿Qué opinas de este producto?", type: "prompt", value: "¿Qué opinas de este producto?" },
    { id: "product-welcome-whatsapp", label: "Conectar asesor por WhatsApp", icon: "📞", type: "whatsapp", value: "advisor" }
  );

  return {
    handled: true,
    intent: "products",
    answer: `Veo que estás en ${current.name}${current.sku ? ` (SKU ${current.sku})` : ""}. ${
      current.price_mode === "visible" ? `Está en ${formatCatalogPrice(current.price)}.` : "Este producto está en modo consultar."
    }\n\nSi quieres, te ayudo a comparar, resolver dudas o agregarlo al carrito.`,
    actions: actions.slice(0, 5),
    suggestions: [],
    emotion: "neutral",
    companion_mode: false,
    memory_updates: {
      preferred_category: current.category_path || undefined,
    },
  };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as AskRequest | null;
  const query = String(body?.query || "").trim();
  const normalized = normalize(query);
  const emotion = detectEmotion(normalized);
  const tone = detectTonePreference(normalized, body?.memory?.tone_mode === "professional" ? "professional" : "friendly");
  const goal = detectCustomerGoal(normalized, body?.memory?.customer_goal ?? null);
  const companionMode = companionModeForEmotion(emotion);
  const greetingOnly = isGreetingOnly(normalized);
  const smallTalk = isSmallTalk(normalized);

  if (query.length < 2) {
    return NextResponse.json<AskResponse>(
      finalizeResponse(
        {
        handled: false,
        intent: "unknown",
        answer: "Cuéntame qué necesitas y te ayudo a encontrarlo.",
        actions: [
          { id: "kora-menu", label: "Ver menú rápido", type: "command", value: "menu" },
          { id: "kora-catalog", label: "Ir al catálogo", type: "link", value: "/catalogo" },
        ],
        suggestions: buildBaseSuggestions(),
        },
        { emotion, tone, goal, companionMode }
      ),
      { status: 200 }
    );
  }

  const intent = detectIntent(normalized);

  if (greetingOnly) {
    const productWelcome = await resolveProductPageWelcome(body?.path, body?.context);
    if (productWelcome) {
      return NextResponse.json<AskResponse>(
        finalizeResponse(productWelcome, { emotion, tone, goal, companionMode }),
        { status: 200 }
      );
    }

    return NextResponse.json<AskResponse>(
      {
        handled: true,
        intent: "menu",
        answer:
          tone === "professional"
            ? "Hola, qué gusto saludarte.\n\nEstoy para ayudarte con productos, pagos, envíos o garantías. ¿Qué necesitas hoy?"
            : "¡Hola! Qué bueno tenerte por aquí.\n\nEstoy para ayudarte con productos, pagos, envíos o garantías. ¿Qué estás buscando hoy?",
        actions: [],
        suggestions: [],
        emotion,
        companion_mode: false,
        memory_updates: {
          tone_mode: tone,
          customer_goal: goal,
          last_emotion: emotion,
        },
      },
      { status: 200 }
    );
  }

  if (smallTalk) {
    return NextResponse.json<AskResponse>(
      {
        handled: true,
        intent: "menu",
        answer:
          tone === "professional"
            ? "¡Muy bien, gracias por preguntar! Lista para ayudarte.\n\nSi quieres, cuéntame qué estás buscando y te acompaño paso a paso."
            : "¡Muy bien, gracias por preguntar! 😄\n\nEstoy aquí contigo. Cuéntame qué estás buscando y te ayudo paso a paso.",
        actions: [],
        suggestions: [],
        emotion,
        companion_mode: false,
        memory_updates: {
          tone_mode: tone,
          customer_goal: goal,
          last_emotion: emotion,
        },
      },
      { status: 200 }
    );
  }

  const contextualProductReply = await resolveProductPageAssistantResponse(query, body?.path, body?.context);
  if (contextualProductReply) {
    return NextResponse.json<AskResponse>(
      finalizeResponse(contextualProductReply, { emotion, tone, goal, companionMode }),
      { status: 200 }
    );
  }

  if (intent === "menu") {
    return NextResponse.json<AskResponse>(
      finalizeResponse(
        {
        handled: true,
        intent,
        answer: "Listo. Te dejo accesos rápidos para continuar.",
        actions: [
          { id: "menu-products", label: "Ver catálogo", icon: "🛍️", type: "command", value: "products" },
          { id: "menu-payments", label: "Métodos de pago", icon: "💳", type: "command", value: "payments" },
          { id: "menu-shipping", label: "Envíos", icon: "🚚", type: "command", value: "shipping" },
          { id: "menu-warranty", label: "Garantía", icon: "🛡️", type: "command", value: "warranty" },
          { id: "menu-advisor", label: "Hablar por WhatsApp", icon: "📞", type: "command", value: "advisor" },
        ],
        suggestions: buildBaseSuggestions(),
        },
        { emotion, tone, goal, companionMode }
      ),
      { status: 200 }
    );
  }

  if (intent === "products") {
    const response = await resolveProductsResponse(query, body?.memory);
    return NextResponse.json<AskResponse>(
      finalizeResponse(response, { emotion, tone, goal, companionMode }),
      { status: 200 }
    );
  }

  if (intent === "payments") {
    return NextResponse.json<AskResponse>(
      finalizeResponse(
        {
        handled: true,
        intent,
        answer: "Manejamos pagos en línea y opciones de financiación. Si quieres, te guío según tu presupuesto.",
        actions: [
          { id: "payments-go-checkout", label: "Ver opciones de pago", type: "link", value: "/pago" },
          { id: "payments-advisor", label: "Hablar por WhatsApp", icon: "📞", type: "whatsapp", value: "advisor" },
        ],
        suggestions: ["¿Puedo pagar por cuotas?", "¿Aceptan Addi?", "¿Cómo pago un pedido web?"],
        },
        { emotion, tone, goal, companionMode }
      ),
      { status: 200 }
    );
  }

  if (intent === "shipping") {
    return NextResponse.json<AskResponse>(
      finalizeResponse(
        {
        handled: true,
        intent,
        answer: "Hacemos envíos y también recogida en tienda. El tiempo final depende de tu ciudad.",
        actions: [
          { id: "shipping-contact", label: "Ir a contacto", type: "link", value: "/contacto" },
          { id: "shipping-advisor", label: "Confirmar envío por WhatsApp", icon: "📞", type: "whatsapp", value: "advisor" },
        ],
        suggestions: ["¿Envían a mi ciudad?", "¿Cuánto tarda el envío?", "¿Puedo recoger hoy en tienda?"],
        },
        { emotion, tone, goal, companionMode }
      ),
      { status: 200 }
    );
  }

  if (intent === "warranty") {
    return NextResponse.json<AskResponse>(
      finalizeResponse(
        {
        handled: true,
        intent,
        answer: "Todos los productos tienen garantía. Si me dices el producto o SKU, te indico el paso más rápido.",
        actions: [
          { id: "warranty-legal", label: "Ver políticas", type: "link", value: "/legal/cambios-devoluciones-garantias" },
          { id: "warranty-advisor", label: "Soporte por WhatsApp", icon: "📞", type: "whatsapp", value: "advisor" },
        ],
        suggestions: ["¿Cómo tramito garantía?", "¿Puedo hacer cambio?", "¿Qué cubre la garantía?"],
        },
        { emotion, tone, goal, companionMode }
      ),
      { status: 200 }
    );
  }

  if (intent === "orders") {
    return NextResponse.json<AskResponse>(
      finalizeResponse(
        {
        handled: true,
        intent,
        answer: "Para revisar estado de pedidos, entra a Mis pedidos. Si no tienes acceso, te ayudamos por WhatsApp.",
        actions: [
          { id: "orders-my", label: "Ir a Mis pedidos", type: "link", value: "/mis-pedidos" },
          { id: "orders-account", label: "Ir a Mi cuenta", type: "link", value: "/cuenta" },
          { id: "orders-advisor", label: "Ayuda por WhatsApp", icon: "📞", type: "whatsapp", value: "advisor" },
        ],
        suggestions: ["No encuentro mi pedido", "¿Cómo veo el estado del pago?", "Quiero soporte de una orden"],
        },
        { emotion, tone, goal, companionMode }
      ),
      { status: 200 }
    );
  }

  if (intent === "advisor") {
    return NextResponse.json<AskResponse>(
      finalizeResponse(
        {
        handled: true,
        intent,
        answer: "Te conecto con un asesor para resolverlo contigo en tiempo real.",
        actions: [
          { id: "advisor-open", label: "Abrir WhatsApp", icon: "📞", type: "whatsapp", value: "advisor" },
          { id: "advisor-menu", label: "Volver al menú", type: "command", value: "menu" },
        ],
        suggestions: ["Quiero ayuda con una compra", "Necesito cotización", "Tengo dudas de garantía"],
        },
        { emotion, tone, goal, companionMode: true }
      ),
      { status: 200 }
    );
  }

  return NextResponse.json<AskResponse>(
    finalizeResponse(
      {
      handled: false,
      intent: "unknown",
      answer: "Puedo ayudarte con productos, pagos, envíos, garantías o estado de pedidos.",
      actions: [
        { id: "unknown-products", label: "Ver catálogo", type: "command", value: "products" },
        { id: "unknown-advisor", label: "Hablar por WhatsApp", icon: "📞", type: "command", value: "advisor" },
      ],
      suggestions: buildBaseSuggestions(),
      },
      { emotion, tone, goal, companionMode }
    ),
    { status: 200 }
  );
}
