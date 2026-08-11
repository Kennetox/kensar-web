import assert from "node:assert/strict";
import test from "node:test";

import {
  getApprovedProductKnowledgeEnrichment,
  KORA_PRODUCT_KNOWLEDGE_ENRICHMENTS,
  validateProductKnowledgeEnrichments,
  type ProductKnowledgeEnrichment,
} from "../app/lib/kora/product-knowledge-enrichments";

test("the production enrichment registry is valid", () => {
  assert.deepEqual(validateProductKnowledgeEnrichments(), []);
  assert.equal(KORA_PRODUCT_KNOWLEDGE_ENRICHMENTS.every((item) => item.source_references.length > 0), true);
});

test("matches approved knowledge by stable product identifiers", () => {
  assert.equal(getApprovedProductKnowledgeEnrichment({ sku: "1128" })?.record_id, "manufacturer-jbl-flip-6-2026-08");
  assert.equal(getApprovedProductKnowledgeEnrichment({ slug: "camara-de-seguridad-tapo-tp-link-tapo-c500" })?.product_key.sku, "865");
  assert.equal(getApprovedProductKnowledgeEnrichment({ sku: "not-registered" }), null);
});

test("draft records are not applied", () => {
  const draft: ProductKnowledgeEnrichment = {
    record_id: "draft-test",
    status: "draft",
    product_key: { sku: "draft-sku" },
    reviewed_by: "Tester",
    reviewed_at: "2026-08-11",
    source: "human_review",
    source_references: ["https://example.com/evidence"],
    classification: { subtype: "draft_subtype" },
  };
  KORA_PRODUCT_KNOWLEDGE_ENRICHMENTS.push(draft);
  try {
    assert.equal(getApprovedProductKnowledgeEnrichment({ sku: "draft-sku" }), null);
  } finally {
    KORA_PRODUCT_KNOWLEDGE_ENRICHMENTS.pop();
  }
});

test("rejects duplicate approved identifiers and incomplete evidence", () => {
  const invalid: ProductKnowledgeEnrichment[] = [
    {
      record_id: "one",
      status: "approved",
      product_key: { sku: "same" },
      reviewed_by: "Reviewer",
      reviewed_at: "2026-08-11",
      source: "human_review",
      source_references: ["https://example.com/one"],
    },
    {
      record_id: "two",
      status: "approved",
      product_key: { sku: "same" },
      reviewed_by: "",
      reviewed_at: "11-08-2026",
      source: "human_review",
      source_references: [],
    },
  ];
  const errors = validateProductKnowledgeEnrichments(invalid);
  assert.equal(errors.some((error) => error.includes("duplicada")), true);
  assert.equal(errors.some((error) => error.includes("reviewed_by")), true);
  assert.equal(errors.some((error) => error.includes("reviewed_at")), true);
  assert.equal(errors.some((error) => error.includes("fuente verificable")), true);
});
