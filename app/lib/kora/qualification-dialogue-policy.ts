import type { RecommendationClarification } from "./recommendation-readiness";
import {
  getKoraQualificationSchema,
  mergeKoraQualificationState,
  type KoraQualificationState,
} from "./qualification-state";
import type { KoraProductFamily } from "./product-family-guards";
import type { KoraUtteranceInterpretation } from "./utterance-interpreter";

export type KoraQualificationDecision =
  | { kind: "recommend"; state: KoraQualificationState }
  | { kind: "ask"; clarification: RecommendationClarification; state: KoraQualificationState };

function signature(value: string) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function hasEnoughSemanticFacts(family: KoraProductFamily, state: KoraQualificationState) {
  const has = (dimension: keyof KoraQualificationState["known"]) => Boolean(state.known[dimension]);
  if (family === "cabinas") {
    return (
      (has("physical_size") && (has("portability") || has("use"))) ||
      (has("power_preference") && (has("use") || has("space_scale") || has("people_count")))
    );
  }
  if (family === "guitarras") return has("subtype") && (has("use") || has("experience"));
  if (family === "microfonos") return has("subtype") && has("use");
  if (family === "seguridad") return has("system_type") && has("environment");
  if (family === "consolas" || family === "interfaces_audio") return has("input_count") && has("use");
  if (family === "teclados") return has("use") && (has("physical_size") || has("experience"));
  if (family === "megafonos") return has("use") && (has("people_count") || has("portability"));
  return false;
}

export function decideKoraQualificationTurn(input: {
  family: KoraProductFamily;
  interpretation: KoraUtteranceInterpretation;
  previousState?: KoraQualificationState | null;
  fallbackClarification: RecommendationClarification | null;
}): KoraQualificationDecision {
  const schema = getKoraQualificationSchema(input.family);
  const previousAttempts = input.previousState?.family === input.family ? input.previousState.attempts : 0;
  const nextState = mergeKoraQualificationState({
    family: input.family,
    previous: input.previousState,
    facts: input.interpretation.facts,
    pendingDimensions: input.fallbackClarification?.missing_dimensions || [],
  });

  if (
    input.interpretation.mode === "direct_request" ||
    previousAttempts >= 2 ||
    !input.fallbackClarification ||
    hasEnoughSemanticFacts(input.family, nextState)
  ) {
    return {
      kind: "recommend",
      state: nextState,
    };
  }

  const ambiguousDimension = input.interpretation.ambiguous_dimensions.find(
    (dimension) => schema.ambiguity_prompts[dimension]
  );
  const ambiguityPrompt = ambiguousDimension ? schema.ambiguity_prompts[ambiguousDimension] : null;
  const clarification: RecommendationClarification = ambiguityPrompt
    ? {
        family: input.family,
        answer: ambiguityPrompt.answer,
        actions: ambiguityPrompt.actions,
        suggestions: [],
        missing_dimensions: ambiguityPrompt.resolvedDimensions,
      }
    : input.fallbackClarification;

  const questionSignature = signature(clarification.answer);
  const repeated = Boolean(
    input.previousState?.last_question_signature &&
      input.previousState.last_question_signature === questionSignature
  );
  const safeClarification = repeated
    ? {
        ...clarification,
        answer:
          "Tengo presente lo que me dijiste. Para avanzar, elige la opción más cercana; si ninguna encaja, puedes pedirme que te muestre resultados.",
        actions: clarification.actions.slice(0, 2),
        suggestions: ["Muéstrame opciones"],
      }
    : clarification;

  return {
    kind: "ask",
    clarification: safeClarification,
    state: mergeKoraQualificationState({
      family: input.family,
      previous: input.previousState,
      facts: input.interpretation.facts,
      pendingDimensions: safeClarification.missing_dimensions,
      questionSignature: signature(safeClarification.answer),
    }),
  };
}
