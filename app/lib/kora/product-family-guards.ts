export type KoraProductFamily =
  | "amplificadores"
  | "cabinas"
  | "consolas"
  | "interfaces_audio"
  | "instrumentos_cuerda"
  | "megafonos"
  | "microfonos"
  | "percusion"
  | "procesamiento_audio"
  | "guitarras"
  | "teclados"
  | "seguridad"
  | "solar"
  | "televisores"
  | "hdmi"
  | "rca"
  | "red"
  | "xlr";

export type FamilyGuardProduct = {
  name?: string | null;
  category_path?: string | null;
  category_name?: string | null;
  short_description?: string | null;
  long_description?: string | null;
};

const MAIN_PRODUCT_EXCLUSIONS: Partial<Record<KoraProductFamily, string[]>> = {
  guitarras: ["encordado", "cuerda", "funda", "estuche", "correa", "afinador", "pua", "soporte", "base", "cable"],
  microfonos: ["pie de microfono", "piana de microfono", "base de microfono", "soporte de microfono", "cable de microfono", "filtro anti pop"],
  teclados: ["adaptador", "fuente", "pedal", "soporte", "base", "funda", "estuche"],
  televisores: ["adaptador", "control remoto", "soporte", "base para tv", "decodificador", "antena"],
  seguridad: ["videollamada", "webcam"],
  instrumentos_cuerda: ["encordado", "cuerda", "funda", "estuche", "correa", "afinador", "pua", "soporte", "base", "cable"],
  percusion: ["baqueta", "soporte", "base", "funda", "estuche"],
  amplificadores: ["cable", "adaptador", "funda", "estuche"],
  consolas: ["cable", "adaptador", "funda", "estuche", "soporte"],
  interfaces_audio: ["cable", "adaptador", "funda", "estuche"],
  procesamiento_audio: ["cable", "adaptador", "funda", "estuche"],
  megafonos: ["bateria para", "pila para", "cargador para"],
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

function productTexts(product: FamilyGuardProduct) {
  const name = normalize(product.name || "");
  const identity = normalize(`${name} ${product.category_path || ""} ${product.category_name || ""}`);
  const searchable = normalize(`${identity} ${product.short_description || ""} ${product.long_description || ""}`);
  return { name, identity, searchable };
}

function hasWord(text: string, word: string) {
  return (` ${text} `).includes(` ${normalize(word)} `);
}

function extractCabinetInches(product: FamilyGuardProduct) {
  const raw = `${product.name || ""} ${product.short_description || ""}`.toLowerCase();
  const match = raw.match(/\b(6(?:[.,]5)?|8|10|12|15|18)\s*(?:["”]|pulg(?:adas?)?)(?!\w)/);
  if (!match) return null;
  const value = Number(match[1].replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

export function productMatchesFamily(product: FamilyGuardProduct, family: KoraProductFamily) {
  const { name, identity, searchable } = productTexts(product);
  const exclusions = MAIN_PRODUCT_EXCLUSIONS[family] || [];
  if (includesAny(name, exclusions)) return false;

  if (family === "guitarras") return includesAny(identity, ["guitarra"]);
  if (family === "instrumentos_cuerda") return includesAny(identity, ["bajo electrico", "requinto", "ukelele", "violin"]);
  if (family === "percusion") return includesAny(identity, ["bateria", "bongo", "campana", "conga", "timbal", "guiro", "maraca"]);
  if (family === "microfonos") return includesAny(identity, ["microfono"]);
  if (family === "cabinas") return includesAny(identity, ["cabina", "parlante", "bafle", "speaker"]);
  if (family === "amplificadores") return includesAny(identity, ["amplificador", "pre amplificador", "preamplificador", "planta"]);
  if (family === "consolas") return includesAny(name, ["consola", "mezclador", "mixer"]);
  if (family === "interfaces_audio") return includesAny(identity, ["interfaz de audio", "interface de audio"]);
  if (family === "procesamiento_audio") return includesAny(identity, ["ecualizador", "crossover", "procesador de audio"]);
  if (family === "megafonos") return includesAny(identity, ["megafono"]);
  if (family === "teclados") return includesAny(identity, ["teclado", "piano", "organeta"]);
  if (family === "televisores") return includesAny(identity, ["televisor", "smart tv"]);
  if (family === "solar") return includesAny(identity, ["solar", "panel solar", "reflector solar"]);
  if (family === "seguridad") {
    return includesAny(identity, [
      "camaras de seguridad",
      "camara de seguridad",
      "camara wifi",
      "camara ip",
      "cctv",
      "dvr",
      "nvr",
      "camara bala",
      "camara domo",
      "turbo hd",
    ]);
  }
  if (family === "hdmi") return includesAny(searchable, ["hdmi"]);
  if (family === "rca") return includesAny(searchable, ["rca"]);
  if (family === "red") return includesAny(searchable, ["ethernet", "cable de red", "cat 5", "cat5", "cat 6", "cat6"]);
  if (family === "xlr") return includesAny(searchable, ["xlr", "canon"]);
  return false;
}

export function productMatchesRequestedFamilies(product: FamilyGuardProduct, families: KoraProductFamily[]) {
  if (!families.length) return true;
  return families.some((family) => productMatchesFamily(product, family));
}

export function productMatchesExplicitConstraints(
  product: FamilyGuardProduct,
  normalizedQuery: string,
  families: KoraProductFamily[]
) {
  const query = normalize(normalizedQuery);
  const { identity, searchable } = productTexts(product);

  if (families.includes("guitarras")) {
    if (hasWord(query, "electrica") && !hasWord(searchable, "electrica")) return false;
    if (hasWord(query, "acustica") && !hasWord(searchable, "acustica")) return false;
    if (hasWord(query, "clasica") && !hasWord(searchable, "clasica")) return false;
    if (hasWord(query, "electroacustica") && !hasWord(searchable, "electroacustica")) return false;
  }

  if (families.includes("microfonos")) {
    if (hasWord(query, "inalambrico") && !hasWord(searchable, "inalambrico")) return false;
    if (hasWord(query, "alambrico") && !hasWord(query, "inalambrico") && !hasWord(searchable, "alambrico")) return false;
  }

  if (families.includes("cabinas")) {
    if (hasWord(query, "activa") && !hasWord(searchable, "activa")) return false;
    if (hasWord(query, "pasiva") && !hasWord(searchable, "pasiva")) return false;
    if (hasWord(query, "recargable") && !hasWord(searchable, "recargable") && !hasWord(searchable, "bateria")) return false;
    const asksForCompact = includesAny(query, ["pequena", "pequeno", "compacta", "compacto", "facil de transportar"]);
    const cabinetInches = extractCabinetInches(product);
    if (asksForCompact && cabinetInches !== null && cabinetInches > 10) return false;
  }

  if (families.includes("seguridad")) {
    if (hasWord(query, "wifi") && !hasWord(searchable, "wifi")) return false;
    if (hasWord(query, "dvr") && !hasWord(searchable, "dvr")) return false;
  }

  return Boolean(identity);
}
