import assert from "node:assert/strict";
import test from "node:test";
import {
  interpretPostRecommendationTurn,
  mergeRecommendationConstraints,
  resolveRecommendationReferences,
  sanitizeRecommendationState,
  type KoraRecommendationState,
} from "../app/lib/kora/recommendation-state";

const state: KoraRecommendationState = {
  schema_version: "kora-recommendation-v1",
  family: "cabinas",
  base_query: "cabina compacta para reuniones pequenas",
  active_constraints: [{ dimension: "size", value: "smaller", mode: "prefer", evidence: "cabina pequeña" }],
  shown_product_ids: [11, 12, 13],
  current_results: [
    { id: 11, slug: "cabina-alpha", name: "Cabina Alpha 8", price: 450000, category_path: "cabinas", category_name: "Cabinas", brand: "Alpha", score: 30 },
    { id: 12, slug: "cabina-yamaha", name: "Cabina Yamaha 10", price: 720000, category_path: "cabinas", category_name: "Cabinas", brand: "Yamaha", score: 35 },
    { id: 13, slug: "cabina-beta", name: "Cabina Beta 12", price: 600000, category_path: "cabinas", category_name: "Cabinas", brand: "Beta", score: 26 },
  ],
  selected_product_ids: [],
  rejected_product_ids: [],
  comparison_product_ids: [],
  round: 1,
};

test("understands a request for unseen options", () => {
  const result = interpretPostRecommendationTurn({ query: "bueno, ¿qué más tienes?", state });
  assert.equal(result.operation, "more_options");
  assert.ok(result.confidence > 0.9);
});

test("understands colloquial requests for other options", () => {
  const result = interpretPostRecommendationTurn({ query: "ninguna de esas, dame otras", state });
  assert.equal(result.operation, "reject");
});

test("resolves ordinal references", () => {
  assert.deepEqual(resolveRecommendationReferences("me gusta la segunda", state), [12]);
  assert.deepEqual(resolveRecommendationReferences("qué tiene la tercera", state), [13]);
});

test("resolves brand references", () => {
  assert.deepEqual(resolveRecommendationReferences("compárame la Yamaha con la primera", state), [11, 12]);
});

test("recognizes comparisons and selected products", () => {
  const comparison = interpretPostRecommendationTurn({ query: "compárame la primera con la Yamaha", state });
  assert.equal(comparison.operation, "compare");
  assert.deepEqual(comparison.referenced_product_ids, [11, 12]);
  const selection = interpretPostRecommendationTurn({ query: "me quedo con la segunda", state });
  assert.equal(selection.operation, "select");
  assert.deepEqual(selection.referenced_product_ids, [12]);
});

test("recognizes product-specific questions", () => {
  const result = interpretPostRecommendationTurn({ query: "¿la primera tiene bluetooth?", state });
  assert.equal(result.operation, "product_question");
  assert.deepEqual(result.referenced_product_ids, [11]);
});

test("recognizes refinements and extracts replacement criteria", () => {
  const result = interpretPostRecommendationTurn({ query: "mejor una más económica y portátil", state });
  assert.equal(result.operation, "refine");
  assert.deepEqual(result.constraints.map((item) => item.dimension).sort(), ["portability", "price"]);
});

test("uses a referenced product as the anchor for a refinement", () => {
  const result = interpretPostRecommendationTurn({ query: "me gusta la segunda, pero quiero algo parecido más barato", state });
  assert.equal(result.operation, "refine");
  assert.deepEqual(result.referenced_product_ids, [12]);
  assert.equal(result.constraints.find((item) => item.dimension === "price")?.value, "lower");
});

test("understands a different-brand refinement", () => {
  const result = interpretPostRecommendationTurn({ query: "muéstrame de otra marca", state });
  assert.equal(result.operation, "refine");
  assert.equal(result.constraints[0]?.dimension, "brand");
  assert.equal(result.constraints[0]?.mode, "exclude");
});

test("understands corrections instead of retaining contradictory constraints", () => {
  const size = interpretPostRecommendationTurn({ query: "mejor no tan pequeña", state });
  assert.equal(size.constraints.find((item) => item.dimension === "size")?.value, "medium");
  const portability = interpretPostRecommendationTurn({ query: "ya no necesito que sea portátil", state });
  assert.equal(portability.constraints.find((item) => item.dimension === "portability")?.value, "not_important");
});

test("new product families do not contaminate the previous search", () => {
  const result = interpretPostRecommendationTurn({ query: "ahora necesito un micrófono inalámbrico", state });
  assert.equal(result.operation, "new_family");
  assert.equal(result.detected_family, "microfonos");
});

test("rejects a whole batch and captures a reason", () => {
  const result = interpretPostRecommendationTurn({ query: "ninguna, están muy caras", state });
  assert.equal(result.operation, "reject");
  assert.equal(result.rejection_reason, "price");
  assert.equal(result.constraints[0]?.dimension, "price");
});

test("constraint updates replace a dimension instead of accumulating contradictions", () => {
  const merged = mergeRecommendationConstraints(state.active_constraints, [
    { dimension: "size", value: "larger", mode: "prefer", evidence: "mejor una más grande" },
  ]);
  assert.equal(merged.filter((item) => item.dimension === "size").length, 1);
  assert.equal(merged.find((item) => item.dimension === "size")?.value, "larger");
});

test("sanitizes persisted state and limits history", () => {
  const sanitized = sanitizeRecommendationState({
    ...state,
    shown_product_ids: Array.from({ length: 100 }, (_, index) => index + 1),
    current_results: [...state.current_results, { id: 0, slug: "", name: "", price: null }],
  });
  assert.equal(sanitized?.shown_product_ids.length, 60);
  assert.equal(sanitized?.current_results.length, 3);
});

test("does not hijack unrelated support questions", () => {
  const result = interpretPostRecommendationTurn({ query: "¿cómo funciona la garantía general?", state });
  assert.equal(result.operation, "none");
});
