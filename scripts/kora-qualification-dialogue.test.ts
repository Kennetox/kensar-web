import assert from "node:assert/strict";
import test from "node:test";

import { extractKoraEntities } from "../app/lib/kora/entities";
import { decideKoraQualificationTurn } from "../app/lib/kora/qualification-dialogue-policy";
import { mergeKoraQualificationState } from "../app/lib/kora/qualification-state";
import { interpretKoraQualificationUtterance } from "../app/lib/kora/utterance-interpreter";

const cabinetFallback = {
  family: "cabinas" as const,
  answer: "Necesito saber dónde la usarás.",
  actions: [
    { id: "home", label: "Casa", type: "prompt" as const, value: "La usaré en casa" },
    { id: "event", label: "Evento", type: "prompt" as const, value: "La usaré en eventos" },
  ],
  suggestions: [],
  missing_dimensions: ["uso"],
};

test("marks small as ambiguous when its meaning is not explained", () => {
  const interpretation = interpretKoraQualificationUtterance({
    latestQuery: "Quiero una cabina pequeña",
    combinedQuery: "Quiero una cabina pequeña",
    family: "cabinas",
    nlu: extractKoraEntities("Quiero una cabina pequeña"),
  });

  assert.equal(interpretation.facts.find((item) => item.dimension === "physical_size")?.value, "small");
  assert.deepEqual(interpretation.ambiguous_dimensions, ["physical_size"]);
});

test("uses a family-specific clarification for an ambiguous size", () => {
  const interpretation = interpretKoraQualificationUtterance({
    latestQuery: "Quiero una cabina pequeña",
    combinedQuery: "Quiero una cabina pequeña",
    family: "cabinas",
    nlu: extractKoraEntities("Quiero una cabina pequeña"),
  });
  const decision = decideKoraQualificationTurn({
    family: "cabinas",
    interpretation,
    fallbackClarification: cabinetFallback,
  });

  assert.equal(decision.kind, "ask");
  if (decision.kind === "ask") {
    assert.match(decision.clarification.answer, /compacta para transportarla|casa y reuniones pequeñas/i);
    assert.deepEqual(decision.clarification.actions.map((action) => action.label), ["Compacta y portátil", "Casa o reuniones"]);
  }
});

test("advances when compact and portable resolve the ambiguity", () => {
  const previous = mergeKoraQualificationState({
    family: "cabinas",
    facts: [{ dimension: "physical_size", value: "small", confidence: 0.9, source: "explicit", evidence: "pequeña" }],
    pendingDimensions: ["portability", "use"],
    questionSignature: "small meaning",
  });
  const interpretation = interpretKoraQualificationUtterance({
    latestQuery: "La quiero compacta y fácil de transportar",
    combinedQuery: "Quiero una cabina pequeña compacta y fácil de transportar",
    family: "cabinas",
    nlu: extractKoraEntities("La quiero compacta y fácil de transportar"),
    previousState: previous,
  });
  const decision = decideKoraQualificationTurn({
    family: "cabinas",
    interpretation,
    previousState: previous,
    fallbackClarification: cabinetFallback,
  });

  assert.equal(interpretation.ambiguous_dimensions.length, 0);
  assert.equal(decision.kind, "recommend");
  assert.equal(decision.state.known.portability?.value, "important");
});

test("classifies direct, uncertain, correction and new-intent turns", () => {
  const previous = mergeKoraQualificationState({ family: "cabinas", facts: [] });
  const interpret = (latestQuery: string) =>
    interpretKoraQualificationUtterance({
      latestQuery,
      combinedQuery: `Quiero una cabina ${latestQuery}`,
      family: "cabinas",
      nlu: extractKoraEntities(latestQuery),
      previousState: previous,
    }).mode;

  assert.equal(interpret("muéstrame opciones"), "direct_request");
  assert.equal(interpret("no sé"), "uncertain");
  assert.equal(interpret("mejor la prefiero recargable"), "correction");
  assert.equal(interpret("mejor quiero una guitarra"), "new_intent");
});

test("new explicit facts replace lower-confidence inferred facts", () => {
  const previous = mergeKoraQualificationState({
    family: "cabinas",
    facts: [{ dimension: "physical_size", value: "medium", confidence: 0.6, source: "inferred", evidence: "context" }],
  });
  const next = mergeKoraQualificationState({
    family: "cabinas",
    previous,
    facts: [{ dimension: "physical_size", value: "small", confidence: 0.95, source: "explicit", evidence: "pequeña" }],
  });

  assert.equal(next.known.physical_size?.value, "small");
});
