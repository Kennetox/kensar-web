import { findAttributeKnowledge } from "./attribute-knowledge";
import { findCategoryKnowledge, findCategoryKnowledgeById } from "./category-knowledge";
import type { KoraNluResult } from "./entities";
import type { KoraContextualSellingDebug, KoraGuidanceIntent, KoraPageContext } from "./knowledge-types";

export type ContextualSellingMemory = {
  last_recommendation_category?: string | null;
  last_usage_context?: string | null;
  last_answer_domain?: "products" | "business" | "support" | "unknown" | null;
  preferred_category?: string | null;
  last_category_opening_context?: string | null;
};

export type ContextualSellingResponse = {
  handled: boolean;
  answer: string;
  suggestions: string[];
  actions: Array<{ id: string; label: string; type: "prompt" | "command"; value: string; icon?: string }>;
  memory_updates?: {
    last_answer_domain?: "products";
    last_conversation_topic?: "products";
    preferred_category?: string | null;
    last_category_opening_context?: string | null;
  };
  debug?: KoraContextualSellingDebug;
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

function detectGuidanceIntent(text: string): KoraGuidanceIntent {
  if (/(^|\s)(que significa|que es|que son|para que sirve|como funciona|que quiere decir|explicame|diferencia entre|diferencia hay entre|cual es la diferencia|eso que hace)(\s|$)/.test(text)) {
    return "attribute_explanation";
  }
  if (/(^|\s)(como elijo|como escoger|cual me sirve|cual necesito|no se cual comprar|ayudame a elegir|que debo tener en cuenta|cual recomiendas)(\s|$)/.test(text)) {
    return "category_guidance";
  }
  if (/(^|\s)(cual me recomiendas|que .* me sirve)(\s|$)/.test(text)) {
    return "category_guidance";
  }
  if (/(^|\s)(ayudame a escoger|ayúdame a escoger)(\s|$)/.test(text)) {
    return "category_guidance";
  }
  if (/\b(buen bajo|bajo potente|que pegue duro|que suene duro)\b/.test(text)) {
    return "category_guidance";
  }
  if (/(^|\s)(quiero algo para|necesito .* para)(\s|$)/.test(text) && /\b(iglesia|fiesta|negocio|karaoke)\b/.test(text)) {
    return "category_guidance";
  }
  if (/(^|\s)(este me sirve|este es bueno|que tiene de bueno|por que vale mas|por que comprar este|me conviene|sirve para fiesta|sirve para negocio|sirve para iglesia|que mas necesito con esto)(\s|$)/.test(text)) {
    return "product_advice";
  }
  if (/(^|\s)(que caracteristicas tiene|que caracteristicas trae|que especificaciones tiene|ficha tecnica|ficha tecnica del producto|que trae este producto|cuales son sus caracteristicas|cuales caracteristicas tiene|cuales son las caracteristicas)(\s|$)/.test(text)) {
    return "product_advice";
  }
  if (/(^|\s)(esta caro|por que tan caro|hay uno mas barato|vale la pena|no entiendo la diferencia|cual es mejor)(\s|$)/.test(text)) {
    return "objection_handling";
  }
  if (/(^|\s)(me sirve con|se puede conectar a|funciona con|es compatible con|que cable necesito|que necesito para conectarlo)(\s|$)/.test(text)) {
    return "compatibility_question";
  }
  return null;
}

function isBusinessOrSupportIntent(nlu: KoraNluResult | null) {
  if (!nlu) return false;
  return (
    nlu.intent === "shipping" ||
    nlu.intent === "warranty" ||
    nlu.intent === "payments" ||
    nlu.intent === "human_advisor" ||
    nlu.intent === "business_contact" ||
    nlu.intent === "business_hours" ||
    nlu.intent === "business_location" ||
    nlu.intent === "business_support" ||
    nlu.intent === "returns_policy" ||
    nlu.intent === "shipping_policy" ||
    nlu.intent === "warranty_policy" ||
    nlu.intent === "business_info"
  );
}

function mapNluCategoryToKnowledge(category?: string | null) {
  if (!category) return null;
  const probe = normalize(category);
  if (probe.includes("audio") || probe.includes("cabina")) return findCategoryKnowledgeById("cabinas_activas");
  if (probe.includes("instrumentos")) return findCategoryKnowledgeById("guitarras");
  if (probe.includes("camar")) return findCategoryKnowledgeById("camaras_seguridad");
  if (probe.includes("accesor")) return findCategoryKnowledgeById("cables");
  return null;
}

function mapMemoryCategoryToKnowledge(category?: string | null) {
  if (!category) return null;
  const probe = normalize(category);
  if (probe.includes("cabina") || probe.includes("audio") || probe.includes("sonido")) return findCategoryKnowledgeById("cabinas_activas");
  if (probe.includes("microfono")) return findCategoryKnowledgeById("microfonos");
  if (probe.includes("guitarra")) return findCategoryKnowledgeById("guitarras");
  if (probe.includes("teclado") || probe.includes("piano")) return findCategoryKnowledgeById("teclados_pianos");
  if (probe.includes("camara") || probe.includes("seguridad")) return findCategoryKnowledgeById("camaras_seguridad");
  if (probe.includes("televisor") || probe.includes("tv")) return findCategoryKnowledgeById("televisores");
  if (probe.includes("cable") || probe.includes("accesorio")) return findCategoryKnowledgeById("cables");
  if (probe.includes("car audio")) return findCategoryKnowledgeById("car_audio");
  return null;
}

function buildProductAdviceFromPageContext(pageContext: KoraPageContext, message: string) {
  const text = normalize(message);
  const productName = pageContext.productName || "este producto";
  const productBrand = pageContext.productBrand ? ` de la marca ${pageContext.productBrand}` : "";
  const productCategory = pageContext.productCategory || pageContext.categoryName || "su categoría";
  const hasDescription = Boolean(pageContext.productDescription && normalize(pageContext.productDescription).length > 12);
  const attrs = pageContext.productAttributes && typeof pageContext.productAttributes === "object" ? Object.keys(pageContext.productAttributes) : [];
  const hasAttrs = attrs.length > 0;
  const usageHint = /\b(negocio|fiesta|iglesia|karaoke|casa|evento)\b/.exec(text)?.[1] || null;

  const transparencyLine = hasDescription || hasAttrs
    ? "Con la ficha actual te puedo orientar por uso y compararlo con opciones parecidas."
    : "No veo todos los datos técnicos completos en la ficha, pero te puedo orientar por uso y alternativas.";

  if (usageHint) {
    return `Para ${usageHint}, ${productName}${productBrand} puede servir según el tamaño del espacio y el nivel de exigencia. En ${productCategory} conviene revisar potencia, conectividad, facilidad de uso y durabilidad. ${transparencyLine}`;
  }

  if (/\b(que tiene de bueno|por que comprar|me conviene|vale la pena)\b/.test(text)) {
    return `${productName}${productBrand} puede ser buena opción si buscas algo de ${productCategory} alineado con un uso concreto. Lo importante es validar si lo quieres para casa, negocio, iglesia, fiesta o karaoke para confirmar que sí te conviene. ${transparencyLine}`;
  }

  if (/\b(caracteristicas|caracteristica|especificaciones|ficha tecnica|ficha)\b/.test(text)) {
    return `Te ayudo. Sobre ${productName}${productBrand}, te puedo explicar sus características clave según la información disponible en la ficha y cómo eso te beneficia según tu uso. ${transparencyLine}`;
  }

  if (/\b(que mas necesito con esto|completar|instalacion)\b/.test(text)) {
    return `Para completar ${productName}, normalmente se revisa conectividad y accesorios según el uso: cables adecuados, soporte/base y, si aplica, micrófono o equipo complementario. Si me dices exactamente cómo lo vas a usar, te digo qué sería lo mínimo recomendado.`;
  }

  return `Por lo que veo en la ficha, ${productName}${productBrand} puede ser buena opción dependiendo del uso. En ${productCategory} conviene validar potencia, conectividad y facilidad de instalación. Si me dices tu uso exacto, te ayudo a aterrizar la compra.`;
}

function normalizeCategoryFromPageContext(pageContext?: KoraPageContext | null) {
  if (!pageContext) return "";
  return normalize(pageContext.subcategorySlug || pageContext.categorySlug || pageContext.subcategoryName || pageContext.categoryName || "");
}

export function resolveContextualSellingResponse(params: {
  message: string;
  nlu: KoraNluResult | null;
  memory?: ContextualSellingMemory;
  pageContext?: KoraPageContext | null;
}): ContextualSellingResponse | null {
  const message = params.message || "";
  const text = normalize(message);
  const guidanceIntent = detectGuidanceIntent(text);
  const detectedAttribute = findAttributeKnowledge(text);
  const detectedCategory = findCategoryKnowledge(text) || mapNluCategoryToKnowledge(params.nlu?.category) || null;
  const pageContextCategory = params.pageContext
    ? findCategoryKnowledge(`${params.pageContext.categoryName || ""} ${params.pageContext.subcategoryName || ""} ${params.pageContext.categorySlug || ""} ${params.pageContext.subcategorySlug || ""}`)
    : null;
  const memoryCategory = mapMemoryCategoryToKnowledge(params.memory?.last_recommendation_category || params.memory?.preferred_category || null);

  if (isBusinessOrSupportIntent(params.nlu)) return null;

  const debug: KoraContextualSellingDebug = {
    detectedAttribute: detectedAttribute?.id || null,
    detectedCategoryKnowledge: detectedCategory?.id || pageContextCategory?.id || null,
    detectedGuidanceIntent: guidanceIntent,
    pageContext: params.pageContext || undefined,
    relatedAttributes: detectedCategory?.relatedAttributes || [],
    categoryKnowledgeId: detectedCategory?.id || pageContextCategory?.id || null,
  };

  const asksSecurityComparison =
    /\b(diferencia( hay)? entre|comparar|cual es mejor|cuál es mejor|que conviene|qué conviene)\b/.test(text) &&
    /\b(camara wifi|cámara wifi|wifi|inalambrica|inalámbrica)\b/.test(text) &&
    /\b(dvr|grabador|sistema|circuito cerrado|cctv)\b/.test(text);

  if (!asksSecurityComparison && detectedAttribute && (guidanceIntent === "attribute_explanation" || guidanceIntent === "compatibility_question" || /\b(diferencia entre|cual es la diferencia)\b/.test(text))) {
    const answer = `${detectedAttribute.label}: ${detectedAttribute.explanation} ${detectedAttribute.commercialBenefit} ${detectedAttribute.salesAngle}`;
    return {
      handled: true,
      answer,
      actions: [
        { id: "ctx-attr-products", label: "Ver opciones relacionadas", type: "prompt", value: `Quiero ver ${detectedAttribute.relatedCategories[0] || "productos relacionados"}` },
        { id: "ctx-attr-advice", label: "Recomiéndame según mi uso", type: "prompt", value: "No sé cuál comprar" },
      ],
      suggestions: detectedAttribute.suggestedFollowups.slice(0, 3),
      memory_updates: { last_answer_domain: "products", last_conversation_topic: "products" },
      debug: { ...debug, contextualSellingReason: "attribute_explained", matchedKnowledgeSource: "attribute" },
    };
  }

  if (/\bdiferencia( hay)? entre\b/.test(text) && /\b(activa|pasiva)\b/.test(text)) {
    return {
      handled: true,
      answer:
        "Una cabina activa ya trae amplificador interno y es más fácil de usar. Una cabina pasiva necesita amplificador externo para funcionar. Si quieres practicidad, normalmente conviene activa; si ya tienes planta o buscas montaje más profesional, puede servir pasiva.",
      actions: [
        { id: "ctx-diff-active", label: "Ver cabinas activas", type: "prompt", value: "Quiero cabinas activas" },
        { id: "ctx-diff-passive", label: "Ver cabinas pasivas", type: "prompt", value: "Quiero cabinas pasivas" },
      ],
      suggestions: ["¿La necesitas para casa, negocio, iglesia o fiesta?", "¿Quieres Bluetooth?", "¿La necesitas recargable?"],
      memory_updates: { last_answer_domain: "products", last_conversation_topic: "products" },
      debug: { ...debug, contextualSellingReason: "active_vs_passive", matchedKnowledgeSource: "heuristic" },
    };
  }

  if (asksSecurityComparison) {
    return {
      handled: true,
      answer:
        "Una cámara WiFi normalmente funciona individualmente y se puede ver desde el celular por app; es práctica para casa o negocio pequeño. Un sistema con DVR conecta varias cámaras a un grabador y sirve para seguridad más completa con grabación centralizada. Si quieres algo fácil, WiFi puede servir; si quieres varias cámaras y monitoreo más completo, conviene DVR.",
      actions: [
        { id: "ctx-diff-wifi", label: "Ver cámaras WiFi", type: "prompt", value: "Quiero cámaras WiFi" },
        { id: "ctx-diff-dvr", label: "Ver sistemas DVR", type: "prompt", value: "Quiero sistemas DVR" },
      ],
      suggestions: ["¿Es para casa o negocio?", "¿Quieres una cámara o varias?", "¿Necesitas visión nocturna?"],
      memory_updates: { last_answer_domain: "products", last_conversation_topic: "products" },
      debug: { ...debug, contextualSellingReason: "wifi_vs_dvr", matchedKnowledgeSource: "heuristic" },
    };
  }

  const asksChurchAudio =
    /\b(iglesia|templo|culto)\b/.test(text) &&
    /\b(sonido|cabina|cabinas|microfono|micrófono|parlante|equipo)\b/.test(text);
  if (asksChurchAudio) {
    return {
      handled: true,
      answer:
        "Para iglesia normalmente conviene revisar si necesitas solo voz, música o ambas cosas. Lo más común es mirar cabinas activas, micrófonos y, si conectan varios equipos, una consola. Para ayudarte mejor: ¿es una iglesia pequeña, mediana o grande?",
      actions: [
        { id: "ctx-church-cabinas", label: "Ver cabinas para iglesia", type: "prompt", value: "Quiero cabinas para iglesia" },
        { id: "ctx-church-mics", label: "Ver micrófonos para iglesia", type: "prompt", value: "Quiero micrófonos para iglesia" },
      ],
      suggestions: ["Iglesia pequeña", "Iglesia mediana", "Iglesia grande"],
      memory_updates: { last_answer_domain: "products", last_conversation_topic: "products" },
      debug: { ...debug, contextualSellingReason: "church_audio_guidance", matchedKnowledgeSource: "heuristic" },
    };
  }

  if (/\bdiferencia( hay)? entre\b/.test(text) && /\b(inalambrico|inalámbrico|sin cable)\b/.test(text) && /\b(alambrico|alámbrico|con cable)\b/.test(text)) {
    return {
      handled: true,
      answer:
        "El micrófono alámbrico es más estable y económico porque va por cable. El inalámbrico da más movilidad para presentaciones o karaoke, pero depende de batería y calidad del sistema. Si priorizas estabilidad/precio: alámbrico. Si priorizas movimiento: inalámbrico.",
      actions: [
        { id: "ctx-diff-mic-wire", label: "Ver micrófonos alámbricos", type: "prompt", value: "Quiero micrófonos alámbricos" },
        { id: "ctx-diff-mic-wireless", label: "Ver micrófonos inalámbricos", type: "prompt", value: "Quiero micrófonos inalámbricos" },
      ],
      suggestions: ["¿Lo usarás para cantar o hablar?", "¿Es para iglesia, evento o karaoke?", "¿Lo usará una o dos personas?"],
      memory_updates: { last_answer_domain: "products", last_conversation_topic: "products" },
      debug: { ...debug, contextualSellingReason: "wired_vs_wireless_mic", matchedKnowledgeSource: "heuristic" },
    };
  }

  if (/\bdiferencia( hay)? entre\b/.test(text) && /\b(sencillo|un microfono|un micrófono)\b/.test(text) && /\b(doble|dos microfonos|dos micrófonos)\b/.test(text)) {
    return {
      handled: true,
      answer:
        "Micrófono sencillo incluye una unidad y suele ser más económico cuando participa una sola persona. Micrófono doble incluye dos micrófonos y conviene para karaoke, dúos o presentaciones de dos personas al mismo tiempo.",
      actions: [
        { id: "ctx-diff-mic-single", label: "Ver micrófono sencillo", type: "prompt", value: "Quiero micrófono sencillo" },
        { id: "ctx-diff-mic-double", label: "Ver micrófono doble", type: "prompt", value: "Quiero micrófono doble" },
      ],
      suggestions: ["¿Lo usará una persona o dos?", "¿Será para karaoke o iglesia?", "¿Prefieres con cable o inalámbrico?"],
      memory_updates: { last_answer_domain: "products", last_conversation_topic: "products" },
      debug: { ...debug, contextualSellingReason: "single_vs_double_mic", matchedKnowledgeSource: "heuristic" },
    };
  }

  if (guidanceIntent === "category_guidance" && detectedCategory) {
    return {
      handled: true,
      answer: `${detectedCategory.shortIntro} Para elegir bien, te recomiendo revisar: ${detectedCategory.buyingCriteria.slice(0, 5).join(", ")}. ${detectedCategory.salesGuidance}`,
      actions: [
        { id: "ctx-cat-rec", label: "Recomiéndame una opción", type: "prompt", value: `Recomiéndame ${detectedCategory.label}` },
        { id: "ctx-cat-budget", label: "Quiero algo económico", type: "prompt", value: `Quiero ${detectedCategory.label} económico` },
      ],
      suggestions: detectedCategory.commonQuestions.slice(0, 3),
      memory_updates: { last_answer_domain: "products", last_conversation_topic: "products" },
      debug: { ...debug, contextualSellingReason: "category_guidance", matchedKnowledgeSource: "category" },
    };
  }

  if (guidanceIntent === "category_guidance" && !detectedCategory) {
    const guidedCategory = pageContextCategory || memoryCategory || null;
    if (guidedCategory) {
      return {
        handled: true,
        answer: `${guidedCategory.shortIntro} Para orientarte mejor, dime el uso principal y te ayudo a escoger rápido.`,
        actions: [
          { id: "ctx-ambig-rec", label: "Recomiéndame una opción", type: "prompt", value: `Recomiéndame ${guidedCategory.label}` },
          { id: "ctx-ambig-budget", label: "Quiero algo económico", type: "prompt", value: `Quiero ${guidedCategory.label} económico` },
        ],
        suggestions: guidedCategory.commonQuestions.slice(0, 3),
        memory_updates: { last_answer_domain: "products", last_conversation_topic: "products" },
        debug: { ...debug, contextualSellingReason: "ambiguous_guidance_with_context", matchedKnowledgeSource: "category" },
      };
    }
    return {
      handled: true,
      answer: "Claro. ¿Buscas sonido, cámaras, instrumentos, televisores o cables? Así te puedo orientar mejor.",
      actions: [
        { id: "ctx-ambig-sound", label: "Sonido", type: "prompt", value: "Quiero sonido" },
        { id: "ctx-ambig-cameras", label: "Cámaras", type: "prompt", value: "Quiero cámaras de seguridad" },
        { id: "ctx-ambig-instruments", label: "Instrumentos", type: "prompt", value: "Quiero instrumentos musicales" },
      ],
      suggestions: ["Busco cabinas", "Busco micrófonos", "Busco televisores"],
      memory_updates: { last_answer_domain: "products", last_conversation_topic: "products" },
      debug: { ...debug, contextualSellingReason: "ambiguous_guidance_without_context", matchedKnowledgeSource: "heuristic" },
    };
  }

  if (!guidanceIntent) {
    if (/\b(quiero algo con buen bajo|buen bajo|bajo potente|que pegue duro|que suene duro)\b/.test(text)) {
      return {
        handled: true,
        answer:
          "Si buscas buen bajo, conviene mirar tamaño del parlante, potencia y calidad del equipo. Para fiestas o negocio suelen funcionar mejor opciones de 12 o 15 pulgadas; para carro, habría que mirar car audio o subwoofer. ¿Lo necesitas para casa, fiesta, negocio o carro?",
        actions: [
          { id: "ctx-bass-cabinas", label: "Ver cabinas con buen bajo", type: "prompt", value: "Quiero cabinas con buen bajo" },
          { id: "ctx-bass-caraudio", label: "Ver car audio/subwoofer", type: "prompt", value: "Quiero car audio con buen bajo" },
        ],
        suggestions: ["Para fiesta", "Para negocio", "Para carro"],
        memory_updates: { last_answer_domain: "products", last_conversation_topic: "products" },
        debug: { ...debug, contextualSellingReason: "bass_guidance", matchedKnowledgeSource: "heuristic" },
      };
    }

    if (/\b(iglesia|fiesta|negocio|karaoke)\b/.test(text) && /\b(quiero algo para|necesito sonido para|necesito|quiero)\b/.test(text)) {
      const hasSound = /\b(sonido|cabina|parlante|speaker|audio)\b/.test(text);
      const hasMic = /\b(microfono|micrófono)\b/.test(text);
      const cat = hasMic
        ? findCategoryKnowledgeById("microfonos")
        : hasSound
          ? findCategoryKnowledgeById("cabinas_activas")
          : pageContextCategory || memoryCategory || findCategoryKnowledgeById("cabinas_activas");
      if (cat) {
        return {
          handled: true,
          answer: `${cat.shortIntro} Para orientarte mejor, dime si priorizas potencia, bajo, portabilidad o precio.`,
          actions: [
            { id: "ctx-usage2-rec", label: "Recomiéndame por uso", type: "prompt", value: `Recomiéndame ${cat.label} según mi uso` },
            { id: "ctx-usage2-cheap", label: "Algo económico", type: "prompt", value: `Quiero ${cat.label} económicas` },
          ],
          suggestions: cat.commonQuestions.slice(0, 3),
          memory_updates: { last_answer_domain: "products", last_conversation_topic: "products" },
          debug: { ...debug, contextualSellingReason: "usage_guidance_without_context", matchedKnowledgeSource: "category" },
        };
      }
    }

    if (/\b(microfono|micrófono)\b/.test(text) && /\b(cantar|canto|karaoke)\b/.test(text)) {
      const cat = findCategoryKnowledgeById("microfonos");
      if (cat) {
        return {
          handled: true,
          answer: `${cat.shortIntro} ${cat.salesGuidance}`,
          actions: [
            { id: "ctx-mic-rec", label: "Recomiéndame micrófonos", type: "prompt", value: "Recomiéndame micrófonos para cantar" },
            { id: "ctx-mic-wire", label: "Con cable o inalámbrico", type: "prompt", value: "Diferencia entre micrófono alámbrico e inalámbrico" },
          ],
          suggestions: cat.commonQuestions.slice(0, 3),
          memory_updates: { last_answer_domain: "products", last_conversation_topic: "products" },
          debug: { ...debug, contextualSellingReason: "microphone_singing_guidance", matchedKnowledgeSource: "category" },
        };
      }
    }

    if ((/\b(teclado|piano)\b/.test(text) && /\b(aprender|principiante|inicio)\b/.test(text)) || (/\bguitarra\b/.test(text) && /\b(principiante|aprender|inicio)\b/.test(text))) {
      const cat = /\bguitarra\b/.test(text) ? findCategoryKnowledgeById("guitarras") : findCategoryKnowledgeById("teclados_pianos");
      if (cat) {
        const isGuitar = /\bguitarra\b/.test(text);
        const beginnerAnswer = isGuitar
          ? "Para principiante conviene una guitarra cómoda, fácil de tocar y de precio razonable. Si es para aprender desde cero, primero hay que saber si la quieres clásica, acústica o eléctrica, y si es para niño, joven o adulto."
          : "Para aprender conviene un teclado fácil de usar, con buen sonido básico y funciones de práctica. Si es para empezar desde cero, puede servir uno básico; si es para clases más serias, conviene revisar cantidad de teclas y funciones.";
        return {
          handled: true,
          answer: beginnerAnswer,
          actions: [
            { id: "ctx-learn-rec", label: "Ver opciones para empezar", type: "prompt", value: `Recomiéndame ${cat.label} para principiante` },
            { id: "ctx-learn-cheap", label: "Opciones económicas", type: "prompt", value: `Quiero ${cat.label} económicas` },
          ],
          suggestions: cat.commonQuestions.slice(0, 3),
          memory_updates: { last_answer_domain: "products", last_conversation_topic: "products" },
          debug: { ...debug, contextualSellingReason: "beginner_guidance", matchedKnowledgeSource: "category" },
        };
      }
    }

    if ((/\b(quiero algo para|necesito sonido para)\b/.test(text) || /\b(iglesia|fiesta|negocio|karaoke)\b/.test(text)) && (pageContextCategory || memoryCategory)) {
      const cat = pageContextCategory || memoryCategory;
      if (cat) {
        return {
          handled: true,
          answer: `${cat.shortIntro} Para orientarte mejor, dime si priorizas potencia, portabilidad, bajo o precio.`,
          actions: [
            { id: "ctx-usage-rec", label: "Recomiéndame por uso", type: "prompt", value: `Recomiéndame ${cat.label} según mi uso` },
            { id: "ctx-usage-cheap", label: "Algo económico", type: "prompt", value: `Quiero ${cat.label} económicas` },
          ],
          suggestions: cat.commonQuestions.slice(0, 3),
          memory_updates: { last_answer_domain: "products", last_conversation_topic: "products" },
          debug: { ...debug, contextualSellingReason: "usage_guidance_with_context", matchedKnowledgeSource: "category" },
        };
      }
    }

    if (/\b(no se cual comprar|no sé cuál comprar|ayudame a escoger|ayúdame a escoger|cual me recomiendas|cuál me recomiendas)\b/.test(text)) {
      const guidedCategory = pageContextCategory || memoryCategory || null;
      if (guidedCategory) {
        return {
          handled: true,
          answer: `${guidedCategory.shortIntro} Para elegir mejor, dime el uso: casa, negocio, iglesia, karaoke o fiesta.`,
          actions: [
            { id: "ctx-soft-rec", label: "Recomiéndame una opción", type: "prompt", value: `Recomiéndame ${guidedCategory.label}` },
            { id: "ctx-soft-cheap", label: "Quiero algo económico", type: "prompt", value: `Quiero ${guidedCategory.label} económico` },
          ],
          suggestions: guidedCategory.commonQuestions.slice(0, 3),
          memory_updates: { last_answer_domain: "products", last_conversation_topic: "products" },
          debug: { ...debug, contextualSellingReason: "soft_ambiguous_guidance_context", matchedKnowledgeSource: "category" },
        };
      }
      return {
        handled: true,
        answer: "Claro. ¿Qué estás buscando exactamente: sonido, cámaras, instrumentos, televisores o cables?",
        actions: [
          { id: "ctx-soft-sound", label: "Sonido", type: "prompt", value: "Quiero cabinas y sonido" },
          { id: "ctx-soft-cameras", label: "Cámaras", type: "prompt", value: "Quiero cámaras de seguridad" },
          { id: "ctx-soft-instruments", label: "Instrumentos", type: "prompt", value: "Quiero instrumentos musicales" },
        ],
        suggestions: ["Quiero algo para fiesta", "Necesito sonido para iglesia", "Busco algo para negocio"],
        memory_updates: { last_answer_domain: "products", last_conversation_topic: "products" },
        debug: { ...debug, contextualSellingReason: "soft_ambiguous_guidance_no_context", matchedKnowledgeSource: "heuristic" },
      };
    }
  }

  if (guidanceIntent === "product_advice" && params.pageContext?.pageType === "product") {
    return {
      handled: true,
      answer: buildProductAdviceFromPageContext(params.pageContext, text),
      actions: [
        { id: "ctx-product-compare", label: "Comparar con otras opciones", type: "prompt", value: "Compáralo con algo similar" },
        { id: "ctx-product-budget", label: "Ver una opción más económica", type: "prompt", value: "Muéstrame una opción más económica" },
      ],
      suggestions: ["¿Este sirve para negocio?", "¿Este sirve para fiesta?", "¿Qué más necesito con esto?"],
      memory_updates: { last_answer_domain: "products", last_conversation_topic: "products" },
      debug: { ...debug, contextualSellingReason: "product_page_advice", matchedKnowledgeSource: "page_context" },
    };
  }

  if (guidanceIntent === "objection_handling") {
    return {
      handled: true,
      answer:
        "Buena observación. El precio suele variar por potencia real, materiales, conectividad, durabilidad y respaldo. Si quieres, te ordeno opciones más económicas y también opciones de mejor desempeño para que compares mejor.",
      actions: [
        { id: "ctx-obj-cheap", label: "Ver más económicas", type: "prompt", value: "Quiero opciones más baratas" },
        { id: "ctx-obj-better", label: "Ver mejor desempeño", type: "prompt", value: "Quiero una opción más potente" },
      ],
      suggestions: ["¿La necesitas para casa, negocio o fiesta?", "¿Cuál es tu presupuesto?", "¿Priorizas potencia o calidad?"],
      memory_updates: { last_answer_domain: "products", last_conversation_topic: "products" },
      debug: { ...debug, contextualSellingReason: "objection_handling", matchedKnowledgeSource: "heuristic" },
    };
  }

  if (guidanceIntent === "compatibility_question") {
    return {
      handled: true,
      answer:
        "Para decirte compatibilidad exacta, necesito saber qué equipo quieres conectar con cuál. Por ejemplo: celular a cabina, micrófono a consola, consola a cabina o computador a TV. Con eso te digo la conexión correcta.",
      actions: [
        { id: "ctx-comp-cable", label: "Necesito cable para micrófono", type: "prompt", value: "Qué cable necesito para micrófono" },
        { id: "ctx-comp-hdmi", label: "Necesito cable HDMI", type: "prompt", value: "Qué cable HDMI necesito" },
      ],
      suggestions: ["Celular a cabina", "Micrófono a consola", "Computador a TV"],
      memory_updates: { last_answer_domain: "products", last_conversation_topic: "products" },
      debug: { ...debug, contextualSellingReason: "compatibility_guidance", matchedKnowledgeSource: "heuristic" },
    };
  }

  if (params.pageContext && (params.pageContext.pageType === "category" || params.pageContext.pageType === "subcategory") && pageContextCategory) {
    const currentPageCategory = normalizeCategoryFromPageContext(params.pageContext);
    const alreadyPromptedCategory = normalize(params.memory?.last_category_opening_context || "");
    if (currentPageCategory && currentPageCategory === alreadyPromptedCategory) return null;
    return {
      handled: true,
      answer: pageContextCategory.suggestedOpeningMessage,
      actions: [
        { id: "ctx-page-rec", label: "Recomiéndame una opción", type: "prompt", value: `Recomiéndame ${pageContextCategory.label}` },
        { id: "ctx-page-criteria", label: "Ayúdame a elegir", type: "prompt", value: "No sé cuál comprar" },
      ],
      suggestions: pageContextCategory.commonQuestions.slice(0, 3),
      memory_updates: {
        last_answer_domain: "products",
        last_conversation_topic: "products",
        preferred_category: currentPageCategory || null,
        last_category_opening_context: currentPageCategory || null,
      },
      debug: { ...debug, contextualSellingReason: "category_page_opening", matchedKnowledgeSource: "page_context" },
    };
  }

  return null;
}
