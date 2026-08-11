import assert from "node:assert/strict";
import test from "node:test";

import { auditCatalogKnowledge, renderCatalogKnowledgeAuditMarkdown } from "../app/lib/kora/catalog-knowledge-audit";

test("prioritizes contradictory featured products", () => {
  const audit = auditCatalogKnowledge([
    {
      id: 1,
      name: "Guitarra Eléctrica Modelo X",
      category_path: "guitarras",
      long_description: "Guitarra acústica clásica",
      featured: true,
      stock_status: "in_stock",
    },
  ], { generatedAt: "2026-08-10T00:00:00.000Z" });
  assert.equal(audit.review_queue[0].priority, "critical");
  assert.equal(audit.review_queue[0].review_flags.includes("contradictory_subtype"), true);
});

test("separates ready profiles from review queue", () => {
  const audit = auditCatalogKnowledge([
    {
      id: 1,
      name: "Cámara de Seguridad WiFi",
      category_path: "camaras-de-seguridad",
      long_description: "Cámara WiFi con visión nocturna, carcasa de plástico y microSD.",
    },
    { id: 2, name: "Producto sin clasificar" },
  ]);
  assert.equal(audit.summary.total_products, 2);
  assert.equal(audit.summary.needs_review >= 1, true);
  assert.equal(audit.summary.by_family.seguridad, 1);
});

test("renders a readable markdown report", () => {
  const audit = auditCatalogKnowledge([{ id: 1, name: "Producto sin clasificar" }], {
    source: "test-catalog",
    generatedAt: "2026-08-10T00:00:00.000Z",
  });
  const markdown = renderCatalogKnowledgeAuditMarkdown(audit);
  assert.match(markdown, /KORA Catalog Knowledge Audit/);
  assert.match(markdown, /Productos analizados: \*\*1\*\*/);
  assert.match(markdown, /Producto sin clasificar/);
});

test("prioritizes family identity conflicts", () => {
  const audit = auditCatalogKnowledge([
    { id: 3, name: "Cámara de Videollamadas", category_path: "camaras-de-seguridad", stock_status: "in_stock" },
  ]);
  assert.equal(audit.review_queue[0].priority, "critical");
  assert.equal(audit.review_queue[0].review_flags.includes("family_identity_conflict"), true);
});

test("counts curated enrichment sources", () => {
  const audit = auditCatalogKnowledge([
    { id: 1128, sku: "1128", slug: "jbl-flip-6", name: "JBL Flip 6", category_path: "cabinas" },
  ]);
  assert.equal(audit.schema_version, "kora-catalog-knowledge-audit-v2");
  assert.equal(audit.summary.enriched_profiles, 1);
  assert.equal(audit.summary.by_enrichment_source.manufacturer_documentation, 1);
  assert.match(renderCatalogKnowledgeAuditMarkdown(audit), /Perfiles con enriquecimiento curado: \*\*1\*\*/);
});
