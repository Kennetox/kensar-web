type AliasRule = {
  from: string;
  to: string;
  expansions?: string[];
};

export type NormalizedKoraQuery = {
  normalizedQuery: string;
  expandedQueries: string[];
  appliedAliases: string[];
};

const ALIAS_RULES: AliasRule[] = [
  { from: "guitarras", to: "guitarra", expansions: ["guitarra", "instrumentos-de-cuerda", "instrumentos"] },
  { from: "guitrra", to: "guitarra", expansions: ["guitarra", "instrumentos-de-cuerda", "instrumentos"] },
  { from: "guitara", to: "guitarra", expansions: ["guitarra", "instrumentos-de-cuerda", "instrumentos"] },
  { from: "microfonos", to: "microfono", expansions: ["microfono", "microfonos", "studio"] },
  { from: "micrófonos", to: "microfono", expansions: ["microfono", "microfonos", "studio"] },
  { from: "micrófono", to: "microfono", expansions: ["microfono", "microfonos", "studio"] },
  { from: "micro", to: "microfono", expansions: ["microfono", "microfonos", "audio"] },
  { from: "mircrofono", to: "microfono", expansions: ["microfono", "microfonos", "audio"] },
  { from: "microfno", to: "microfono", expansions: ["microfono", "microfonos", "audio"] },
  { from: "camaras", to: "camara", expansions: ["camara", "seguridad", "camaras-de-seguridad"] },
  { from: "cámaras", to: "camara", expansions: ["camara", "seguridad", "camaras-de-seguridad"] },
  { from: "cámara", to: "camara", expansions: ["camara", "seguridad", "camaras-de-seguridad"] },
  { from: "camra", to: "camara", expansions: ["camara", "seguridad", "camaras-de-seguridad"] },
  { from: "cmarra", to: "camara", expansions: ["camara", "seguridad", "camaras-de-seguridad"] },
  { from: "speaker", to: "cabina", expansions: ["cabina", "parlante", "audio"] },
  { from: "speakers", to: "cabina", expansions: ["cabina", "parlante", "audio"] },
  { from: "spiker", to: "cabina", expansions: ["cabina", "parlante", "audio"] },
  { from: "spikers", to: "cabina", expansions: ["cabina", "parlante", "audio"] },
  { from: "parlantes", to: "parlante", expansions: ["parlante", "cabina", "audio"] },
  { from: "parlante", to: "parlante", expansions: ["parlante", "audio"] },
  { from: "pianos", to: "teclado", expansions: ["teclado", "piano", "teclados"] },
  { from: "piano", to: "teclado", expansions: ["teclado", "piano", "teclados"] },
  { from: "teclao", to: "teclado", expansions: ["teclado", "piano", "teclados"] },
  { from: "tecldoo", to: "teclado", expansions: ["teclado", "piano", "teclados"] },
  { from: "potente", to: "cabina", expansions: ["cabina", "audio", "potencia"] },
  { from: "sonido duro", to: "cabina", expansions: ["cabina", "audio", "potencia"] },
  { from: "suene duro", to: "cabina", expansions: ["cabina", "audio", "potencia"] },
  { from: "sonido durro", to: "cabina", expansions: ["cabina", "audio", "potencia"] },
  { from: "buen bajo", to: "cabina", expansions: ["cabina", "subwoofer", "bajo"] },
  { from: "bajo potente", to: "cabina", expansions: ["cabina", "subwoofer", "bajo"] },
  { from: "inalambrico", to: "bluetooth", expansions: ["bluetooth", "inalambrico"] },
  { from: "inalámbrico", to: "bluetooth", expansions: ["bluetooth", "inalambrico"] },
  { from: "inalabrico", to: "bluetooth", expansions: ["bluetooth", "inalambrico"] },
  { from: "inalmbrico", to: "bluetooth", expansions: ["bluetooth", "inalambrico"] },
  { from: "baratica", to: "barato", expansions: ["barato", "economico"] },
  { from: "economicas", to: "economica", expansions: ["economica", "barato"] },
  { from: "economicos", to: "economico", expansions: ["economico", "barato"] },
  { from: "baratas", to: "barata", expansions: ["barata", "economica"] },
  { from: "baratos", to: "barato", expansions: ["barato", "economico"] },
  { from: "audifono", to: "audifono", expansions: ["audifono", "audio"] },
  { from: "audifonos", to: "audifono", expansions: ["audifono", "audio"] },
  { from: "camaras wifi", to: "camara wifi", expansions: ["camara", "wifi", "seguridad"] },
  { from: "wiffi", to: "wifi", expansions: ["wifi", "camara", "seguridad"] },
  { from: "segurdad", to: "seguridad", expansions: ["seguridad", "camara"] },
  { from: "cabnias", to: "cabinas", expansions: ["cabina", "parlante", "audio"] },
  { from: "parlantess", to: "parlantes", expansions: ["parlante", "cabina", "audio"] },
  { from: "televisr", to: "televisor", expansions: ["televisor", "hogar-y-entretenimiento"] },
  { from: "tecladoo", to: "teclado", expansions: ["teclado", "piano", "teclados"] },
  { from: "cble", to: "cable", expansions: ["cable", "accesorios"] },
  { from: "aprendr", to: "aprender", expansions: ["aprender", "principiante"] },
  { from: "cable canon", to: "xlr", expansions: ["xlr", "cable microfono", "audio"] },
  { from: "canon", to: "xlr", expansions: ["xlr", "cable microfono", "audio"] },
  { from: "cable microfono", to: "xlr", expansions: ["xlr", "cable microfono", "audio"] },
  { from: "cable de microfono", to: "xlr", expansions: ["xlr", "cable microfono", "audio"] },
  { from: "tv", to: "televisor", expansions: ["televisor", "hogar-y-entretenimiento"] },
  { from: "tele", to: "televisor", expansions: ["televisor", "hogar-y-entretenimiento"] },
  { from: "reflector", to: "solar", expansions: ["solar", "luz-solar"] },
  { from: "panel solar", to: "solar", expansions: ["solar", "luz-solar"] },
  { from: "ups", to: "energia", expansions: ["energia", "respaldo"] },
];

const BASIC_SINGULAR_RULES: Array<{ plural: RegExp; singular: string }> = [
  { plural: /\bguitarras\b/g, singular: "guitarra" },
  { plural: /\bcabinas\b/g, singular: "cabina" },
  { plural: /\bteclados\b/g, singular: "teclado" },
  { plural: /\bparlantes\b/g, singular: "parlante" },
  { plural: /\bmicrofonos\b/g, singular: "microfono" },
  { plural: /\bcamaras\b/g, singular: "camara" },
  { plural: /\btelevisores\b/g, singular: "televisor" },
  { plural: /\bcables\b/g, singular: "cable" },
];

function normalize(value: string) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿?¡!.,;:()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeKoraCatalogQuery(input: string): NormalizedKoraQuery {
  let normalized = normalize(input);
  const appliedAliases: string[] = [];
  const expansions = new Set<string>();

  for (const rule of ALIAS_RULES) {
    const source = normalize(rule.from);
    const target = normalize(rule.to);
    if (!source || !target) continue;
    const regex = new RegExp(`\\b${source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
    if (!regex.test(normalized)) continue;
    normalized = normalized.replace(regex, target);
    appliedAliases.push(`${rule.from}->${rule.to}`);
    (rule.expansions || []).forEach((value) => {
      const token = normalize(value);
      if (token) expansions.add(token);
    });
  }

  for (const rule of BASIC_SINGULAR_RULES) {
    normalized = normalized.replace(rule.plural, rule.singular);
  }

  const normalizedTerms = normalized.split(/\s+/).map((token) => token.trim()).filter(Boolean);
  normalizedTerms.forEach((token) => {
    if (token.length >= 4) expansions.add(token);
  });

  const expandedQueries = Array.from(expansions).slice(0, 12);
  return {
    normalizedQuery: normalized,
    expandedQueries,
    appliedAliases,
  };
}
