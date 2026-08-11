import assert from "node:assert/strict";
import test from "node:test";

import { normalizeKoraCatalogQuery } from "../app/lib/kora/query-normalizer";

test("prioritizes an explicit acoustic guitar phrase over broad single-word searches", () => {
  const normalized = normalizeKoraCatalogQuery(
    "una guitarra acústica estoy empezando y la quiero para aprender en casa"
  );

  assert.equal(normalized.expandedQueries[0], "guitarra acustica");
  assert.ok(normalized.expandedQueries.includes("guitarra"));
});

test("preserves the requested electric subtype in the first catalog expansion", () => {
  const normalized = normalizeKoraCatalogQuery("quiero una guitarra eléctrica para tocar rock");

  assert.equal(normalized.expandedQueries[0], "guitarra electrica");
});
