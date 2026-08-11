import assert from "node:assert/strict";
import test from "node:test";

import { buildProductKnowledgeProfile } from "../app/lib/kora/product-knowledge";
import {
  buildProductSalesPitch,
  buildSalesRecommendationNarrative,
  knowledgeFitScore,
  productMeetsKnowledgeConstraints,
} from "../app/lib/kora/sales-advisor";

test("turns verified JBL knowledge into a benefit and an honest limitation", () => {
  const product = { id: 1128, name: "JBL Flip 6" };
  const profile = buildProductKnowledgeProfile({
    ...product,
    sku: "1128",
    slug: "jbl-flip-6",
    category_path: "cabinas",
  });
  const pitch = buildProductSalesPitch(product, profile, "quiero un parlante bluetooth para llevar");
  assert.match(pitch.summary, /Bluetooth 5\.1|audio inalámbrico/i);
  assert.match(pitch.summary, /autonomía real cambia/i);
  assert.doesNotMatch(pitch.summary, /madera|aluminio|plástico/i);
});

test("rejects consoles with fewer or unknown channels than explicitly requested", () => {
  const tenChannels = buildProductKnowledgeProfile({ name: "Consola 10 Canales", category_path: "consolas" });
  const threeChannels = buildProductKnowledgeProfile({ name: "Consola 3 Canales", category_path: "consolas" });
  const unknownChannels = buildProductKnowledgeProfile({ name: "Consola Modelo X", category_path: "consolas" });
  assert.equal(productMeetsKnowledgeConstraints(tenChannels, "consola para 8 entradas"), true);
  assert.equal(productMeetsKnowledgeConstraints(threeChannels, "consola para 8 entradas"), false);
  assert.equal(productMeetsKnowledgeConstraints(unknownChannels, "consola para 8 entradas"), false);
  assert.equal(knowledgeFitScore(tenChannels, "consola para 8 entradas") > knowledgeFitScore(threeChannels, "consola para 8 entradas"), true);
});

test("respects an explicit television size", () => {
  const tv32 = buildProductKnowledgeProfile({ name: "Televisor Smart TV 32 pulgadas", category_path: "televisores" });
  const tv50 = buildProductKnowledgeProfile({ name: "Televisor Smart TV 50 pulgadas", category_path: "televisores" });
  assert.equal(productMeetsKnowledgeConstraints(tv32, "televisor de 32 pulgadas"), true);
  assert.equal(productMeetsKnowledgeConstraints(tv50, "televisor de 32 pulgadas"), false);
});

test("warns that a passive cabinet needs external amplification", () => {
  const product = { id: 20, name: "Cabina Pro 15 Pasiva" };
  const profile = buildProductKnowledgeProfile({ ...product, category_path: "cabinas-pasivas" });
  const pitch = buildProductSalesPitch(product, profile, "quiero una cabina pasiva");
  assert.match(pitch.summary, /amplificador externo compatible/i);
});

test("uses requested verified features to improve product fit", () => {
  const enriched = buildProductKnowledgeProfile({
    id: 865,
    sku: "865",
    slug: "camara-de-seguridad-tapo-tp-link-tapo-c500",
    name: "Camara de Seguridad Tapo Tp-Link Tapo C500",
    category_path: "camaras-de-seguridad",
  });
  const generic = buildProductKnowledgeProfile({
    id: 99,
    name: "Camara de Seguridad Genérica",
    category_path: "camaras-de-seguridad",
  });
  assert.equal(knowledgeFitScore(enriched, "camara con vision nocturna y seguimiento" ) > knowledgeFitScore(generic, "camara con vision nocturna y seguimiento"), true);
});

test("builds a concise ranked narrative with requirements", () => {
  const first = { id: 1, name: "Cabina Activa Uno" };
  const second = { id: 2, name: "Cabina Pasiva Dos" };
  const result = buildSalesRecommendationNarrative({
    lead: "Estas son las opciones que mejor encajan.",
    query: "cabina para evento",
    rows: [
      { product: first, knowledge: buildProductKnowledgeProfile({ ...first, category_path: "cabinas-activas" }) },
      { product: second, knowledge: buildProductKnowledgeProfile({ ...second, category_path: "cabinas-pasivas" }) },
    ],
  });
  assert.match(result.answer, /1\. Cabina Activa Uno/);
  assert.match(result.answer, /2\. Cabina Pasiva Dos/);
  assert.match(result.answer, /compatibilidad/i);
  assert.match(result.answer, /reproducir y amplificar audio/i);
  assert.equal(result.pitches.length, 2);
});
