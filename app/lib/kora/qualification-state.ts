import type { KoraProductFamily } from "./product-family-guards";

export type KoraQualificationDimension =
  | "use"
  | "experience"
  | "budget"
  | "physical_size"
  | "space_scale"
  | "people_count"
  | "portability"
  | "power_preference"
  | "subtype"
  | "input_count"
  | "connectivity"
  | "system_type"
  | "environment"
  | "compatibility";

export type KoraQualificationFact = {
  dimension: KoraQualificationDimension;
  value: string | number;
  confidence: number;
  source: "explicit" | "contextual" | "inferred";
  evidence: string;
};

export type KoraQualificationState = {
  schema_version: "kora-qualification-v1";
  family: KoraProductFamily;
  known: Partial<Record<KoraQualificationDimension, KoraQualificationFact>>;
  pending_dimensions: string[];
  asked_dimensions: string[];
  attempts: number;
  last_question_signature: string | null;
  updated_at_turn: number;
};

export type KoraAmbiguityPrompt = {
  id: string;
  dimension: KoraQualificationDimension;
  answer: string;
  actions: Array<{ id: string; label: string; type: "prompt"; value: string }>;
  resolvedDimensions: string[];
};

export type KoraQualificationSchema = {
  family: KoraProductFamily;
  priority_dimensions: KoraQualificationDimension[];
  ambiguity_prompts: Partial<Record<KoraQualificationDimension, KoraAmbiguityPrompt>>;
};

const SIZE_PROMPTS: Partial<Record<KoraProductFamily, KoraAmbiguityPrompt>> = {
  cabinas: {
    id: "cabinet-small-meaning",
    dimension: "physical_size",
    answer:
      "Perfecto, busquemos una cabina pequeña. ¿La quieres compacta para transportarla fácilmente o para usarla en casa y reuniones pequeñas?",
    actions: [
      { id: "cabinet-small-portable", label: "Compacta y portátil", type: "prompt", value: "La quiero pequeña, compacta y fácil de transportar" },
      { id: "cabinet-small-home", label: "Casa o reuniones", type: "prompt", value: "La quiero para casa o reuniones pequeñas" },
    ],
    resolvedDimensions: ["portability", "use"],
  },
  teclados: {
    id: "keyboard-small-meaning",
    dimension: "physical_size",
    answer:
      "Entendido: buscas un teclado pequeño. ¿Te refieres a pocas teclas para que sea portátil o a un cuerpo compacto manteniendo un rango más amplio?",
    actions: [
      { id: "keyboard-small-fewer-keys", label: "Pocas teclas", type: "prompt", value: "Prefiero pocas teclas y máxima portabilidad" },
      { id: "keyboard-small-compact", label: "Compacto, mayor rango", type: "prompt", value: "Prefiero un teclado compacto pero con 61 teclas si es posible" },
    ],
    resolvedDimensions: ["physical_size", "portability"],
  },
  guitarras: {
    id: "guitar-small-meaning",
    dimension: "physical_size",
    answer:
      "Entendido: buscas una guitarra pequeña. ¿Es por comodidad para un niño o principiante, o porque necesitas una guitarra compacta para transportar?",
    actions: [
      { id: "guitar-small-child", label: "Niño o principiante", type: "prompt", value: "Es para un niño o principiante y necesito un tamaño cómodo" },
      { id: "guitar-small-travel", label: "Fácil de transportar", type: "prompt", value: "La quiero compacta y fácil de transportar" },
    ],
    resolvedDimensions: ["experience", "portability"],
  },
};

const DEFAULT_PRIORITIES: Partial<Record<KoraProductFamily, KoraQualificationDimension[]>> = {
  cabinas: ["use", "space_scale", "power_preference", "portability", "budget"],
  guitarras: ["subtype", "use", "experience", "physical_size", "budget"],
  microfonos: ["use", "subtype", "connectivity", "budget"],
  seguridad: ["system_type", "environment", "people_count", "budget"],
  consolas: ["use", "input_count", "connectivity", "budget"],
  interfaces_audio: ["use", "input_count", "connectivity", "budget"],
  teclados: ["use", "physical_size", "experience", "budget"],
  televisores: ["physical_size", "budget"],
  megafonos: ["use", "people_count", "portability", "budget"],
  amplificadores: ["compatibility", "power_preference", "budget"],
  procesamiento_audio: ["use", "compatibility"],
  instrumentos_cuerda: ["use", "experience", "compatibility", "budget"],
  percusion: ["subtype", "use", "experience", "budget"],
};

export function getKoraQualificationSchema(family: KoraProductFamily): KoraQualificationSchema {
  return {
    family,
    priority_dimensions: DEFAULT_PRIORITIES[family] || ["use", "budget"],
    ambiguity_prompts: SIZE_PROMPTS[family]
      ? { physical_size: SIZE_PROMPTS[family] }
      : {},
  };
}

export function mergeKoraQualificationState(input: {
  family: KoraProductFamily;
  previous?: KoraQualificationState | null;
  facts: KoraQualificationFact[];
  pendingDimensions?: string[];
  questionSignature?: string | null;
}): KoraQualificationState {
  const sameFamily = input.previous?.family === input.family;
  const known = sameFamily ? { ...input.previous?.known } : {};
  input.facts.forEach((fact) => {
    const current = known[fact.dimension];
    if (!current || fact.confidence >= current.confidence || fact.source === "explicit") {
      known[fact.dimension] = fact;
    }
  });
  const asked = sameFamily ? [...(input.previous?.asked_dimensions || [])] : [];
  (input.pendingDimensions || []).forEach((dimension) => {
    if (!asked.includes(dimension)) asked.push(dimension);
  });
  return {
    schema_version: "kora-qualification-v1",
    family: input.family,
    known,
    pending_dimensions: (input.pendingDimensions || []).slice(0, 8),
    asked_dimensions: asked.slice(-16),
    attempts: sameFamily ? Math.min((input.previous?.attempts || 0) + 1, 3) : 1,
    last_question_signature: input.questionSignature || null,
    updated_at_turn: sameFamily ? (input.previous?.updated_at_turn || 0) + 1 : 1,
  };
}
