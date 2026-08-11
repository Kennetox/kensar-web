import { productMatchesFamily, type KoraProductFamily } from "./product-family-guards";
import {
  getApprovedProductKnowledgeEnrichment,
  type ProductEnrichmentFactGroup,
} from "./product-knowledge-enrichments";

export const KORA_PRODUCT_KNOWLEDGE_SCHEMA_VERSION = "kora-product-knowledge-v2" as const;

export type KnowledgeSource =
  | "catalog_name"
  | "catalog_category"
  | "catalog_description"
  | "catalog_specs"
  | "taxonomy_rule"
  | "manufacturer_documentation"
  | "human_review";

export type KnowledgeFact<T> = {
  value: T;
  source: KnowledgeSource;
  confidence: number;
  evidence: string;
};

export type ProductCommercialRole = "main_product" | "accessory" | "complement" | "service" | "unknown";

export type ProductKnowledgeInput = {
  id?: number | string | null;
  slug?: string | null;
  sku?: string | null;
  name: string;
  category_path?: string | null;
  category_name?: string | null;
  short_description?: string | null;
  long_description?: string | null;
  specs?: Record<string, string> | null;
  service?: boolean | null;
};

export type ProductKnowledgeProfile = {
  schema_version: typeof KORA_PRODUCT_KNOWLEDGE_SCHEMA_VERSION;
  product_ref: {
    id: number | string | null;
    slug: string | null;
    sku: string | null;
    name: string;
  };
  classification: {
    family: KnowledgeFact<KoraProductFamily | "unknown">;
    role: KnowledgeFact<ProductCommercialRole>;
    subtype: KnowledgeFact<string> | null;
  };
  features: Array<KnowledgeFact<string>>;
  intended_uses: Array<KnowledgeFact<string>>;
  materials: Array<KnowledgeFact<string>>;
  requirements: Array<KnowledgeFact<string>>;
  complements: Array<KnowledgeFact<string>>;
  limitations: Array<KnowledgeFact<string>>;
  enrichment: {
    record_id: string;
    reviewed_by: string;
    reviewed_at: string;
    source: "manufacturer_documentation" | "human_review";
    source_references: string[];
  } | null;
  unresolved_fields: string[];
  review_flags: string[];
  coverage_score: number;
};

const ACCESSORY_SIGNALS = [
  "adaptador",
  "antena",
  "base",
  "cable",
  "control remoto",
  "correa",
  "cuerda",
  "encordado",
  "estuche",
  "filtro anti pop",
  "funda",
  "memoria micro sd",
  "micro sd",
  "pedal",
  "piana",
  "pua",
  "soporte",
  "tripode",
];

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

function hasWord(text: string, word: string) {
  return (` ${text} `).includes(` ${normalize(word)} `);
}

function fact<T>(value: T, source: KnowledgeSource, confidence: number, evidence: string): KnowledgeFact<T> {
  return { value, source, confidence, evidence: evidence.slice(0, 180) };
}

function mergeFacts(...groups: Array<Array<KnowledgeFact<string>>>) {
  const merged = new Map<string, KnowledgeFact<string>>();
  for (const item of groups.flat()) {
    const current = merged.get(item.value);
    if (!current || item.confidence >= current.confidence) merged.set(item.value, item);
  }
  return Array.from(merged.values());
}

function sourceForMatch(identity: string, description: string, probe: string): KnowledgeSource {
  if (identity.includes(normalize(probe))) return "catalog_name";
  if (description.includes(normalize(probe))) return "catalog_description";
  return "taxonomy_rule";
}

function detectFamily(name: string, category: string): KnowledgeFact<KoraProductFamily | "unknown"> {
  const rules: Array<{ family: KoraProductFamily; tokens: string[] }> = [
    { family: "amplificadores", tokens: ["amplificador", "pre amplificador", "preamplificador", "planta"] },
    { family: "guitarras", tokens: ["guitarra", "encordado", "cuerda para guitarra"] },
    { family: "instrumentos_cuerda", tokens: ["bajo electrico", "requinto", "ukelele", "violin"] },
    { family: "percusion", tokens: ["bateria", "bongo", "campana", "conga", "timbal", "guiro", "maraca"] },
    { family: "microfonos", tokens: ["microfono"] },
    { family: "cabinas", tokens: ["cabina", "parlante", "bafle", "speaker"] },
    { family: "procesamiento_audio", tokens: ["ecualizador", "crossover", "procesador de audio"] },
    { family: "consolas", tokens: ["consola", "mezclador", "mixer"] },
    { family: "interfaces_audio", tokens: ["interfaz de audio", "interface de audio"] },
    { family: "megafonos", tokens: ["megafono"] },
    { family: "teclados", tokens: ["teclado", "piano", "organeta"] },
    { family: "seguridad", tokens: ["camara de seguridad", "camaras de seguridad", "cctv", "dvr", "nvr", "camara wifi", "camara ip"] },
    { family: "televisores", tokens: ["televisor", "smart tv"] },
    { family: "solar", tokens: ["solar", "panel solar", "reflector solar"] },
    { family: "hdmi", tokens: ["hdmi"] },
    { family: "rca", tokens: ["rca"] },
    { family: "red", tokens: ["cable de red", "ethernet", "cat 5", "cat5", "cat 6", "cat6"] },
    { family: "xlr", tokens: ["xlr", "canon"] },
  ];
  const foundByName = rules.find((rule) => includesAny(name, rule.tokens));
  const found = foundByName || rules.find((rule) => includesAny(category, rule.tokens));
  if (!found) return fact("unknown", "taxonomy_rule", 0.2, "No se detectó una familia verificable en nombre o categoría");
  const source: KnowledgeSource = includesAny(name, found.tokens) ? "catalog_name" : "catalog_category";
  return fact(found.family, source, source === "catalog_name" ? 0.92 : 0.78, `Nombre/categoría coincide con familia ${found.family}`);
}

function detectRole(identity: string, service: boolean): KnowledgeFact<ProductCommercialRole> {
  if (service) return fact("service", "catalog_specs", 1, "Producto marcado como servicio");
  const signal = ACCESSORY_SIGNALS.find((token) => identity.includes(normalize(token)));
  if (signal) return fact("accessory", "catalog_name", 0.94, `Nombre/categoría contiene señal de accesorio: ${signal}`);
  if (identity) return fact("main_product", "taxonomy_rule", 0.78, "No contiene señales conocidas de accesorio o servicio");
  return fact("unknown", "taxonomy_rule", 0.2, "No hay identidad suficiente para clasificar el rol");
}

function detectSubtype(family: KoraProductFamily | "unknown", identity: string, searchable: string) {
  const candidates: string[] = [];
  if (family === "guitarras") {
    if (hasWord(searchable, "electroacustica")) candidates.push("electroacustica");
    if (hasWord(searchable, "electrica")) candidates.push("electrica");
    if (hasWord(searchable, "acustica")) candidates.push("acustica");
    if (hasWord(searchable, "clasica")) candidates.push("clasica");
  } else if (family === "instrumentos_cuerda") {
    if (includesAny(searchable, ["bajo electrico"])) candidates.push("bajo_electrico");
    if (hasWord(searchable, "requinto")) candidates.push("requinto");
    if (hasWord(searchable, "ukelele")) candidates.push("ukelele");
    if (hasWord(searchable, "violin")) candidates.push("violin");
  } else if (family === "percusion") {
    if (hasWord(searchable, "bateria")) candidates.push("bateria_acustica");
    if (hasWord(searchable, "bongo")) candidates.push("bongo");
    if (hasWord(searchable, "campana")) candidates.push("campana");
    if (hasWord(searchable, "conga")) candidates.push("conga");
    if (hasWord(searchable, "timbal")) candidates.push("timbal");
    if (hasWord(searchable, "guiro")) candidates.push("guiro");
    if (hasWord(searchable, "maraca")) candidates.push("maracas");
  } else if (family === "cabinas") {
    if (includesAny(searchable, ["activa", "activas"])) candidates.push("activa");
    if (includesAny(searchable, ["pasiva", "pasivas"])) candidates.push("pasiva");
    if (hasWord(searchable, "recargable")) candidates.push("recargable");
    if (includesAny(searchable, ["linea array", "line array"])) candidates.push("line_array");
  } else if (family === "microfonos") {
    if (includesAny(searchable, ["inalambrico", "inalamabrico"])) candidates.push("inalambrico");
    if (hasWord(searchable, "alambrico") && !hasWord(searchable, "inalambrico")) candidates.push("alambrico");
    if (hasWord(searchable, "condensador")) candidates.push("condensador");
    if (hasWord(searchable, "dinamico")) candidates.push("dinamico");
  } else if (family === "amplificadores") {
    if (includesAny(searchable, ["pre amplificador", "preamplificador"])) candidates.push("preamplificador");
    else if (hasWord(searchable, "planta")) candidates.push("amplificador_de_potencia");
    else candidates.push("amplificador");
  } else if (family === "consolas") {
    const channelMatch = searchable.match(/\b(\d{1,2})\s*(?:canales|ch)\b/);
    candidates.push(channelMatch ? `mezcladora_${channelMatch[1]}_canales` : "mezcladora");
  } else if (family === "interfaces_audio") {
    candidates.push("interfaz_de_audio");
  } else if (family === "procesamiento_audio") {
    if (hasWord(searchable, "crossover")) candidates.push("crossover");
    if (hasWord(searchable, "ecualizador")) candidates.push("ecualizador");
    if (!candidates.length) candidates.push("procesador_de_audio");
  } else if (family === "megafonos") {
    candidates.push(hasWord(searchable, "recargable") ? "megafono_recargable" : "megafono");
  } else if (family === "seguridad") {
    if (hasWord(searchable, "wifi")) candidates.push("wifi");
    if (hasWord(searchable, "dvr")) candidates.push("dvr");
    if (hasWord(searchable, "nvr")) candidates.push("nvr");
    if (hasWord(searchable, "ip")) candidates.push("ip");
    if (hasWord(searchable, "bala")) candidates.push("bala");
    if (includesAny(searchable, ["turbo hd", "turbohd"])) candidates.push("turbo_hd");
    if (hasWord(searchable, "portable") && hasWord(searchable, "pantalla")) candidates.push("portatil_con_pantalla");
  } else if (family === "teclados") {
    if (hasWord(searchable, "piano")) candidates.push("piano_electronico");
    else if (hasWord(searchable, "teclado") || hasWord(searchable, "organeta")) candidates.push("teclado_electronico");
  } else if (family === "televisores") {
    if (includesAny(searchable, ["smart tv", "smarttv"])) candidates.push("smart_tv");
    else candidates.push("televisor");
  }

  const unique = Array.from(new Set(candidates));
  if (!unique.length) return { subtype: null, candidates: unique };
  const value = unique.join("+");
  return {
    subtype: fact(value, sourceForMatch(identity, searchable, unique[0]), identity.includes(unique[0]) ? 0.9 : 0.72, value),
    candidates: unique,
  };
}

function detectFeatures(identity: string, description: string, specs: string) {
  const searchable = `${identity} ${description} ${specs}`;
  const rules = [
    ["bluetooth", ["bluetooth"]],
    ["recargable", ["recargable", "bateria recargable"]],
    ["wifi", ["wifi", "wi fi"]],
    ["vision_nocturna", ["vision nocturna", "infrarrojo"]],
    ["micro_sd", ["microsd", "micro sd"]],
    ["usb", ["usb"]],
    ["fm", ["radio fm", "fm"]],
  ] as const;
  return rules
    .filter(([, probes]) => includesAny(searchable, [...probes]))
    .map(([value, probes]) => {
      const matched = probes.find((probe) => searchable.includes(normalize(probe))) || probes[0];
      const source: KnowledgeSource = identity.includes(normalize(matched))
        ? "catalog_name"
        : description.includes(normalize(matched))
          ? "catalog_description"
          : "catalog_specs";
      return fact(value, source, source === "catalog_name" ? 0.9 : 0.82, matched);
    });
}

function detectMaterials(identity: string, description: string, specs: string) {
  const searchable = `${identity} ${description} ${specs}`;
  const materials = ["acero", "aluminio", "madera", "metal", "nylon", "plastico", "cuero"];
  return materials
    .filter((material) => hasWord(searchable, material))
    .map((material) =>
      fact(
        material,
        description.includes(material) ? "catalog_description" : specs.includes(material) ? "catalog_specs" : "catalog_name",
        0.86,
        material
      )
    );
}

function taxonomyFacts(
  family: KoraProductFamily | "unknown",
  role: ProductCommercialRole,
  subtype: string | null
) {
  const intendedUses: Array<KnowledgeFact<string>> = [];
  const requirements: Array<KnowledgeFact<string>> = [];
  const complements: Array<KnowledgeFact<string>> = [];
  const limitations: Array<KnowledgeFact<string>> = [];
  if (role !== "main_product") return { intendedUses, requirements, complements, limitations };

  if (family === "guitarras") {
    intendedUses.push(fact("interpretar_musica", "taxonomy_rule", 0.72, "Uso general de la familia guitarras"));
    complements.push(fact("afinador", "taxonomy_rule", 0.7, "Complemento habitual de guitarras"));
    complements.push(fact("funda", "taxonomy_rule", 0.68, "Complemento habitual de guitarras"));
    if (subtype?.includes("electrica")) {
      requirements.push(fact("amplificacion_para_sonar_externamente", "taxonomy_rule", 0.82, "Requisito general de guitarra eléctrica"));
      complements.push(fact("cable_de_instrumento", "taxonomy_rule", 0.8, "Conexión habitual de guitarra eléctrica"));
    }
  } else if (family === "instrumentos_cuerda") {
    intendedUses.push(fact("interpretar_musica", "taxonomy_rule", 0.74, "Uso general de instrumentos de cuerda"));
    if (subtype?.includes("bajo_electrico")) {
      requirements.push(fact("amplificacion_para_sonar_externamente", "taxonomy_rule", 0.84, "Requisito general de bajo eléctrico"));
      complements.push(fact("cable_de_instrumento", "taxonomy_rule", 0.8, "Conexión habitual de bajo eléctrico"));
    }
  } else if (family === "percusion") {
    intendedUses.push(fact("interpretacion_ritmica", "taxonomy_rule", 0.82, "Función general de instrumentos de percusión"));
  } else if (family === "cabinas") {
    intendedUses.push(fact("reproducir_y_amplificar_audio", "taxonomy_rule", 0.8, "Función general de cabinas"));
    if (subtype?.includes("pasiva")) requirements.push(fact("amplificador_externo", "taxonomy_rule", 0.9, "Las cabinas pasivas requieren amplificación"));
    if (subtype?.includes("activa")) limitations.push(fact("requiere_alimentacion_electrica", "taxonomy_rule", 0.78, "Las cabinas activas requieren energía"));
  } else if (family === "microfonos") {
    intendedUses.push(fact("capturar_voz_o_sonido", "taxonomy_rule", 0.82, "Función general de micrófonos"));
    requirements.push(fact("entrada_compatible", "taxonomy_rule", 0.76, "Debe conectarse a una entrada compatible"));
  } else if (family === "amplificadores") {
    intendedUses.push(fact("amplificar_senal_de_audio", "taxonomy_rule", 0.88, "Función general de amplificadores"));
    requirements.push(fact("potencia_e_impedancia_compatibles", "taxonomy_rule", 0.82, "Compatibilidad necesaria con parlantes o cabinas"));
    complements.push(fact("cables_de_audio_compatibles", "taxonomy_rule", 0.76, "Conexión requerida en sistemas de amplificación"));
  } else if (family === "consolas") {
    intendedUses.push(fact("mezclar_y_controlar_fuentes_de_audio", "taxonomy_rule", 0.9, "Función general de consolas"));
    requirements.push(fact("entradas_y_salidas_compatibles", "taxonomy_rule", 0.82, "Compatibilidad necesaria con fuentes y sistema de salida"));
  } else if (family === "interfaces_audio") {
    intendedUses.push(fact("grabar_y_reproducir_audio_con_computador", "taxonomy_rule", 0.9, "Función general de interfaces de audio"));
    requirements.push(fact("computador_y_conexion_compatible", "taxonomy_rule", 0.84, "Requisito general de interfaces de audio"));
  } else if (family === "procesamiento_audio") {
    intendedUses.push(fact("procesar_y_ajustar_senal_de_audio", "taxonomy_rule", 0.88, "Función general de procesadores de audio"));
    requirements.push(fact("sistema_de_audio_compatible", "taxonomy_rule", 0.8, "Debe integrarse dentro de una cadena de audio"));
  } else if (family === "megafonos") {
    intendedUses.push(fact("amplificar_voz_de_forma_portatil", "taxonomy_rule", 0.92, "Función general de megáfonos"));
    requirements.push(fact("bateria_o_alimentacion_compatible", "taxonomy_rule", 0.78, "Requisito general de megáfonos"));
  } else if (family === "seguridad") {
    intendedUses.push(fact("monitoreo_y_vigilancia", "taxonomy_rule", 0.86, "Función general de cámaras de seguridad"));
    requirements.push(fact("alimentacion_y_conectividad_compatibles", "taxonomy_rule", 0.76, "Requisitos generales de instalación"));
  } else if (family === "teclados") {
    intendedUses.push(fact("interpretar_y_aprender_musica", "taxonomy_rule", 0.75, "Uso general de teclados"));
    requirements.push(fact("alimentacion_compatible", "taxonomy_rule", 0.72, "Requisito general de teclados electrónicos"));
  } else if (family === "televisores") {
    intendedUses.push(fact("entretenimiento_y_visualizacion", "taxonomy_rule", 0.78, "Uso general de televisores"));
  }
  return { intendedUses, requirements, complements, limitations };
}

function hasContradictorySubtype(family: KoraProductFamily | "unknown", subtypes: string[]) {
  if (family === "guitarras") {
    return subtypes.includes("electrica") && (subtypes.includes("acustica") || subtypes.includes("clasica")) && !subtypes.includes("electroacustica");
  }
  if (family === "cabinas") return subtypes.includes("activa") && subtypes.includes("pasiva");
  return false;
}

export function buildProductKnowledgeProfile(input: ProductKnowledgeInput): ProductKnowledgeProfile {
  const name = normalize(input.name);
  const category = normalize(`${input.category_path || ""} ${input.category_name || ""}`);
  const identity = `${name} ${category}`.trim();
  const description = normalize(`${input.short_description || ""} ${input.long_description || ""}`);
  const specs = normalize(Object.entries(input.specs || {}).map(([key, value]) => `${key} ${value}`).join(" "));
  const searchable = `${identity} ${description} ${specs}`;
  const enrichment = getApprovedProductKnowledgeEnrichment(input);
  const detectedFamily = detectFamily(name, category);
  const family = enrichment?.classification?.family
    ? fact(enrichment.classification.family, enrichment.source, 1, `Enriquecimiento aprobado ${enrichment.record_id}`)
    : detectedFamily;
  const detectedRole = detectRole(name, Boolean(input.service));
  const role = enrichment?.classification?.role
    ? fact(enrichment.classification.role, enrichment.source, 1, `Enriquecimiento aprobado ${enrichment.record_id}`)
    : detectedRole;
  const detectedSubtype = detectSubtype(family.value, identity, searchable);
  const subtype = enrichment?.classification?.subtype
    ? fact(enrichment.classification.subtype, enrichment.source, 1, `Enriquecimiento aprobado ${enrichment.record_id}`)
    : detectedSubtype.subtype;
  const candidates = detectedSubtype.candidates;
  const enrichmentFacts = (group: ProductEnrichmentFactGroup) => {
    if (!enrichment) return [];
    return (enrichment.facts?.[group] || []).map((item) =>
      fact(item.value, enrichment.source, item.confidence, item.evidence)
    );
  };
  const features = mergeFacts(detectFeatures(identity, description, specs), enrichmentFacts("features"));
  const materials = mergeFacts(detectMaterials(identity, description, specs), enrichmentFacts("materials"));
  const taxonomy = taxonomyFacts(family.value, role.value, subtype?.value || null);
  const intendedUses = mergeFacts(taxonomy.intendedUses, enrichmentFacts("intended_uses"));
  const requirements = mergeFacts(taxonomy.requirements, enrichmentFacts("requirements"));
  const complements = mergeFacts(taxonomy.complements, enrichmentFacts("complements"));
  const limitations = mergeFacts(taxonomy.limitations, enrichmentFacts("limitations"));
  const unresolvedFields: string[] = [];
  const reviewFlags: string[] = [];

  if (family.value === "unknown") unresolvedFields.push("family");
  if (role.value === "unknown") unresolvedFields.push("commercial_role");
  if (
    role.value === "main_product" &&
    !subtype &&
    [
      "amplificadores",
      "cabinas",
      "consolas",
      "guitarras",
      "interfaces_audio",
      "instrumentos_cuerda",
      "megafonos",
      "microfonos",
      "percusion",
      "procesamiento_audio",
      "seguridad",
    ].includes(family.value)
  ) {
    unresolvedFields.push("subtype");
  }
  if (!description) unresolvedFields.push("commercial_description");
  if (!materials.length) unresolvedFields.push("materials");
  if (!enrichment?.classification?.subtype && hasContradictorySubtype(family.value, candidates)) reviewFlags.push("contradictory_subtype");
  if (role.value === "accessory" && family.value === "unknown") reviewFlags.push("accessory_without_family");
  if (
    role.value === "main_product" &&
    family.value !== "unknown" &&
    !productMatchesFamily(input, family.value)
  ) {
    reviewFlags.push("family_identity_conflict");
  }

  const knownCore = [family.value !== "unknown", role.value !== "unknown", Boolean(subtype), Boolean(description), features.length > 0];
  const coverageScore = Math.round((knownCore.filter(Boolean).length / knownCore.length) * 100);

  return {
    schema_version: KORA_PRODUCT_KNOWLEDGE_SCHEMA_VERSION,
    product_ref: {
      id: input.id ?? null,
      slug: input.slug || null,
      sku: input.sku || null,
      name: input.name,
    },
    classification: { family, role, subtype },
    features,
    intended_uses: intendedUses,
    materials,
    requirements,
    complements,
    limitations,
    enrichment: enrichment
      ? {
          record_id: enrichment.record_id,
          reviewed_by: enrichment.reviewed_by,
          reviewed_at: enrichment.reviewed_at,
          source: enrichment.source,
          source_references: enrichment.source_references,
        }
      : null,
    unresolved_fields: unresolvedFields,
    review_flags: reviewFlags,
    coverage_score: coverageScore,
  };
}

export function isKnowledgeSafeForRecommendation(profile: ProductKnowledgeProfile, requestedFamilies: KoraProductFamily[]) {
  if (profile.review_flags.includes("contradictory_subtype")) return false;
  if (profile.review_flags.includes("family_identity_conflict")) return false;
  if (!requestedFamilies.length) return true;
  if (!requestedFamilies.includes(profile.classification.family.value as KoraProductFamily)) return false;
  const requestsMainProduct = requestedFamilies.some((family) =>
    [
      "amplificadores",
      "cabinas",
      "consolas",
      "guitarras",
      "interfaces_audio",
      "instrumentos_cuerda",
      "megafonos",
      "microfonos",
      "percusion",
      "procesamiento_audio",
      "seguridad",
      "solar",
      "teclados",
      "televisores",
    ].includes(family)
  );
  if (requestsMainProduct && profile.classification.role.value !== "main_product") return false;
  return true;
}
