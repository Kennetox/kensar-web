export type KoraAvailabilityQuery = {
  subject: string;
  normalized_subject: string;
  search_terms: string[];
};

export type KoraAvailabilityCandidate = {
  name: string;
  category_path?: string | null;
  category_name?: string | null;
  group_name?: string | null;
  short_description?: string | null;
  long_description?: string | null;
  commercial_role?: "main_product" | "accessory" | "complement" | "service" | "unknown";
};

export type KoraAvailabilityMatch = "direct" | "related" | "none";

const SUBJECT_ALIASES: Array<{ aliases: string[]; searches: string[] }> = [
  { aliases: ["audifono", "audifonos", "auricular", "auriculares", "headphone", "headphones", "headset", "diadema"], searches: ["audifonos", "auriculares", "diadema", "headphones", "headset"] },
  { aliases: ["televisor", "televisores", "tv", "smart tv"], searches: ["televisor", "smart tv", "tv"] },
  { aliases: ["parlante", "parlantes", "bafle", "bafles", "speaker", "speakers"], searches: ["parlante", "cabina", "bafle"] },
  { aliases: ["microfono", "microfonos"], searches: ["microfono"] },
  { aliases: ["guitarra", "guitarras"], searches: ["guitarra"] },
  { aliases: ["teclado", "teclados", "piano", "pianos", "organeta"], searches: ["teclado", "piano", "organeta"] },
];

const NON_PRODUCT_SUBJECTS = new Set([
  "garantia", "garantias", "envio", "envios", "domicilio", "domicilios", "pago", "pagos", "nequi",
  "whatsapp", "tienda", "tiendas", "sede", "sedes", "servicio tecnico", "soporte", "devoluciones",
]);

export function normalizeAvailabilityText(value: string) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanSubject(value: string) {
  return normalizeAvailabilityText(value)
    .replace(/\b(?:por casualidad|actualmente|ahora mismo|disponibles?|en stock|para vender|a la venta|aca|aqui)\b/g, " ")
    .replace(/^(?:algun|alguna|algunos|algunas|un|una|unos|unas|el|la|los|las)\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function singularVariants(subject: string) {
  const values = new Set([subject]);
  subject.split(" ").forEach((token) => {
    if (token.length > 5 && token.endsWith("es")) values.add(subject.replace(new RegExp(`\\b${token}\\b`), token.slice(0, -2)));
    if (token.length > 4 && token.endsWith("s")) values.add(subject.replace(new RegExp(`\\b${token}\\b`), token.slice(0, -1)));
  });
  return Array.from(values);
}

export function parseCatalogAvailabilityQuestion(query: string): KoraAvailabilityQuery | null {
  const text = normalizeAvailabilityText(query);
  if (!text || text.length > 140) return null;
  const patterns = [
    /^(?:ustedes\s+)?(?:tienen|tienes|venden|manejan|ofrecen|trabajan con|cuentan con|hay)\s+(.+)$/,
    /^(?:puedo conseguir|puedo encontrar|consigo|encuentro)\s+(.+)$/,
    /^(.+?)\s+(?:tienen|venden|manejan|hay)$/,
  ];
  const rawSubject = patterns.map((pattern) => text.match(pattern)?.[1]).find(Boolean);
  if (!rawSubject) return null;
  const subject = cleanSubject(rawSubject);
  if (!subject || subject.split(" ").length > 7 || NON_PRODUCT_SUBJECTS.has(subject)) return null;

  const aliasGroup = SUBJECT_ALIASES.find((group) => group.aliases.some((alias) => subject.includes(alias)));
  const searchTerms = aliasGroup?.searches || singularVariants(subject);
  return {
    subject,
    normalized_subject: subject,
    search_terms: Array.from(new Set(searchTerms.map(normalizeAvailabilityText).filter((term) => term.length >= 2))).slice(0, 5),
  };
}

function phraseIn(value: string, phrase: string) {
  return (` ${value} `).includes(` ${phrase} `) || value.includes(phrase);
}

export function classifyAvailabilityCandidate(
  query: KoraAvailabilityQuery,
  candidate: KoraAvailabilityCandidate
): { match: KoraAvailabilityMatch; score: number } {
  const identity = normalizeAvailabilityText([
    candidate.name,
    candidate.category_path,
    candidate.category_name,
    candidate.group_name,
  ].filter(Boolean).join(" "));
  const description = normalizeAvailabilityText(`${candidate.short_description || ""} ${candidate.long_description || ""}`);
  const terms = query.search_terms;
  const directHits = terms.filter((term) => phraseIn(identity, term));
  if (directHits.length) {
    if (candidate.commercial_role === "accessory" || candidate.commercial_role === "complement" || candidate.commercial_role === "service") {
      return { match: "related", score: 5 };
    }
    const name = normalizeAvailabilityText(candidate.name);
    const best = Math.max(...directHits.map((term) => name.includes(term) ? 10 : 7));
    return { match: "direct", score: best };
  }
  const subjectTokens = query.normalized_subject.split(" ").filter((token) => token.length >= 3);
  const identityTokenHits = subjectTokens.filter((token) => phraseIn(identity, token)).length;
  if (subjectTokens.length && identityTokenHits / subjectTokens.length >= 0.6) {
    if (candidate.commercial_role === "accessory" || candidate.commercial_role === "complement" || candidate.commercial_role === "service") {
      return { match: "related", score: 4.5 };
    }
    return { match: "direct", score: 6 + identityTokenHits };
  }
  if (terms.some((term) => phraseIn(description, term))) return { match: "related", score: 4 };
  return { match: "none", score: 0 };
}
