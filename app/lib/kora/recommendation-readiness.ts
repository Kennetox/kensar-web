import type { KoraNluResult } from "./entities";
import type { KoraProductFamily } from "./product-family-guards";

type ReadinessMemory = {
  last_recommendation_category?: string | null;
  preferred_category?: string | null;
  last_recommendation_query?: string | null;
  last_query?: string | null;
  last_recommended_products?: Array<{ id: number }>;
  last_recommendation_type?: string | null;
  last_qualification_family?: KoraProductFamily | null;
  last_qualification_missing_dimensions?: string[];
  last_qualification_attempts?: number | null;
  last_qualification_answer?: string | null;
};

export type RecommendationClarification = {
  family: KoraProductFamily;
  answer: string;
  actions: Array<{ id: string; label: string; type: "prompt"; value: string }>;
  suggestions: string[];
  missing_dimensions: string[];
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

function includesAny(text: string, tokens: string[]) {
  return tokens.some((token) => text.includes(normalize(token)));
}

function hasBudget(text: string, nlu: KoraNluResult | null) {
  return Boolean(
    nlu?.budget ||
      /\b(hasta|maximo|presupuesto|economico|economica|barato|barata|premium|profesional)\b/.test(text)
  );
}

function hasActiveRecommendationMemory(memory?: ReadinessMemory) {
  return Boolean(memory?.last_recommended_products?.length);
}

function wantsImmediateRecommendation(value: string) {
  const text = normalize(value);
  return includesAny(text, [
    "muestrame opciones",
    "muestrame ya",
    "quiero ver opciones",
    "dame opciones",
    "recomiendame ya",
    "no me preguntes",
    "solo muestrame",
  ]);
}

function isUncertainAnswer(value: string) {
  const text = normalize(value);
  return includesAny(text, ["no se", "no estoy seguro", "no estoy segura", "lo normal", "cualquiera", "como sea"]);
}

function detectFamily(text: string): KoraProductFamily | null {
  const rules: Array<{ family: KoraProductFamily; aliases: string[] }> = [
    { family: "amplificadores", aliases: ["amplificador", "planta de sonido", "preamplificador"] },
    { family: "interfaces_audio", aliases: ["interfaz de audio", "interface de audio"] },
    { family: "procesamiento_audio", aliases: ["ecualizador", "crossover", "procesador de audio"] },
    { family: "consolas", aliases: ["consola", "mezcladora", "mixer"] },
    { family: "megafonos", aliases: ["megafono"] },
    { family: "guitarras", aliases: ["guitarra"] },
    { family: "instrumentos_cuerda", aliases: ["bajo electrico", "requinto", "ukelele", "violin"] },
    { family: "percusion", aliases: ["bateria", "bongo", "campana", "conga", "timbal", "guiro", "maraca", "percusion"] },
    { family: "microfonos", aliases: ["microfono"] },
    { family: "cabinas", aliases: ["cabina", "parlante", "bafle"] },
    { family: "seguridad", aliases: ["camara", "cctv", "dvr", "nvr"] },
    { family: "teclados", aliases: ["teclado", "piano", "organeta"] },
    { family: "televisores", aliases: ["televisor", "smart tv"] },
  ];
  let best: { family: KoraProductFamily; index: number } | null = null;
  for (const rule of rules) {
    for (const alias of rule.aliases) {
      const index = text.indexOf(normalize(alias));
      if (index >= 0 && (!best || index < best.index)) best = { family: rule.family, index };
    }
  }
  return best?.family || null;
}

function keyboardClarification(text: string, nlu: KoraNluResult | null): RecommendationClarification | null {
  const hasUse = includesAny(text, ["aprender", "principiante", "iglesia", "presentacion", "evento", "estudio", "producir", "tocar"]);
  const hasFormat = /\b(49|54|61|76|88)\b/.test(text) || includesAny(text, ["teclas", "sensible", "contrapesado", "piano", "organeta"]);
  if (hasUse && (hasFormat || hasBudget(text, nlu))) return null;
  if (hasFormat) {
    return {
      family: "teclados",
      answer: "Entendido, ya tengo presente el formato del teclado. Solo necesito saber si es para aprender en casa o para tocar en iglesia, eventos o presentaciones.",
      actions: [
        { id: "clarify-keyboard-format-learn", label: "Aprender en casa", type: "prompt", value: "Lo quiero para aprender y practicar en casa" },
        { id: "clarify-keyboard-format-stage", label: "Tocar en público", type: "prompt", value: "Lo quiero para iglesia, eventos o presentaciones" },
      ],
      suggestions: ["¿Qué presupuesto tienes?", "¿Es para principiante?"],
      missing_dimensions: ["uso", "presupuesto"],
    };
  }
  if (hasUse) {
    return {
      family: "teclados",
      answer: "Perfecto, ya entendí el uso. ¿Prefieres algo sencillo y compacto o 61 teclas o más para tener mayor rango y funciones?",
      actions: [
        { id: "clarify-keyboard-use-simple", label: "Sencillo y compacto", type: "prompt", value: "Prefiero un teclado sencillo y compacto" },
        { id: "clarify-keyboard-use-61", label: "61 teclas o más", type: "prompt", value: "Prefiero un teclado de 61 teclas o más" },
      ],
      suggestions: ["¿Qué presupuesto tienes?", "¿Quieres sensación de piano?"],
      missing_dimensions: ["numero_tipo_teclas", "presupuesto"],
    };
  }
  return {
    family: "teclados",
    answer: "Para recomendarte un teclado necesito saber si es para aprender, tocar en iglesia o presentarte, y si prefieres algo sencillo o con más teclas y funciones.",
    actions: [
      { id: "clarify-keyboard-learn", label: "Aprender desde cero", type: "prompt", value: "Quiero un teclado para aprender desde cero y busco algo sencillo" },
      { id: "clarify-keyboard-church", label: "Iglesia o presentaciones", type: "prompt", value: "Quiero un teclado para iglesia o presentaciones, de 61 teclas o más" },
      { id: "clarify-keyboard-piano", label: "Sensación de piano", type: "prompt", value: "Quiero un piano electrónico para estudiar con sensación de piano" },
    ],
    suggestions: ["¿Cuántas teclas necesitas?", "¿Es para principiante?", "¿Qué presupuesto tienes?"],
    missing_dimensions: [hasUse ? "numero_tipo_teclas" : "uso", "presupuesto"],
  };
}

function amplifierClarification(text: string): RecommendationClarification | null {
  const hasLoad = includesAny(text, ["cabina pasiva", "parlante pasivo", "ohm", "impedancia", "watts", "w rms", "modelo"]);
  if (hasLoad) return null;
  return {
    family: "amplificadores",
    answer: "Para elegir una planta o amplificador sin arriesgar las cabinas necesito saber qué cabinas pasivas vas a conectar: modelo, potencia RMS e impedancia. Con esos datos verificamos compatibilidad.",
    actions: [
      { id: "clarify-amplifier-have-speakers", label: "Ya tengo las cabinas", type: "prompt", value: "Ya tengo cabinas pasivas; te digo modelo, potencia RMS e impedancia" },
      { id: "clarify-amplifier-full-system", label: "Armar sistema completo", type: "prompt", value: "Quiero armar amplificador y cabinas compatibles desde cero" },
      { id: "clarify-amplifier-unsure", label: "No conozco esos datos", type: "prompt", value: "No conozco la potencia ni impedancia de mis cabinas; ayúdame a identificarlas" },
    ],
    suggestions: ["¿Qué modelo son las cabinas?", "¿Cuántas vas a conectar?", "¿Qué impedancia tienen?"],
    missing_dimensions: ["cabinas_objetivo", "potencia_rms", "impedancia"],
  };
}

function consoleClarification(text: string, nlu: KoraNluResult | null): RecommendationClarification | null {
  const hasUse = includesAny(text, ["iglesia", "evento", "dj", "podcast", "estudio", "grupo", "banda", "en vivo"]);
  const hasInputs = /\b(2|4|6|8|10|12|16|18|24|32)\s*(canales|entradas|microfonos|micros)\b/.test(text) || includesAny(text, ["varios microfonos", "muchas entradas"]);
  if (hasUse && (hasInputs || hasBudget(text, nlu))) return null;
  if (hasInputs) {
    return {
      family: "consolas",
      answer: "Perfecto, ya tengo presente cuántas entradas necesitas. Solo dime si la usarás en iglesia o eventos, para DJ, o para grabación y streaming.",
      actions: [
        { id: "clarify-console-inputs-live", label: "Iglesia o eventos", type: "prompt", value: "La usaré para iglesia, presentaciones o eventos en vivo" },
        { id: "clarify-console-inputs-record", label: "Grabación o streaming", type: "prompt", value: "La usaré para grabación, podcast o streaming" },
      ],
      suggestions: ["¿Necesitas conexión USB?", "¿Qué presupuesto tienes?"],
      missing_dimensions: ["uso", "conectividad"],
    };
  }
  if (hasUse) {
    return {
      family: "consolas",
      answer: "Entendido el uso. Ahora solo necesito saber cuántos micrófonos e instrumentos conectarás al mismo tiempo.",
      actions: [
        { id: "clarify-console-use-small", label: "2 a 4 fuentes", type: "prompt", value: "Conectaré entre 2 y 4 micrófonos o instrumentos" },
        { id: "clarify-console-use-medium", label: "6 a 10 fuentes", type: "prompt", value: "Conectaré entre 6 y 10 micrófonos o instrumentos" },
      ],
      suggestions: ["¿Necesitas USB?", "¿Qué presupuesto tienes?"],
      missing_dimensions: ["numero_entradas", "conectividad"],
    };
  }
  return {
    family: "consolas",
    answer: "Para elegir la consola correcta necesito saber cuántos micrófonos e instrumentos conectarás y si es para iglesia, eventos, DJ o grabación.",
    actions: [
      { id: "clarify-console-small", label: "2 a 4 fuentes", type: "prompt", value: "Necesito una consola para 2 a 4 micrófonos o fuentes de audio" },
      { id: "clarify-console-medium", label: "6 a 10 fuentes", type: "prompt", value: "Necesito una consola para iglesia o eventos con 6 a 10 entradas" },
      { id: "clarify-console-recording", label: "Grabación o streaming", type: "prompt", value: "Necesito una consola para grabación o streaming y conectar varios micrófonos" },
    ],
    suggestions: ["¿Cuántos micrófonos?", "¿Conectarás instrumentos?", "¿Necesitas USB?"],
    missing_dimensions: [hasUse ? "numero_entradas" : "uso", "conectividad"],
  };
}

function interfaceClarification(text: string, nlu: KoraNluResult | null): RecommendationClarification | null {
  const hasUse = includesAny(text, ["podcast", "voz", "instrumento", "guitarra", "grabar", "grabacion", "streaming"]);
  const hasInputs = /\b(1|2|4|8)\s*(entradas|canales|microfonos|micros)\b/.test(text) || includesAny(text, ["una entrada", "dos entradas"]);
  if (hasUse && (hasInputs || hasBudget(text, nlu))) return null;
  if (hasInputs) {
    return {
      family: "interfaces_audio",
      answer: "Bien, ya sé cuántas fuentes quieres conectar. ¿La necesitas principalmente para grabar música o para podcast y streaming?",
      actions: [
        { id: "clarify-interface-inputs-music", label: "Grabar música", type: "prompt", value: "La necesito para grabar voz e instrumentos" },
        { id: "clarify-interface-inputs-stream", label: "Podcast o streaming", type: "prompt", value: "La necesito para podcast o streaming" },
      ],
      suggestions: ["¿Windows, Mac o celular?", "¿Usarás micrófono de condensador?"],
      missing_dimensions: ["fuentes_a_grabar", "dispositivo"],
    };
  }
  if (hasUse) {
    return {
      family: "interfaces_audio",
      answer: "Perfecto, ya entendí qué quieres grabar. ¿Usarás una sola fuente o dos micrófonos o instrumentos al mismo tiempo?",
      actions: [
        { id: "clarify-interface-use-one", label: "Una fuente", type: "prompt", value: "Usaré una voz o instrumento a la vez" },
        { id: "clarify-interface-use-two", label: "Dos simultáneas", type: "prompt", value: "Usaré dos micrófonos o instrumentos al mismo tiempo" },
      ],
      suggestions: ["¿Windows, Mac o celular?", "¿Qué presupuesto tienes?"],
      missing_dimensions: ["numero_entradas", "dispositivo"],
    };
  }
  return {
    family: "interfaces_audio",
    answer: "Para recomendarte una interfaz necesito saber qué grabarás, cuántas fuentes usarás al mismo tiempo y a qué computador o dispositivo la conectarás.",
    actions: [
      { id: "clarify-interface-one", label: "Una voz o instrumento", type: "prompt", value: "Quiero grabar una voz o instrumento a la vez en computador" },
      { id: "clarify-interface-two", label: "Dos fuentes simultáneas", type: "prompt", value: "Quiero grabar dos micrófonos o instrumentos al mismo tiempo" },
      { id: "clarify-interface-podcast", label: "Podcast o streaming", type: "prompt", value: "Necesito una interfaz para podcast o streaming en computador" },
    ],
    suggestions: ["¿Cuántas entradas?", "¿Windows, Mac o celular?", "¿Usarás micrófono de condensador?"],
    missing_dimensions: [hasUse ? "numero_entradas" : "fuentes_a_grabar", "dispositivo"],
  };
}

function stringInstrumentClarification(text: string, nlu: KoraNluResult | null): RecommendationClarification | null {
  const hasUse = includesAny(text, ["aprender", "principiante", "grupo", "banda", "presentacion", "iglesia", "profesional"]);
  const isBass = includesAny(text, ["bajo electrico"]);
  const hasBassSystem = includesAny(text, ["amplificador", "cabina", "ya tengo", "desde cero"]);
  if (hasUse && (!isBass || hasBassSystem || hasBudget(text, nlu))) return null;
  return {
    family: "instrumentos_cuerda",
    answer: isBass
      ? "Para orientarte con el bajo necesito saber tu nivel y si ya tienes amplificador, porque el instrumento necesita amplificación y cable compatibles para sonar externamente."
      : "Para elegir bien necesito saber si estás empezando o ya tocas, y si lo usarás para estudiar, tocar en grupo o presentarte.",
    actions: [
      { id: "clarify-string-beginner", label: "Estoy empezando", type: "prompt", value: "Estoy empezando y quiero un instrumento de cuerda para aprender" },
      { id: "clarify-string-group", label: "Tocar en grupo", type: "prompt", value: "Ya sé tocar y lo necesito para ensayar o tocar en grupo" },
      { id: "clarify-string-full", label: "Necesito equipo completo", type: "prompt", value: "Quiero un bajo eléctrico y también necesito amplificación compatible" },
    ],
    suggestions: ["¿Qué nivel tienes?", "¿Es para aprender o presentarte?", "¿Ya tienes amplificador?"],
    missing_dimensions: [hasUse ? "amplificacion_si_aplica" : "nivel_uso", "presupuesto"],
  };
}

function percussionClarification(text: string, nlu: KoraNluResult | null): RecommendationClarification | null {
  const hasInstrument = includesAny(text, ["bateria", "bongo", "campana", "conga", "timbal", "guiro", "maraca"]);
  const hasUse = includesAny(text, ["aprender", "principiante", "salsa", "iglesia", "grupo", "banda", "presentacion"]);
  if (hasInstrument && (hasUse || hasBudget(text, nlu))) return null;
  if (hasInstrument) {
    return {
      family: "percusion",
      answer: "Perfecto, ya sé qué instrumento buscas. ¿Es para comenzar a aprender o para tocar en grupo, iglesia o presentaciones?",
      actions: [
        { id: "clarify-percussion-instrument-learn", label: "Estoy empezando", type: "prompt", value: "Es para comenzar a aprender percusión" },
        { id: "clarify-percussion-instrument-group", label: "Tocar en grupo", type: "prompt", value: "Es para tocar en grupo, iglesia o presentaciones" },
      ],
      suggestions: ["¿Qué presupuesto tienes?", "¿Qué ritmo tocarás?"],
      missing_dimensions: ["uso_nivel", "presupuesto"],
    };
  }
  return {
    family: "percusion",
    answer: "En percusión cambia mucho la recomendación según el instrumento y el uso. ¿Buscas aprender, completar un grupo de salsa o equipar una iglesia o presentación?",
    actions: [
      { id: "clarify-percussion-learn", label: "Aprender percusión", type: "prompt", value: "Quiero un instrumento de percusión para principiante" },
      { id: "clarify-percussion-salsa", label: "Grupo de salsa", type: "prompt", value: "Busco bongo, campana o percusión para tocar salsa en grupo" },
      { id: "clarify-percussion-drums", label: "Batería", type: "prompt", value: "Busco una batería para aprender o tocar en grupo" },
    ],
    suggestions: ["¿Qué instrumento buscas?", "¿Es para principiante?", "¿Para qué ritmo o grupo?"],
    missing_dimensions: [hasInstrument ? "uso_nivel" : "instrumento", "presupuesto"],
  };
}

function megaphoneClarification(text: string, nlu: KoraNluResult | null): RecommendationClarification | null {
  const hasScale = includesAny(text, ["personas", "colegio", "calle", "exterior", "evento", "negocio", "recorrido"]);
  const hasPower = includesAny(text, ["recargable", "pilas", "bateria", "usb"]);
  if (hasScale && (hasPower || hasBudget(text, nlu))) return null;
  if (hasPower) {
    return {
      family: "megafonos",
      answer: "Perfecto, tendré presente cómo quieres alimentarlo. Solo dime si será para un grupo pequeño o para exterior y eventos.",
      actions: [
        { id: "clarify-megaphone-power-small", label: "Grupo pequeño", type: "prompt", value: "Lo usaré con un grupo pequeño y en recorridos cortos" },
        { id: "clarify-megaphone-power-outdoor", label: "Exterior o evento", type: "prompt", value: "Lo usaré en exterior o eventos con muchas personas" },
      ],
      suggestions: ["¿Cuántas personas?", "¿Qué presupuesto tienes?"],
      missing_dimensions: ["escala_uso", "presupuesto"],
    };
  }
  return {
    family: "megafonos",
    answer: "Para elegir un megáfono necesito saber dónde lo usarás, para cuántas personas aproximadamente y si prefieres batería recargable o pilas.",
    actions: [
      { id: "clarify-megaphone-small", label: "Grupo pequeño", type: "prompt", value: "Necesito un megáfono para un grupo pequeño y recorridos cortos" },
      { id: "clarify-megaphone-outdoor", label: "Exterior o evento", type: "prompt", value: "Necesito un megáfono recargable para exterior o eventos" },
    ],
    suggestions: ["¿Interior o exterior?", "¿Cuántas personas?", "¿Lo prefieres recargable?"],
    missing_dimensions: [hasScale ? "alimentacion" : "escala_uso", "presupuesto"],
  };
}

function processorClarification(text: string): RecommendationClarification | null {
  const hasProblem = includesAny(text, ["dividir frecuencias", "ecualizar", "ajustar", "subwoofer", "vias", "realimentacion", "frecuencias"]);
  const hasSystem = includesAny(text, ["cabinas", "amplificador", "consola", "sistema", "activo", "pasivo"]);
  if (hasProblem && hasSystem) return null;
  if (hasProblem) {
    return {
      family: "procesamiento_audio",
      answer: "Entendido el ajuste que quieres hacer. Para verificar compatibilidad, dime qué consola, amplificador y cabinas tienes actualmente.",
      actions: [
        { id: "clarify-processor-problem-have-system", label: "Ya tengo el sistema", type: "prompt", value: "Ya tengo consola, amplificador y cabinas; te comparto los modelos" },
        { id: "clarify-processor-problem-build", label: "Armar desde cero", type: "prompt", value: "Estoy armando el sistema desde cero y necesito equipos compatibles" },
      ],
      suggestions: ["¿Tus cabinas son activas o pasivas?", "¿Qué modelos tienes?"],
      missing_dimensions: ["sistema_actual"],
    };
  }
  if (hasSystem) {
    return {
      family: "procesamiento_audio",
      answer: "Ya tengo presente tu sistema. ¿Quieres separar frecuencias entre bajos y cabinas o corregir y ecualizar el sonido?",
      actions: [
        { id: "clarify-processor-system-split", label: "Separar frecuencias", type: "prompt", value: "Quiero dividir frecuencias entre subwoofer y cabinas" },
        { id: "clarify-processor-system-eq", label: "Ajustar el sonido", type: "prompt", value: "Quiero ecualizar y corregir el sonido del sistema" },
      ],
      suggestions: ["¿Qué problema escuchas?", "¿Usas subwoofer?"],
      missing_dimensions: ["problema_a_resolver"],
    };
  }
  return {
    family: "procesamiento_audio",
    answer: "Antes de recomendar un ecualizador o crossover necesito saber qué problema quieres resolver y qué consola, amplificador y cabinas componen tu sistema.",
    actions: [
      { id: "clarify-processor-crossover", label: "Separar frecuencias", type: "prompt", value: "Necesito un crossover para dividir frecuencias entre bajos y cabinas de mi sistema" },
      { id: "clarify-processor-eq", label: "Ajustar el sonido", type: "prompt", value: "Necesito un ecualizador para ajustar el sonido de consola, amplificador y cabinas" },
      { id: "clarify-processor-unsure", label: "No sé cuál necesito", type: "prompt", value: "Tengo un sistema de sonido pero no sé si necesito ecualizador o crossover" },
    ],
    suggestions: ["¿Qué equipos tienes?", "¿Quieres separar bajos y medios?", "¿Qué problema escuchas?"],
    missing_dimensions: [hasProblem ? "sistema_actual" : "problema_a_resolver"],
  };
}

export function buildRecommendationQualificationQuery(query: string, memory?: ReadinessMemory) {
  const text = normalize(query);
  const continuesQualification = Boolean(
    memory?.last_recommendation_type === "qualification" &&
      memory.last_recommendation_query &&
      text.length <= 120 &&
      !detectFamily(text)
  );
  return continuesQualification ? `${memory?.last_recommendation_query || ""} ${query}`.trim() : query;
}

function dimensionLabel(value: string) {
  const labels: Record<string, string> = {
    uso: "el uso",
    uso_nivel: "tu nivel y uso",
    uso_escala: "el espacio o cantidad de personas",
    escala: "el tamaño del espacio",
    escala_uso: "dónde y para cuántas personas",
    subtipo: "el tipo",
    numero_entradas: "cuántas entradas necesitas",
    numero_tipo_teclas: "el número y tipo de teclas",
    fuentes_a_grabar: "qué vas a grabar",
    dispositivo: "el dispositivo al que lo conectarás",
    compatibilidad: "a qué equipo lo conectarás",
    tipo_sistema: "el tipo de sistema",
    entorno: "si será interior o exterior",
    cantidad: "cuántas unidades necesitas",
    sistema_actual: "qué equipos tienes",
    problema_a_resolver: "qué quieres corregir",
    tamano_o_presupuesto: "el tamaño o presupuesto",
    presupuesto: "tu presupuesto",
  };
  return labels[value] || value.replace(/_/g, " ");
}

function avoidRepeatedClarification(
  clarification: RecommendationClarification,
  latestQuery: string,
  memory?: ReadinessMemory
) {
  if (!memory?.last_qualification_answer) return clarification;
  if (normalize(memory.last_qualification_answer) !== normalize(clarification.answer)) return clarification;
  const missing = clarification.missing_dimensions.slice(0, 2).map(dimensionLabel);
  const preference = includesAny(normalize(latestQuery), ["potente", "potencia", "duro"])
    ? "que lo quieres potente"
    : includesAny(normalize(latestQuery), ["economico", "economica", "barato", "barata"])
      ? "que buscas algo económico"
      : includesAny(normalize(latestQuery), ["inalambrico", "bluetooth"])
        ? "que prefieres una opción inalámbrica"
        : "lo que acabas de decirme";
  return {
    ...clarification,
    answer: `Sí te entendí: tengo presente ${preference}. Solo me falta precisar ${missing.join(" y ")} para recomendarte sin adivinar.`,
    actions: clarification.actions.slice(0, 2),
    suggestions: clarification.suggestions.slice(0, 2),
  };
}

function guitarClarification(text: string, nlu: KoraNluResult | null): RecommendationClarification | null {
  const hasSubtype = includesAny(text, ["electrica", "acustica", "clasica", "electroacustica"]);
  const hasUse = includesAny(text, ["aprender", "principiante", "rock", "casa", "clases", "reunion", "evento", "iglesia", "grabacion"]);
  const mentionsChild = includesAny(text, ["hijo", "hija", "nino", "nina", "menor"]);
  const enough = hasSubtype && (hasUse || hasBudget(text, nlu)) && !mentionsChild;
  if (enough) return null;

  if (mentionsChild) {
    return {
      family: "guitarras",
      answer:
        "Para recomendarle una guitarra adecuada necesito saber la edad o estatura aproximada y si apenas va a aprender. Eso cambia el tamaño y el tipo que realmente le conviene.",
      actions: [
        { id: "clarify-guitar-child", label: "Es para un niño y está empezando", type: "prompt", value: "Es para un niño principiante; ayúdame a elegir el tamaño" },
        { id: "clarify-guitar-teen", label: "Es para joven o adulto", type: "prompt", value: "Es para joven o adulto principiante; quiero una guitarra para aprender" },
      ],
      suggestions: ["¿Qué edad tiene?", "¿Ya sabe tocar?", "¿Prefieren acústica o eléctrica?"],
      missing_dimensions: ["edad_tamano", "nivel", "subtipo"],
    };
  }

  if (hasSubtype) {
    const subtype = includesAny(text, ["electroacustica"])
      ? "electroacústica"
      : includesAny(text, ["electrica"])
        ? "eléctrica"
        : includesAny(text, ["clasica"])
          ? "clásica"
          : "acústica";
    return {
      family: "guitarras",
      answer:
        `Perfecto, entonces nos enfocamos en una guitarra ${subtype}. ` +
        "¿Es para comenzar a aprender o ya tienes experiencia? Con eso te muestro opciones que realmente se ajusten a ti.",
      actions: [
        {
          id: "clarify-guitar-subtype-beginner",
          label: "Estoy empezando",
          type: "prompt",
          value: "Estoy empezando y la quiero para aprender en casa",
        },
        {
          id: "clarify-guitar-subtype-experienced",
          label: "Ya sé tocar",
          type: "prompt",
          value: "Ya sé tocar y la quiero para ensayar, reuniones o presentaciones",
        },
      ],
      suggestions: ["¿Qué presupuesto tienes?", "¿La usarás en casa o presentaciones?"],
      missing_dimensions: ["uso_nivel", "presupuesto"],
    };
  }

  if (hasUse) {
    return {
      family: "guitarras",
      answer:
        "Ya entiendo para qué la necesitas. Ahora dime qué sonido prefieres: una acústica o clásica para tocar sin amplificador, o una eléctrica para conectarla a un amplificador.",
      actions: [
        {
          id: "clarify-guitar-use-acoustic",
          label: "Acústica o clásica",
          type: "prompt",
          value: "Prefiero una guitarra acústica o clásica",
        },
        {
          id: "clarify-guitar-use-electric",
          label: "Eléctrica",
          type: "prompt",
          value: "Prefiero una guitarra eléctrica para usar con amplificador",
        },
      ],
      suggestions: ["¿Necesitas amplificador?", "¿Qué presupuesto tienes?"],
      missing_dimensions: ["subtipo", "presupuesto"],
    };
  }

  return {
    family: "guitarras",
    answer:
      "Antes de mostrarte guitarras, dime cuál se acerca más a tu idea: aprender en casa, tocar rock con amplificador o una acústica para reuniones. Así evito recomendarte un tipo que no te sirva.",
    actions: [
      { id: "clarify-guitar-learn", label: "Aprender en casa", type: "prompt", value: "Quiero una guitarra acústica o clásica para aprender en casa" },
      { id: "clarify-guitar-rock", label: "Tocar rock", type: "prompt", value: "Quiero una guitarra eléctrica para tocar rock" },
      { id: "clarify-guitar-gathering", label: "Reuniones y canciones", type: "prompt", value: "Quiero una guitarra acústica para tocar en reuniones" },
    ],
    suggestions: ["¿Es para principiante?", "¿Acústica o eléctrica?", "¿Qué presupuesto tienes?"],
    missing_dimensions: [hasSubtype ? "uso" : "subtipo", hasBudget(text, nlu) ? "uso" : "presupuesto"],
  };
}

function cabinetClarification(text: string, nlu: KoraNluResult | null): RecommendationClarification | null {
  const hasUse = Boolean(nlu?.usage_context) || includesAny(text, ["casa", "fiesta", "evento", "iglesia", "negocio", "karaoke"]);
  const hasScale = includesAny(text, ["pequeno", "pequena", "mediano", "mediana", "grande", "personas", "salon", "aire libre"]);
  const hasFeature = includesAny(text, ["activa", "pasiva", "recargable", "bluetooth", "potente", "bajo", "pulgadas"]);
  if (hasUse && (hasScale || hasFeature || hasBudget(text, nlu))) return null;

  if (isUncertainAnswer(text)) {
    return {
      family: "cabinas",
      answer: "No hay problema. Hagámoslo sencillo: ¿la usarás principalmente en casa o para una fiesta o evento?",
      actions: [
        { id: "clarify-cabinet-unsure-home", label: "Casa o reunión", type: "prompt", value: "La usaré en casa o reuniones pequeñas" },
        { id: "clarify-cabinet-unsure-event", label: "Fiesta o evento", type: "prompt", value: "La usaré para fiestas o eventos" },
      ],
      suggestions: ["¿Para cuántas personas?", "¿Interior o exterior?"],
      missing_dimensions: ["uso_escala"],
    };
  }

  if (hasFeature) {
    const preference = includesAny(text, ["potente", "bajo"])
      ? "una cabina potente y con buen nivel de sonido"
      : includesAny(text, ["recargable"])
        ? "una cabina recargable"
        : includesAny(text, ["bluetooth"])
          ? "una cabina con Bluetooth"
          : includesAny(text, ["pasiva"])
            ? "una cabina pasiva"
            : "una cabina activa";
    return {
      family: "cabinas",
      answer:
        `Perfecto, entonces buscaremos ${preference}. ` +
        "Para saber qué capacidad te conviene, ¿será para una fiesta en espacio mediano o para un evento grande o al aire libre?",
      actions: [
        { id: "clarify-cabinet-feature-medium", label: "Fiesta o espacio mediano", type: "prompt", value: "La usaré para una fiesta en un espacio mediano" },
        { id: "clarify-cabinet-feature-large", label: "Evento grande o exterior", type: "prompt", value: "La usaré para un evento grande o al aire libre" },
      ],
      suggestions: ["¿Para cuántas personas?", "¿Qué presupuesto tienes?"],
      missing_dimensions: ["uso_escala", "presupuesto"],
    };
  }

  if (hasUse) {
    return {
      family: "cabinas",
      answer: "Entendido el uso. Ahora dime si el espacio es pequeño, mediano o grande para no recomendarte una cabina insuficiente o sobredimensionada.",
      actions: [
        { id: "clarify-cabinet-use-small", label: "Espacio pequeño", type: "prompt", value: "Es un espacio pequeño o una reunión de pocas personas" },
        { id: "clarify-cabinet-use-large", label: "Mediano o grande", type: "prompt", value: "Es un espacio mediano o grande con varias personas" },
      ],
      suggestions: ["¿Para cuántas personas?", "¿La necesitas recargable?"],
      missing_dimensions: ["escala", "presupuesto_o_caracteristica"],
    };
  }

  return {
    family: "cabinas",
    answer:
      "Para elegir una cabina necesito ubicar el espacio y el uso. No requiere lo mismo una reunión pequeña que una fiesta al aire libre. ¿Cuál se parece más a tu caso?",
    actions: [
      { id: "clarify-cabinet-small", label: "Casa o reunión pequeña", type: "prompt", value: "Quiero una cabina para casa o una reunión pequeña" },
      { id: "clarify-cabinet-medium", label: "Fiesta o espacio mediano", type: "prompt", value: "Quiero una cabina potente para una fiesta en espacio mediano" },
      { id: "clarify-cabinet-large", label: "Evento o espacio grande", type: "prompt", value: "Necesito sonido para un evento o espacio grande" },
    ],
    suggestions: ["¿Para cuántas personas?", "¿La necesitas recargable?", "¿Qué presupuesto tienes?"],
    missing_dimensions: [hasUse ? "escala" : "uso", "presupuesto_o_caracteristica"],
  };
}

function microphoneClarification(text: string, nlu: KoraNluResult | null): RecommendationClarification | null {
  const hasUse = includesAny(text, ["cantar", "karaoke", "iglesia", "hablar", "evento", "podcast", "grabar", "voz", "instrumento"]);
  const hasSubtype = includesAny(text, ["inalambrico", "alambrico", "condensador", "dinamico", "doble", "sencillo"]);
  if (hasUse && (hasSubtype || hasBudget(text, nlu))) return null;

  if (hasSubtype) {
    return {
      family: "microfonos",
      answer: "Perfecto, ya tengo presente el tipo de micrófono. ¿Lo usarás para cantar o hablar en vivo, o para grabar voz, podcast o streaming?",
      actions: [
        { id: "clarify-mic-subtype-live", label: "Cantar o hablar", type: "prompt", value: "Lo usaré para cantar, karaoke o hablar en vivo" },
        { id: "clarify-mic-subtype-record", label: "Grabar voz", type: "prompt", value: "Lo usaré para grabar voz, podcast o streaming" },
      ],
      suggestions: ["¿Una o dos personas?", "¿A qué equipo lo conectarás?"],
      missing_dimensions: ["uso", "compatibilidad"],
    };
  }

  if (hasUse) {
    return {
      family: "microfonos",
      answer: "Entendido el uso. ¿Prefieres libertad de movimiento con uno inalámbrico o priorizas economía y estabilidad con cable?",
      actions: [
        { id: "clarify-mic-use-wireless", label: "Inalámbrico", type: "prompt", value: "Prefiero un micrófono inalámbrico" },
        { id: "clarify-mic-use-wired", label: "Con cable", type: "prompt", value: "Prefiero un micrófono alámbrico" },
      ],
      suggestions: ["¿Una o dos personas?", "¿Qué presupuesto tienes?"],
      missing_dimensions: ["subtipo", "compatibilidad"],
    };
  }

  return {
    family: "microfonos",
    answer:
      "Para recomendarte un micrófono necesito saber si priorizas movilidad, economía o grabación. Eso define si conviene inalámbrico, alámbrico o de condensador.",
    actions: [
      { id: "clarify-mic-wireless", label: "Cantar con movilidad", type: "prompt", value: "Quiero un micrófono inalámbrico para cantar o karaoke" },
      { id: "clarify-mic-wired", label: "Cantar con cable", type: "prompt", value: "Quiero un micrófono alámbrico económico para cantar" },
      { id: "clarify-mic-recording", label: "Grabar voz o podcast", type: "prompt", value: "Quiero un micrófono de condensador para grabar voz o podcast" },
    ],
    suggestions: ["¿Lo quieres con cable?", "¿Lo usarán una o dos personas?", "¿A qué equipo lo conectarás?"],
    missing_dimensions: [hasUse ? "subtipo" : "uso", "compatibilidad"],
  };
}

function securityClarification(text: string, nlu: KoraNluResult | null): RecommendationClarification | null {
  const hasSystem = includesAny(text, ["wifi", "ip", "dvr", "nvr", "analogica", "kit"]);
  const hasScope = includesAny(text, ["una camara", "1 camara", "dos camaras", "2 camaras", "varias camaras", "kit"]);
  const hasEnvironment = includesAny(text, ["entrada", "interior", "exterior", "calle", "patio", "negocio", "casa", "bodega"]);
  if (hasSystem && (hasScope || hasEnvironment || hasBudget(text, nlu))) return null;

  if (hasSystem) {
    return {
      family: "seguridad",
      answer: "Perfecto, ya tengo presente el tipo de sistema. ¿La cámara irá en interior o exterior, y quieres cubrir un solo punto o varios?",
      actions: [
        { id: "clarify-security-system-indoor", label: "Interior, un punto", type: "prompt", value: "La necesito para interior y vigilar un solo punto" },
        { id: "clarify-security-system-outdoor", label: "Exterior o varios puntos", type: "prompt", value: "La necesito para exterior o para cubrir varios puntos" },
      ],
      suggestions: ["¿Necesitas grabación?", "¿Qué presupuesto tienes?"],
      missing_dimensions: ["entorno", "cantidad"],
    };
  }

  if (hasEnvironment || hasScope) {
    return {
      family: "seguridad",
      answer: "Ya entendí dónde y cuánto quieres vigilar. ¿Prefieres una cámara WiFi independiente o un sistema con DVR o NVR para grabar varias cámaras?",
      actions: [
        { id: "clarify-security-environment-wifi", label: "Cámara WiFi", type: "prompt", value: "Prefiero una cámara WiFi independiente" },
        { id: "clarify-security-environment-recorder", label: "Sistema con grabador", type: "prompt", value: "Prefiero un sistema de varias cámaras con DVR o NVR" },
      ],
      suggestions: ["¿Necesitas grabación continua?", "¿Qué presupuesto tienes?"],
      missing_dimensions: ["tipo_sistema", "grabacion"],
    };
  }

  return {
    family: "seguridad",
    answer:
      "Antes de mostrarte cámaras necesito saber si buscas una cámara WiFi independiente o un sistema con grabador para varias cámaras. También cambia si va en interior o exterior.",
    actions: [
      { id: "clarify-security-wifi", label: "Una cámara WiFi", type: "prompt", value: "Quiero una cámara WiFi para vigilar la entrada" },
      { id: "clarify-security-dvr", label: "Varias cámaras con DVR", type: "prompt", value: "Quiero un sistema de varias cámaras con DVR para un negocio" },
      { id: "clarify-security-help", label: "No sé cuál sistema", type: "prompt", value: "No sé si necesito cámara WiFi o DVR; ayúdame a elegir" },
    ],
    suggestions: ["¿Interior o exterior?", "¿Una cámara o varias?", "¿Necesitas grabación?"],
    missing_dimensions: [hasSystem ? "cantidad" : "tipo_sistema", hasEnvironment ? "grabacion" : "entorno"],
  };
}

function televisionClarification(text: string, nlu: KoraNluResult | null): RecommendationClarification | null {
  const hasSize = /\b(24|32|40|42|43|50|55|60|65|70|75)\b/.test(text) || includesAny(text, ["pulgadas"]);
  if (hasSize || hasBudget(text, nlu)) return null;

  return {
    family: "televisores",
    answer:
      "Para recomendarte un televisor necesito una referencia de tamaño o presupuesto. Para sala también ayuda saber aproximadamente a qué distancia lo vas a ver.",
    actions: [
      { id: "clarify-tv-32", label: "Hasta 32 pulgadas", type: "prompt", value: "Busco un televisor de hasta 32 pulgadas para mi sala" },
      { id: "clarify-tv-43", label: "Entre 40 y 43 pulgadas", type: "prompt", value: "Busco un televisor de 40 a 43 pulgadas para mi sala" },
      { id: "clarify-tv-50", label: "50 pulgadas o más", type: "prompt", value: "Busco un televisor de 50 pulgadas o más para mi sala" },
    ],
    suggestions: ["¿Qué distancia hay al televisor?", "¿Qué presupuesto tienes?", "¿Lo necesitas Smart TV?"],
    missing_dimensions: ["tamano_o_presupuesto"],
  };
}

export function resolveRecommendationClarification(input: {
  query: string;
  nlu: KoraNluResult | null;
  latestQuery?: string;
  memory?: ReadinessMemory;
}): RecommendationClarification | null {
  const text = normalize(input.query);
  if (!text || input.nlu?.followup_type || hasActiveRecommendationMemory(input.memory)) return null;

  const latestQuery = input.latestQuery || input.query;
  if (wantsImmediateRecommendation(latestQuery)) return null;

  const family = detectFamily(text);
  if (!family) return null;
  const attempts =
    input.memory?.last_qualification_family === family
      ? Number(input.memory.last_qualification_attempts) || 0
      : 0;
  if (attempts >= 2) return null;

  let clarification: RecommendationClarification | null = null;
  if (family === "guitarras") clarification = guitarClarification(text, input.nlu);
  if (family === "cabinas") clarification = cabinetClarification(text, input.nlu);
  if (family === "microfonos") clarification = microphoneClarification(text, input.nlu);
  if (family === "seguridad") clarification = securityClarification(text, input.nlu);
  if (family === "teclados") clarification = keyboardClarification(text, input.nlu);
  if (family === "televisores") clarification = televisionClarification(text, input.nlu);
  if (family === "amplificadores") clarification = amplifierClarification(text);
  if (family === "consolas") clarification = consoleClarification(text, input.nlu);
  if (family === "interfaces_audio") clarification = interfaceClarification(text, input.nlu);
  if (family === "instrumentos_cuerda") clarification = stringInstrumentClarification(text, input.nlu);
  if (family === "percusion") clarification = percussionClarification(text, input.nlu);
  if (family === "megafonos") clarification = megaphoneClarification(text, input.nlu);
  if (family === "procesamiento_audio") clarification = processorClarification(text);
  return clarification ? avoidRepeatedClarification(clarification, latestQuery, input.memory) : null;
}
