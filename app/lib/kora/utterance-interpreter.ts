import type { KoraNluResult } from "./entities";
import type { KoraProductFamily } from "./product-family-guards";
import type { KoraQualificationFact, KoraQualificationState } from "./qualification-state";

export type KoraUtteranceMode =
  | "informative"
  | "uncertain"
  | "direct_request"
  | "correction"
  | "new_intent"
  | "unknown";

export type KoraUtteranceInterpretation = {
  mode: KoraUtteranceMode;
  facts: KoraQualificationFact[];
  ambiguous_dimensions: KoraQualificationFact["dimension"][];
  has_new_information: boolean;
  detected_new_family: KoraProductFamily | null;
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

function includesAny(text: string, values: string[]) {
  return values.some((value) => text.includes(normalize(value)));
}

function fact(
  dimension: KoraQualificationFact["dimension"],
  value: string | number,
  evidence: string,
  confidence = 0.9,
  source: KoraQualificationFact["source"] = "explicit"
): KoraQualificationFact {
  return { dimension, value, evidence, confidence, source };
}

function detectFamily(text: string): KoraProductFamily | null {
  const rules: Array<[KoraProductFamily, string[]]> = [
    ["cabinas", ["cabina", "parlante", "bafle"]],
    ["guitarras", ["guitarra"]],
    ["microfonos", ["microfono"]],
    ["seguridad", ["camara", "dvr", "nvr"]],
    ["consolas", ["consola", "mixer", "mezcladora"]],
    ["interfaces_audio", ["interfaz de audio", "interface de audio"]],
    ["teclados", ["teclado", "piano", "organeta"]],
    ["televisores", ["televisor", "smart tv"]],
    ["megafonos", ["megafono"]],
  ];
  return rules.find(([, aliases]) => includesAny(text, aliases))?.[0] || null;
}

export function interpretKoraQualificationUtterance(input: {
  latestQuery: string;
  combinedQuery: string;
  family: KoraProductFamily;
  nlu: KoraNluResult | null;
  previousState?: KoraQualificationState | null;
}): KoraUtteranceInterpretation {
  const latest = normalize(input.latestQuery);
  const combined = normalize(input.combinedQuery);
  const facts: KoraQualificationFact[] = [];
  const ambiguous = new Set<KoraQualificationFact["dimension"]>();
  const newFamily = detectFamily(latest);

  const direct = includesAny(latest, ["muestrame opciones", "muestrame ya", "dame opciones", "recomiendame ya", "no me preguntes", "solo muestrame"]);
  const uncertain = includesAny(latest, ["no se", "no estoy seguro", "no estoy segura", "lo normal", "cualquiera", "como sea"]);
  const correction = /\b(no|mejor|cambio|prefiero)\b/.test(latest) && Boolean(input.previousState);

  const budget = typeof input.nlu?.budget === "number" ? input.nlu.budget : null;
  if (typeof budget === "number" && Number.isFinite(budget)) facts.push(fact("budget", budget, input.latestQuery));

  if (includesAny(latest, ["pequeno", "pequena", "compacto", "compacta"])) {
    facts.push(fact("physical_size", "small", input.latestQuery));
    const hasMeaning = includesAny(latest, ["transportar", "portatil", "cargar", "casa", "reunion", "nino", "principiante", "teclas"]);
    if (!hasMeaning) ambiguous.add("physical_size");
  } else if (includesAny(latest, ["mediano", "mediana"])) {
    facts.push(fact("physical_size", "medium", input.latestQuery));
  } else if (includesAny(latest, ["grande", "grandes"])) {
    facts.push(fact("physical_size", "large", input.latestQuery));
  }

  if (includesAny(latest, ["potente", "potencia", "suene duro", "buen bajo"])) {
    facts.push(fact("power_preference", "high", input.latestQuery));
  }
  if (includesAny(latest, ["portatil", "transportar", "facil de cargar", "liviana", "liviano", "recargable"])) {
    facts.push(fact("portability", "important", input.latestQuery));
  }

  const usageMap: Array<[string, string[]]> = [
    ["home", ["casa", "habitacion", "reunion pequena"]],
    ["live_event", ["fiesta", "evento", "presentacion", "aire libre"]],
    ["church", ["iglesia", "culto"]],
    ["recording", ["grabar", "grabacion", "podcast", "streaming", "estudio"]],
    ["learning", ["aprender", "principiante", "clases", "estoy empezando"]],
    ["business", ["negocio", "local", "bodega"]],
  ];
  const usage = usageMap.find(([, aliases]) => includesAny(latest, aliases));
  if (usage) facts.push(fact("use", usage[0], input.latestQuery));

  if (includesAny(latest, ["interior"])) facts.push(fact("environment", "indoor", input.latestQuery));
  if (includesAny(latest, ["exterior", "aire libre", "calle", "patio"])) facts.push(fact("environment", "outdoor", input.latestQuery));
  if (includesAny(latest, ["wifi", "ip"])) facts.push(fact("system_type", "wifi_ip", input.latestQuery));
  if (includesAny(latest, ["dvr", "nvr", "grabador", "kit"])) facts.push(fact("system_type", "recorder", input.latestQuery));

  const subtypeTokens = ["acustica", "clasica", "electrica", "electroacustica", "inalambrico", "alambrico", "condensador", "dinamico", "activa", "pasiva"];
  const subtype = subtypeTokens.find((token) => (` ${latest} `).includes(` ${token} `));
  if (subtype) facts.push(fact("subtype", subtype, input.latestQuery));

  const inputCount = combined.match(/\b(1|2|4|6|8|10|12|16|18|24|32)\s*(entradas|canales|microfonos|micros)\b/);
  if (inputCount) facts.push(fact("input_count", Number(inputCount[1]), inputCount[0]));
  const peopleCount = latest.match(/\b(\d{1,4})\s*(personas|personas aprox|invitados)\b/);
  if (peopleCount) facts.push(fact("people_count", Number(peopleCount[1]), peopleCount[0]));

  if (includesAny(latest, ["bluetooth", "usb", "hdmi", "auxiliar", "canon", "xlr"])) {
    facts.push(fact("connectivity", latest, input.latestQuery, 0.86));
  }
  if (includesAny(latest, ["estoy empezando", "principiante", "desde cero"])) facts.push(fact("experience", "beginner", input.latestQuery));
  if (includesAny(latest, ["ya se", "tengo experiencia", "profesional"])) facts.push(fact("experience", "experienced", input.latestQuery));

  let mode: KoraUtteranceMode = facts.length ? "informative" : "unknown";
  if (direct) mode = "direct_request";
  else if (uncertain) mode = "uncertain";
  else if (newFamily && newFamily !== input.family) mode = "new_intent";
  else if (correction) mode = "correction";

  return {
    mode,
    facts,
    ambiguous_dimensions: Array.from(ambiguous),
    has_new_information: facts.length > 0,
    detected_new_family: newFamily && newFamily !== input.family ? newFamily : null,
  };
}
