import type { KoraCategoryKnowledge } from "./knowledge-types";

export const KORA_CATEGORY_KNOWLEDGE: KoraCategoryKnowledge[] = [
  {
    id: "cabinas_activas",
    label: "Cabinas activas",
    aliases: ["cabinas activas", "cabina activa", "parlantes activos", "speaker activo", "bafle activo", "sonido activo"],
    shortIntro: "Las cabinas activas ya traen amplificador incorporado, por eso son prácticas y fáciles de usar.",
    commonQuestions: [
      "¿La necesitas para casa, negocio, iglesia, karaoke o fiesta?",
      "¿Quieres que tenga Bluetooth?",
      "¿Necesitas batería recargable?",
      "¿Qué tamaño de espacio quieres cubrir?",
      "¿Te importa más potencia, bajo o portabilidad?",
    ],
    buyingCriteria: ["potencia", "pulgadas del parlante", "bluetooth", "batería", "entradas", "micrófono incluido", "portabilidad", "uso principal"],
    usageContexts: ["casa", "negocio", "iglesia", "karaoke", "fiesta", "evento pequeño", "reunión"],
    relatedAttributes: ["cabina_activa", "bluetooth", "recargable", "pulgadas_parlante", "potencia", "bajo", "usb", "fm", "auxiliar", "material", "peso", "autonomia", "conectividad", "alimentacion"],
    salesGuidance: "Para la mayoría de clientes, una cabina activa es la opción más fácil porque no requiere amplificador aparte.",
    suggestedOpeningMessage: "Veo que estás mirando cabinas activas. Puedo ayudarte a elegir según el uso: casa, negocio, iglesia, karaoke o fiesta.",
  },
  {
    id: "cabinas_pasivas",
    label: "Cabinas pasivas",
    aliases: ["cabinas pasivas", "cabina pasiva", "parlantes pasivos", "speaker pasivo", "bafle pasivo"],
    shortIntro: "Las cabinas pasivas necesitan amplificador externo para funcionar.",
    commonQuestions: ["¿Ya tienes amplificador o planta?", "¿Qué potencia maneja tu amplificador?", "¿Es para instalación fija o evento?", "¿Cuántas cabinas necesitas?"],
    buyingCriteria: ["compatibilidad con amplificador", "potencia", "impedancia si está disponible", "tamaño", "uso profesional", "instalación"],
    usageContexts: ["iglesias", "eventos", "sonido profesional", "instalaciones fijas", "negocios"],
    relatedAttributes: ["cabina_pasiva", "amplificador", "potencia", "pulgadas_parlante", "bajo", "material", "peso", "conectividad"],
    salesGuidance: "Antes de recomendar cabina pasiva, confirmar si el cliente tiene amplificador compatible.",
    suggestedOpeningMessage: "Veo que estás mirando cabinas pasivas. Para elegir bien necesito saber si ya tienes amplificador o planta.",
  },
  {
    id: "microfonos",
    label: "Micrófonos",
    aliases: ["micrófonos", "microfonos", "mic", "micro", "micrófono", "microfono"],
    shortIntro: "Los micrófonos pueden ser alámbricos o inalámbricos, sencillos o dobles, según el uso.",
    commonQuestions: ["¿Lo necesitas para cantar o hablar?", "¿Es para iglesia, karaoke, evento o clase?", "¿Prefieres con cable o inalámbrico?", "¿Lo usará una o dos personas?", "¿Ya tienes cabina, consola o amplificador?"],
    buyingCriteria: ["alámbrico o inalámbrico", "sencillo o doble", "alcance", "tipo de uso", "compatibilidad", "batería", "calidad de voz"],
    usageContexts: ["karaoke", "iglesia", "conferencia", "clase", "evento", "canto", "presentación"],
    relatedAttributes: ["microfono_alambrico", "microfono_inalambrico", "microfono_sencillo", "microfono_doble", "consola", "patron_polar", "alimentacion", "autonomia"],
    salesGuidance: "Si busca economía y estabilidad: alámbrico. Si necesita movilidad: inalámbrico.",
    suggestedOpeningMessage: "Veo que estás mirando micrófonos. Puedo ayudarte a elegir entre alámbrico, inalámbrico, sencillo o doble según el uso.",
  },
  {
    id: "amplificadores",
    label: "Amplificadores",
    aliases: ["amplificadores", "plantas", "power", "etapa", "poder", "planta de sonido"],
    shortIntro: "Los amplificadores dan potencia a parlantes o cabinas pasivas.",
    commonQuestions: ["¿Qué parlantes quieres conectar?", "¿Son cabinas pasivas?", "¿Es para iglesia, negocio o evento?", "¿Cuántos parlantes vas a usar?", "¿Ya tienes consola?"],
    buyingCriteria: ["potencia", "compatibilidad", "cantidad de salidas", "uso", "tipo de parlantes", "entradas disponibles"],
    usageContexts: ["iglesias", "eventos", "instalaciones", "sonido profesional", "negocios"],
    relatedAttributes: ["amplificador", "cabina_pasiva", "potencia", "consola", "voltaje", "alimentacion", "conectividad"],
    salesGuidance: "No recomendar amplificador sin conocer qué parlantes se conectarán.",
    suggestedOpeningMessage: "Veo que estás mirando amplificadores. Para ayudarte bien necesito saber qué parlantes o cabinas quieres conectar.",
  },
  {
    id: "consolas",
    label: "Consolas de sonido",
    aliases: ["consolas", "mixer", "mezcladoras", "mezclador", "consola de sonido", "consola de audio"],
    shortIntro: "Las consolas permiten conectar y controlar varias fuentes de audio.",
    commonQuestions: ["¿Cuántos micrófonos necesitas conectar?", "¿Vas a conectar instrumentos?", "¿Es para iglesia, evento, estudio o karaoke?", "¿Necesitas efectos?", "¿Necesitas Bluetooth o USB?"],
    buyingCriteria: ["cantidad de canales", "entradas", "efectos", "bluetooth", "usb", "facilidad de uso", "tamaño"],
    usageContexts: ["iglesias", "eventos", "estudios", "músicos", "karaoke", "conferencias"],
    relatedAttributes: ["consola", "microfono_alambrico", "microfono_inalambrico", "bluetooth", "usb", "numero_de_canales", "conectividad", "alimentacion"],
    salesGuidance: "Recomendar consola cuando necesita conectar varias fuentes y controlar mejor el sonido.",
    suggestedOpeningMessage: "Veo que estás mirando consolas. Puedo ayudarte según cuántos micrófonos, instrumentos o equipos necesitas conectar.",
  },
  {
    id: "camaras_seguridad",
    label: "Cámaras de seguridad",
    aliases: ["cámaras de seguridad", "camaras de seguridad", "seguridad", "cámaras", "camaras", "vigilancia", "circuito cerrado", "cctv"],
    shortIntro: "Las cámaras de seguridad ayudan a monitorear casas, negocios y espacios importantes.",
    commonQuestions: ["¿Es para casa o negocio?", "¿Necesitas una cámara o varias?", "¿Quieres ver desde el celular?", "¿Prefieres WiFi o sistema con DVR?", "¿Necesitas grabación nocturna?"],
    buyingCriteria: ["cantidad de cámaras", "wifi o dvr", "visión nocturna", "interior/exterior", "grabación", "app móvil", "instalación"],
    usageContexts: ["casa", "negocio", "bodega", "local", "oficina", "finca", "entrada"],
    relatedAttributes: ["dvr", "camara_wifi", "vision_nocturna", "micro_sd", "resistencia_ip", "voltaje", "conectividad"],
    salesGuidance: "Si quiere algo fácil y de una cámara: WiFi. Si quiere sistema completo de varias cámaras: DVR.",
    suggestedOpeningMessage: "Veo que estás mirando cámaras de seguridad. Puedo ayudarte a entender si te conviene una cámara WiFi o un sistema con DVR.",
  },
  {
    id: "camaras_wifi",
    label: "Cámaras WiFi",
    aliases: ["cámaras wifi", "camaras wifi", "cámara wifi", "camara wifi", "cámaras inalámbricas", "camaras inalambricas"],
    shortIntro: "Las cámaras WiFi son prácticas para monitoreo sencillo desde el celular.",
    commonQuestions: ["¿La necesitas para casa o negocio?", "¿Quieres grabar en microSD?", "¿La zona tiene buen WiFi?", "¿Es para interior o exterior?", "¿Necesitas visión nocturna?"],
    buyingCriteria: ["conexión wifi", "app", "microSD", "visión nocturna", "interior/exterior", "resolución", "movimiento si aplica"],
    usageContexts: ["casa", "local pequeño", "habitación", "mascotas", "entrada", "monitoreo básico"],
    relatedAttributes: ["camara_wifi", "vision_nocturna", "micro_sd", "resistencia_ip", "alimentacion", "autonomia"],
    salesGuidance: "Ideal cuando busca algo rápido, sencillo y con visualización desde el celular.",
    suggestedOpeningMessage: "Veo que estás mirando cámaras WiFi. Puedo ayudarte a elegir según si la necesitas para casa, negocio, interior o exterior.",
  },
  {
    id: "dvr_kits",
    label: "DVR y kits de seguridad",
    aliases: ["dvr", "kits de cámaras", "kits de camaras", "sistema de cámaras", "sistema de camaras", "grabador", "circuito cerrado"],
    shortIntro: "Los sistemas con DVR sirven cuando se necesitan varias cámaras y grabación centralizada.",
    commonQuestions: ["¿Cuántas cámaras necesitas?", "¿Es para casa, negocio o bodega?", "¿Quieres grabar todo el día?", "¿La instalación será cableada?", "¿Necesitas ver desde el celular?"],
    buyingCriteria: ["número de canales", "cantidad de cámaras", "disco duro", "visión nocturna", "interior/exterior", "app móvil", "instalación"],
    usageContexts: ["negocios", "casas grandes", "bodegas", "oficinas", "locales", "monitoreo completo"],
    relatedAttributes: ["dvr", "vision_nocturna", "micro_sd", "resistencia_ip", "voltaje"],
    salesGuidance: "Recomendar DVR cuando el cliente quiere sistema más serio, varias cámaras y grabación continua.",
    suggestedOpeningMessage: "Veo que estás mirando sistemas con DVR. Puedo ayudarte a calcular si necesitas 4, 8 o más cámaras según el espacio.",
  },
  {
    id: "televisores",
    label: "Televisores",
    aliases: ["televisores", "tv", "televisor", "smart tv", "pantalla"],
    shortIntro: "Para elegir televisor importan pulgadas, si es Smart TV, resolución y lugar de uso.",
    commonQuestions: ["¿Es para sala, habitación o negocio?", "¿Qué tamaño buscas?", "¿Lo quieres Smart TV?", "¿Lo usarás para Netflix o YouTube?", "¿A qué distancia lo vas a ver?"],
    buyingCriteria: ["pulgadas", "smart tv", "resolución", "entradas HDMI", "marca", "uso", "presupuesto"],
    usageContexts: ["sala", "habitación", "negocio", "entretenimiento", "videojuegos", "publicidad"],
    relatedAttributes: ["pulgadas_tv", "smart_tv", "hdmi", "conectividad", "voltaje"],
    salesGuidance: "Para habitación puede bastar tamaño moderado. Para sala o negocio suele convenir más grande.",
    suggestedOpeningMessage: "Veo que estás mirando televisores. Puedo ayudarte a elegir el tamaño ideal según si es para sala, habitación o negocio.",
  },
  {
    id: "guitarras",
    label: "Guitarras",
    aliases: ["guitarras", "guitarra", "guitarra acústica", "guitarra acustica", "guitarra eléctrica", "guitarra electrica", "guitarra clásica", "guitarra clasica"],
    shortIntro: "Las guitarras se eligen según nivel, edad, estilo y si busca acústica, clásica o eléctrica.",
    commonQuestions: ["¿Es para principiante o avanzado?", "¿Es para niño, joven o adulto?", "¿Quieres acústica, clásica o eléctrica?", "¿Es para clases, regalo o presentación?", "¿Necesitas accesorios?"],
    buyingCriteria: ["tipo de guitarra", "comodidad", "tamaño", "nivel del usuario", "accesorios", "presupuesto"],
    usageContexts: ["aprendizaje", "clases", "regalos", "presentaciones", "iglesia", "música popular"],
    relatedAttributes: ["guitarra_principiante", "material", "peso", "numero_de_cuerdas", "compatibilidad"],
    salesGuidance: "Para principiantes conviene comodidad, precio razonable y accesorios básicos.",
    suggestedOpeningMessage: "Veo que estás mirando guitarras. Puedo ayudarte a elegir una buena opción para principiante, clases, regalo o presentación.",
  },
  {
    id: "teclados_pianos",
    label: "Teclados y pianos",
    aliases: ["teclados", "pianos", "teclado", "piano", "piano para aprender", "teclado para aprender"],
    shortIntro: "Los teclados para aprender deben ser prácticos y fáciles de usar para casa o clases.",
    commonQuestions: ["¿Es para niño o adulto?", "¿Es para aprender desde cero?", "¿Lo necesitas para clases?", "¿Buscas algo básico o más completo?", "¿Necesitas base o adaptador?"],
    buyingCriteria: ["cantidad de teclas", "funciones de aprendizaje", "sonidos", "sensibilidad si aplica", "accesorios", "presupuesto"],
    usageContexts: ["aprendizaje", "clases", "casa", "iglesia", "presentaciones básicas"],
    relatedAttributes: ["teclado_principiante", "numero_de_teclas", "alimentacion", "conectividad", "peso"],
    salesGuidance: "Para iniciar, recomendar opciones prácticas y económicas; para estudio serio, modelos más completos.",
    suggestedOpeningMessage: "Veo que estás mirando teclados. Puedo ayudarte a elegir uno para aprender, practicar en casa o usar en clases.",
  },
  {
    id: "cables",
    label: "Cables",
    aliases: ["cables", "cable", "cable de audio", "rca", "hdmi", "cable de red", "cable para sonido", "cable para micrófono"],
    shortIntro: "Para elegir un cable hay que saber qué equipo se conecta con qué otro equipo.",
    commonQuestions: ["¿Qué equipo quieres conectar?", "¿Qué entradas tiene cada equipo?", "¿Necesitas audio, video o red?", "¿Qué largo necesitas?", "¿Tienes foto de la entrada?"],
    buyingCriteria: ["tipo de conector", "largo", "uso", "compatibilidad", "calidad", "audio/video/red"],
    usageContexts: ["sonido", "televisores", "cámaras", "internet", "computadores", "instrumentos"],
    relatedAttributes: ["cable_audio", "rca", "hdmi", "compatibilidad", "longitud", "conectividad"],
    salesGuidance: "No recomendar cable sin saber origen y destino de conexión.",
    suggestedOpeningMessage: "Veo que estás mirando cables. Para ayudarte bien dime qué equipo quieres conectar y a qué otro equipo.",
  },
  {
    id: "car_audio",
    label: "Car audio",
    aliases: ["car audio", "sonido para carro", "audio carro", "parlantes carro", "bajo carro", "plantas carro"],
    shortIntro: "Car audio mejora el sonido del vehículo con radios, parlantes, plantas, bajos y accesorios.",
    commonQuestions: ["¿Qué carro tienes?", "¿Quieres más bajo, más volumen o Bluetooth?", "¿Ya tienes radio o planta?", "¿Quieres cambiar parlantes o armar sistema completo?", "¿Buscas algo económico o más fuerte?"],
    buyingCriteria: ["compatibilidad", "bajo", "potencia", "radio", "parlantes", "amplificador", "instalación"],
    usageContexts: ["carros", "sonido urbano", "bajo fuerte", "mejora de audio", "conectividad bluetooth"],
    relatedAttributes: ["car_audio", "bajo", "potencia", "bluetooth", "amplificador", "compatibilidad", "voltaje"],
    salesGuidance: "Primero preguntar qué quiere mejorar: bajo, volumen, calidad o conectividad.",
    suggestedOpeningMessage: "Veo que estás mirando car audio. Puedo ayudarte según si quieres más bajo, más volumen o Bluetooth para tu carro.",
  },
  {
    id: "instrumentos_salseros",
    label: "Instrumentos salseros",
    aliases: ["instrumentos salseros", "campanas", "güiros", "guiros", "maracas", "timbales", "percusión salsera", "percusion salsera"],
    shortIntro: "Los instrumentos salseros acompañan ritmos tropicales como salsa y música latina.",
    commonQuestions: ["¿Es para aprender o tocar en grupo?", "¿Buscas campana, güiro, maracas o timbal?", "¿Es para salsa, iglesia o presentación?", "¿Lo quieres personalizado?", "¿Es para principiante o músico?"],
    buyingCriteria: ["tipo de instrumento", "material", "tamaño", "sonido", "nivel del usuario", "uso"],
    usageContexts: ["salsa", "música tropical", "iglesias", "grupos", "escuelas", "presentaciones", "aprendizaje"],
    relatedAttributes: ["instrumentos_salseros", "material", "peso", "compatibilidad"],
    salesGuidance: "Para principiantes, orientar a maracas o güiro. Para grupos, campanas o timbal según uso.",
    suggestedOpeningMessage: "Veo que estás mirando instrumentos salseros. Puedo ayudarte a elegir entre campana, güiro, maracas o timbal según tu nivel y uso.",
  },
  {
    id: "luz_solar",
    label: "Luz solar",
    aliases: ["luz solar", "luces solares", "reflectores solares", "lámparas solares", "lamparas solares", "panel solar"],
    shortIntro: "Las luces solares iluminan exteriores aprovechando carga durante el día.",
    commonQuestions: ["¿Es para patio, entrada, finca o negocio?", "¿Recibe buen sol durante el día?", "¿La quieres para seguridad o decoración?", "¿Necesitas sensor de movimiento?", "¿Qué área quieres iluminar?"],
    buyingCriteria: ["exposición solar", "potencia de luz", "batería", "sensor", "resistencia exterior", "área de cobertura"],
    usageContexts: ["patios", "entradas", "fincas", "exteriores", "seguridad", "ahorro"],
    relatedAttributes: ["luz_solar", "resistencia_ip", "autonomia", "alimentacion"],
    salesGuidance: "Recomendar según espacio, exposición solar y si busca seguridad o iluminación general.",
    suggestedOpeningMessage: "Veo que estás mirando luces solares. Puedo ayudarte a elegir según si es para patio, entrada, finca o seguridad.",
  },
];

function normalize(value: string) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function findCategoryKnowledge(message: string): KoraCategoryKnowledge | null {
  const text = normalize(message);
  for (const row of KORA_CATEGORY_KNOWLEDGE) {
    if (row.aliases.some((alias) => text.includes(normalize(alias)))) return row;
  }
  return null;
}

export function findCategoryKnowledgeById(id?: string | null): KoraCategoryKnowledge | null {
  if (!id) return null;
  const probe = normalize(id);
  return KORA_CATEGORY_KNOWLEDGE.find((row) => normalize(row.id) === probe) || null;
}
