import {
  buildProductKnowledgeProfile,
  type ProductKnowledgeInput,
  type ProductKnowledgeProfile,
} from "./product-knowledge";

export type CatalogKnowledgeProduct = ProductKnowledgeInput & {
  price_mode?: string | null;
  price?: number | null;
  stock_status?: string | null;
  featured?: boolean | null;
};

export type ReviewPriority = "critical" | "high" | "medium" | "low";

export type KnowledgeReviewItem = {
  product_ref: ProductKnowledgeProfile["product_ref"];
  priority: ReviewPriority;
  review_score: number;
  reasons: string[];
  family: string;
  role: string;
  subtype: string | null;
  coverage_score: number;
  unresolved_fields: string[];
  review_flags: string[];
  featured: boolean;
  stock_status: string | null;
};

export type CatalogKnowledgeAudit = {
  schema_version: "kora-catalog-knowledge-audit-v2";
  generated_at: string;
  source: string;
  summary: {
    total_products: number;
    auto_ready: number;
    needs_review: number;
    average_coverage_score: number;
    by_family: Record<string, number>;
    by_role: Record<string, number>;
    by_priority: Record<ReviewPriority, number>;
    unresolved_fields: Record<string, number>;
    review_flags: Record<string, number>;
    enriched_profiles: number;
    by_enrichment_source: Record<string, number>;
  };
  review_queue: KnowledgeReviewItem[];
  profiles: ProductKnowledgeProfile[];
};

function increment(record: Record<string, number>, key: string) {
  record[key] = (record[key] || 0) + 1;
}

function priorityFromScore(score: number): ReviewPriority {
  if (score >= 90) return "critical";
  if (score >= 60) return "high";
  if (score >= 30) return "medium";
  return "low";
}

function buildReviewItem(product: CatalogKnowledgeProduct, profile: ProductKnowledgeProfile): KnowledgeReviewItem {
  const reasons: string[] = [];
  let score = 0;

  if (profile.review_flags.includes("contradictory_subtype")) {
    score += 100;
    reasons.push("El nombre, categoría o descripción contienen subtipos contradictorios.");
  }
  if (profile.review_flags.includes("accessory_without_family")) {
    score += 65;
    reasons.push("El producto parece accesorio, pero no tiene una familia identificable.");
  }
  if (profile.review_flags.includes("family_identity_conflict")) {
    score += 100;
    reasons.push("La categoría sugiere una familia, pero la identidad del producto no coincide.");
  }
  if (profile.classification.family.value === "unknown") {
    score += 70;
    reasons.push("No se pudo identificar la familia comercial.");
  }
  if (profile.classification.role.value === "unknown") {
    score += 75;
    reasons.push("No se pudo identificar el rol comercial.");
  }
  if (profile.unresolved_fields.includes("subtype")) {
    score += 40;
    reasons.push("Falta identificar el subtipo del producto principal.");
  }
  if (profile.unresolved_fields.includes("commercial_description")) {
    score += 25;
    reasons.push("No tiene descripción comercial para sustentar recomendaciones.");
  }
  if (profile.unresolved_fields.includes("materials")) {
    score += 5;
    reasons.push("No hay materiales verificables en los datos publicados.");
  }
  if (profile.coverage_score < 40) {
    score += 35;
    reasons.push("La cobertura de conocimiento es menor al 40%.");
  } else if (profile.coverage_score < 60) {
    score += 15;
    reasons.push("La cobertura de conocimiento es menor al 60%.");
  }
  if (product.featured && score > 0) {
    score += 15;
    reasons.push("Es un producto destacado y requiere revisión prioritaria.");
  }
  if (product.stock_status === "in_stock" && score >= 30) score += 5;

  return {
    product_ref: profile.product_ref,
    priority: priorityFromScore(score),
    review_score: score,
    reasons,
    family: profile.classification.family.value,
    role: profile.classification.role.value,
    subtype: profile.classification.subtype?.value || null,
    coverage_score: profile.coverage_score,
    unresolved_fields: profile.unresolved_fields,
    review_flags: profile.review_flags,
    featured: Boolean(product.featured),
    stock_status: product.stock_status || null,
  };
}

export function auditCatalogKnowledge(
  products: CatalogKnowledgeProduct[],
  options?: { source?: string; generatedAt?: string }
): CatalogKnowledgeAudit {
  const profiles = products.map((product) => buildProductKnowledgeProfile(product));
  const reviewItems = products.map((product, index) => buildReviewItem(product, profiles[index]));
  const reviewQueue = reviewItems
    .filter((item) => item.review_score >= 30)
    .sort((a, b) => b.review_score - a.review_score || a.product_ref.name.localeCompare(b.product_ref.name, "es"));

  const byFamily: Record<string, number> = {};
  const byRole: Record<string, number> = {};
  const unresolvedFields: Record<string, number> = {};
  const reviewFlags: Record<string, number> = {};
  const byEnrichmentSource: Record<string, number> = {};
  const byPriority: Record<ReviewPriority, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const profile of profiles) {
    increment(byFamily, profile.classification.family.value);
    increment(byRole, profile.classification.role.value);
    profile.unresolved_fields.forEach((field) => increment(unresolvedFields, field));
    profile.review_flags.forEach((flag) => increment(reviewFlags, flag));
    if (profile.enrichment) increment(byEnrichmentSource, profile.enrichment.source);
  }
  reviewQueue.forEach((item) => {
    byPriority[item.priority] += 1;
  });
  const averageCoverage = profiles.length
    ? Math.round(profiles.reduce((sum, profile) => sum + profile.coverage_score, 0) / profiles.length)
    : 0;

  return {
    schema_version: "kora-catalog-knowledge-audit-v2",
    generated_at: options?.generatedAt || new Date().toISOString(),
    source: options?.source || "catalog",
    summary: {
      total_products: products.length,
      auto_ready: products.length - reviewQueue.length,
      needs_review: reviewQueue.length,
      average_coverage_score: averageCoverage,
      by_family: byFamily,
      by_role: byRole,
      by_priority: byPriority,
      unresolved_fields: unresolvedFields,
      review_flags: reviewFlags,
      enriched_profiles: profiles.filter((profile) => Boolean(profile.enrichment)).length,
      by_enrichment_source: byEnrichmentSource,
    },
    review_queue: reviewQueue,
    profiles,
  };
}

function recordLines(record: Record<string, number>) {
  const rows = Object.entries(record).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"));
  return rows.length ? rows.map(([key, value]) => `- ${key}: ${value}`).join("\n") : "- Sin datos";
}

export function renderCatalogKnowledgeAuditMarkdown(audit: CatalogKnowledgeAudit) {
  const queueRows = audit.review_queue.slice(0, 50).map((item, index) => {
    const id = item.product_ref.id ?? "sin-id";
    return `${index + 1}. **${item.product_ref.name}** (ID ${id}) — ${item.priority}, puntaje ${item.review_score}, cobertura ${item.coverage_score}%\n   - ${item.reasons.join(" ")}`;
  });
  return `# KORA Catalog Knowledge Audit

Generado: ${audit.generated_at}
Fuente: ${audit.source}

## Resumen

- Productos analizados: **${audit.summary.total_products}**
- Perfiles listos automáticamente: **${audit.summary.auto_ready}**
- Productos que requieren revisión: **${audit.summary.needs_review}**
- Cobertura promedio: **${audit.summary.average_coverage_score}%**
- Perfiles con enriquecimiento curado: **${audit.summary.enriched_profiles}**

## Fuentes de enriquecimiento curado

${recordLines(audit.summary.by_enrichment_source)}

## Prioridad de revisión

${recordLines(audit.summary.by_priority)}

## Familias detectadas

${recordLines(audit.summary.by_family)}

## Roles comerciales

${recordLines(audit.summary.by_role)}

## Campos sin resolver

${recordLines(audit.summary.unresolved_fields)}

## Banderas de calidad

${recordLines(audit.summary.review_flags)}

## Cola priorizada

${queueRows.length ? queueRows.join("\n") : "No hay productos pendientes de revisión."}
`;
}
