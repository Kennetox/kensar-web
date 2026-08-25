import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyAvailabilityCandidate,
  parseCatalogAvailabilityQuestion,
  shouldContinueAvailabilityToSalesFlow,
} from "../app/lib/kora/catalog-availability";

test("parses common catalog existence questions", () => {
  assert.equal(parseCatalogAvailabilityQuestion("¿Tienes audífonos?")?.subject, "audifonos");
  assert.equal(parseCatalogAvailabilityQuestion("¿Ustedes venden pedales para guitarra?")?.subject, "pedales para guitarra");
  assert.equal(parseCatalogAvailabilityQuestion("cámaras wifi tienen?")?.subject, "camaras wifi");
});

test("expands known commercial synonyms", () => {
  const parsed = parseCatalogAvailabilityQuestion("¿Tienen audífonos?");
  assert.deepEqual(parsed?.search_terms, ["audifonos", "auriculares", "diadema", "headphones", "headset"]);
});

test("does not intercept support and business questions", () => {
  assert.equal(parseCatalogAvailabilityQuestion("¿Tienen garantía?"), null);
  assert.equal(parseCatalogAvailabilityQuestion("¿Tienen envíos?"), null);
  assert.equal(parseCatalogAvailabilityQuestion("¿Tienen tienda?"), null);
});

test("classifies direct and related catalog matches", () => {
  const parsed = parseCatalogAvailabilityQuestion("¿Tienen audífonos?");
  assert.ok(parsed);
  assert.equal(classifyAvailabilityCandidate(parsed!, { name: "Audífonos Bluetooth Pro", category_name: "Audio" }).match, "direct");
  assert.equal(classifyAvailabilityCandidate(parsed!, { name: "Transmisor de audio", short_description: "Compatible con audífonos Bluetooth" }).match, "related");
  assert.equal(classifyAvailabilityCandidate(parsed!, { name: "Cable HDMI", category_name: "Video" }).match, "none");
});

test("keeps accessories separate from the requested main product", () => {
  const parsed = parseCatalogAvailabilityQuestion("¿Tienen guitarras?");
  assert.ok(parsed);
  assert.equal(classifyAvailabilityCandidate(parsed!, { name: "Guitarra acústica", commercial_role: "main_product" }).match, "direct");
  assert.equal(classifyAvailabilityCandidate(parsed!, { name: "Encordado para guitarra clásica", commercial_role: "accessory" }).match, "related");
});

test("continues existing sales qualification for available advisory families", () => {
  assert.equal(shouldContinueAvailabilityToSalesFlow({ hasDirectMatch: true, family: "guitarras" }), true);
  assert.equal(shouldContinueAvailabilityToSalesFlow({ hasDirectMatch: true, family: "cabinas" }), true);
  assert.equal(shouldContinueAvailabilityToSalesFlow({ hasDirectMatch: true, family: "microfonos" }), true);
  assert.equal(shouldContinueAvailabilityToSalesFlow({ hasDirectMatch: true, family: "unknown" }), false);
  assert.equal(shouldContinueAvailabilityToSalesFlow({ hasDirectMatch: false, family: "guitarras" }), false);
});
