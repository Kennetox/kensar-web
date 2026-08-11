import type { ProductKnowledgeProfile, KnowledgeFact } from "./product-knowledge";

export type SalesAdvisorProduct = {
  id: number;
  name: string;
};

export type ProductSalesPitch = {
  product_id: number;
  summary: string;
  card_reason: string;
  used_facts: string[];
};

const VALUE_LABELS: Record<string, string> = {
  activa: "cabina activa",
  pasiva: "cabina pasiva",
  recargable: "equipo recargable",
  electrica: "guitarra eléctrica",
  acustica: "guitarra acústica",
  clasica: "guitarra clásica",
  electroacustica: "guitarra electroacústica",
  inalambrico: "micrófono inalámbrico",
  alambrico: "micrófono alámbrico",
  condensador: "micrófono de condensador",
  dinamico: "micrófono dinámico",
  bajo_electrico: "bajo eléctrico",
  amplificador_de_potencia: "amplificador de potencia",
  preamplificador: "preamplificador",
  interfaz_de_audio: "interfaz de audio",
  wifi_exterior_pan_tilt: "cámara WiFi para exterior con movimiento horizontal y vertical",
  parlante_portatil_bluetooth: "parlante portátil Bluetooth",
  bluetooth: "conexión Bluetooth",
  bluetooth_5_1: "Bluetooth 5.1",
  recarga_usb_c: "recarga por USB-C",
  carga_usb_c: "carga USB-C",
  proteccion_ip67: "protección IP67 contra agua y polvo",
  proteccion_ip65: "protección IP65 para exterior",
  bateria_hasta_12_horas: "hasta 12 horas de batería según el uso",
  vision_nocturna: "visión nocturna",
  resolucion_1080p: "resolución 1080p",
  cobertura_360_grados: "cobertura horizontal de 360°",
  deteccion_de_personas: "detección de personas",
  seguimiento_de_movimiento: "seguimiento de movimiento",
  audio_bidireccional: "audio bidireccional",
  ranura_micro_sd: "almacenamiento local mediante microSD",
  amplificador_externo: "un amplificador externo compatible",
  amplificacion_para_sonar_externamente: "amplificación externa",
  potencia_e_impedancia_compatibles: "verificar potencia e impedancia con las cabinas",
  entrada_compatible: "una entrada compatible en la consola, cabina o interfaz",
  entradas_y_salidas_compatibles: "compatibilidad de entradas y salidas con tu sistema",
  computador_y_conexion_compatible: "un computador y una conexión compatible",
  sistema_de_audio_compatible: "un sistema de audio con conexiones compatibles",
  wifi_2_4_ghz_y_alimentacion_dc: "WiFi de 2,4 GHz y alimentación DC",
  alimentacion_compatible: "una fuente de alimentación compatible",
  bateria_o_alimentacion_compatible: "batería o alimentación compatible",
  requiere_alimentacion_electrica: "necesita alimentación eléctrica para funcionar",
  autonomia_depende_del_volumen_y_contenido: "la autonomía real cambia según volumen y contenido",
  tarjeta_micro_sd_se_vende_por_separado: "la tarjeta microSD se compra por separado",
  almacenamiento_nube_requiere_suscripcion: "el almacenamiento en la nube requiere suscripción",
};

const FEATURE_BENEFITS: Record<string, string> = {
  bluetooth: "permite reproducir audio sin cable desde equipos compatibles",
  bluetooth_5_1: "permite transmitir audio inalámbrico desde equipos compatibles",
  recargable: "da movilidad cuando no hay una toma cercana",
  proteccion_ip67: "está preparada para uso portátil con exposición a agua y polvo dentro de esa certificación",
  proteccion_ip65: "está diseñada para resistir polvo y agua en instalaciones exteriores dentro de esa certificación",
  bateria_hasta_12_horas: "ofrece autonomía para uso portátil, dependiendo del volumen y el contenido",
  vision_nocturna: "permite vigilar también en condiciones de poca luz",
  resolucion_1080p: "entrega imagen Full HD para distinguir mejor los detalles",
  cobertura_360_grados: "reduce puntos ciegos al cubrir horizontalmente el entorno",
  deteccion_de_personas: "ayuda a separar alertas de personas de otros movimientos",
  seguimiento_de_movimiento: "puede mantener el movimiento dentro del encuadre",
  audio_bidireccional: "permite escuchar y hablar desde la cámara",
  ranura_micro_sd: "permite guardar grabaciones localmente con una tarjeta compatible",
  carga_usb_c: "facilita la recarga mediante USB-C",
  partyboost: "permite enlazar parlantes JBL compatibles",
};

const USE_BENEFITS: Record<string, string> = {
  interpretar_musica: "sirve para aprender, practicar o interpretar música según el instrumento",
  interpretacion_ritmica: "sirve para acompañamiento rítmico y ejecución musical",
  interpretar_y_aprender_musica: "está orientado a aprender, practicar e interpretar música",
  reproducir_y_amplificar_audio: "está pensado para reproducir y amplificar audio",
  capturar_voz_o_sonido: "está diseñado para capturar voz o sonido",
  amplificar_senal_de_audio: "entrega amplificación a un sistema de audio compatible",
  mezclar_y_controlar_fuentes_de_audio: "permite mezclar y controlar varias fuentes de audio",
  grabar_y_reproducir_audio_con_computador: "permite grabar y reproducir audio desde un computador compatible",
  procesar_y_ajustar_senal_de_audio: "permite ajustar y procesar la señal dentro del sistema de audio",
  amplificar_voz_de_forma_portatil: "permite proyectar la voz de forma portátil",
  monitoreo_y_vigilancia: "está orientado al monitoreo y la vigilancia",
  entretenimiento_y_visualizacion: "está orientado a entretenimiento y visualización",
  reproducir_musica_de_forma_portatil: "permite llevar y reproducir música con facilidad",
  vigilancia_exterior: "está diseñado para vigilar espacios exteriores",
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

function label(value: string) {
  const channelSubtype = value.match(/^mezcladora_(\d{1,2})_canales$/);
  if (channelSubtype) return `mezcladora de ${channelSubtype[1]} canales`;
  return VALUE_LABELS[value] || value.replace(/_/g, " ");
}

function splitSubtype(value: string | null) {
  return value ? value.split("+").filter(Boolean) : [];
}

function relevanceScore(value: string, query: string) {
  const normalizedValue = normalize(value.replace(/_/g, " "));
  const tokens = normalizedValue.split(" ").filter((token) => token.length >= 4);
  return tokens.reduce((score, token) => score + (query.includes(token) ? 2 : 0), 0);
}

function bestFact(facts: Array<KnowledgeFact<string>>, query: string) {
  return facts
    .filter((item) => item.confidence >= 0.68)
    .slice()
    .sort((a, b) => relevanceScore(b.value, query) - relevanceScore(a.value, query) || b.confidence - a.confidence)[0] || null;
}

export function knowledgeFitScore(profile: ProductKnowledgeProfile, query: string) {
  const normalizedQuery = normalize(query);
  const searchableFacts = [
    profile.classification.subtype?.value || "",
    ...profile.features.map((item) => item.value),
    ...profile.intended_uses.map((item) => item.value),
  ];
  let score = searchableFacts.reduce((total, value) => total + relevanceScore(value, normalizedQuery), 0) * 2;
  const requestedChannels = normalizedQuery.match(/\b(\d{1,2})\s*(?:canales|entradas|microfonos|micros)\b/);
  const knownChannels = profile.classification.subtype?.value.match(/mezcladora_(\d{1,2})_canales/);
  if (requestedChannels && knownChannels) {
    const difference = Math.abs(Number(knownChannels[1]) - Number(requestedChannels[1]));
    score += Math.max(0, 12 - difference);
  }
  return Math.min(24, score);
}

export function productMeetsKnowledgeConstraints(profile: ProductKnowledgeProfile, query: string) {
  const normalizedQuery = normalize(query);
  if (profile.classification.family.value === "consolas") {
    const requested = normalizedQuery.match(/\b(\d{1,2})\s*(?:canales|entradas|microfonos|micros)\b/);
    if (requested) {
      const known = profile.classification.subtype?.value.match(/mezcladora_(\d{1,2})_canales/);
      if (!known) return false;
      if (Number(known[1]) < Number(requested[1])) return false;
    }
  }
  if (profile.classification.family.value === "televisores") {
    const requested = normalizedQuery.match(/\b(24|32|40|42|43|50|55|60|65|70|75)\s*(?:pulgadas|pulg)?\b/);
    if (requested) {
      const productSize = normalize(profile.product_ref.name).match(/\b(24|32|40|42|43|50|55|60|65|70|75)\b/);
      if (!productSize || productSize[1] !== requested[1]) return false;
    }
  }
  return true;
}

export function buildProductSalesPitch(
  product: SalesAdvisorProduct,
  profile: ProductKnowledgeProfile,
  query: string
): ProductSalesPitch {
  const normalizedQuery = normalize(query);
  const subtypes = splitSubtype(profile.classification.subtype?.value || null);
  const intendedUse = bestFact(profile.intended_uses, normalizedQuery);
  const feature = bestFact(profile.features, normalizedQuery);
  const requirement = bestFact(profile.requirements, normalizedQuery);
  const limitation = bestFact(profile.limitations, normalizedQuery);
  const statements: string[] = [];
  const usedFacts: string[] = [];

  if (subtypes.length) {
    statements.push(`Es una opción tipo ${subtypes.map(label).join(" y ")}`);
    usedFacts.push(...subtypes);
  } else {
    statements.push(`Pertenece a la familia ${label(profile.classification.family.value)}`);
    usedFacts.push(profile.classification.family.value);
  }

  if (intendedUse) {
    statements.push(USE_BENEFITS[intendedUse.value] || `está orientado a ${label(intendedUse.value)}`);
    usedFacts.push(intendedUse.value);
  }

  if (feature) {
    statements.push(FEATURE_BENEFITS[feature.value] || `incluye ${label(feature.value)}`);
    usedFacts.push(feature.value);
  }
  if (requirement) {
    statements.push(`Requisito a confirmar: ${label(requirement.value)}`);
    usedFacts.push(requirement.value);
  }
  if (limitation) {
    statements.push(`Ten presente que ${label(limitation.value)}`);
    usedFacts.push(limitation.value);
  }

  const summary = `${statements.join(". ")}.`;
  return {
    product_id: product.id,
    summary,
    card_reason: statements.slice(0, 2).join(". ") + ".",
    used_facts: usedFacts,
  };
}

export function buildSalesRecommendationNarrative(input: {
  lead: string;
  query: string;
  rows: Array<{ product: SalesAdvisorProduct; knowledge: ProductKnowledgeProfile }>;
}) {
  const pitches = input.rows.slice(0, 3).map(({ product, knowledge }) =>
    buildProductSalesPitch(product, knowledge, input.query)
  );
  if (!pitches.length) return { answer: input.lead, pitches };

  const lines = pitches.map((pitch, index) => {
    const name = input.rows[index].product.name;
    return `${index + 1}. ${name}: ${pitch.summary}`;
  });
  return {
    answer: `${input.lead}\n\n${lines.join("\n")}\n\nSi me confirmas cuál te interesa, revisamos compatibilidad y qué necesitas para dejarlo funcionando.`,
    pitches,
  };
}
