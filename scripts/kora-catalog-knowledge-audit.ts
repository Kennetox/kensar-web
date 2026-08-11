import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  auditCatalogKnowledge,
  renderCatalogKnowledgeAuditMarkdown,
  type CatalogKnowledgeProduct,
} from "../app/lib/kora/catalog-knowledge-audit";

type CatalogPage = {
  items: CatalogKnowledgeProduct[];
  total: number;
  page: number;
  page_size: number;
};

type CatalogDetail = CatalogKnowledgeProduct & {
  slug: string;
  specs?: Record<string, string> | null;
};

function argValue(name: string) {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || "";
}

function safeBaseUrl() {
  const value = argValue("base-url") || process.env.KORA_CATALOG_BASE_URL || process.env.METRIK_API_BASE_URL || "";
  if (!value) throw new Error("Falta --base-url, KORA_CATALOG_BASE_URL o METRIK_API_BASE_URL");
  return value.replace(/\/+$/, "");
}

async function fetchPage(baseUrl: string, page: number, pageSize: number) {
  const url = new URL(`${baseUrl}/web/catalog/products`);
  url.searchParams.set("page", String(page));
  url.searchParams.set("page_size", String(pageSize));
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Catálogo respondió ${response.status} en página ${page}`);
  return response.json() as Promise<CatalogPage>;
}

async function fetchAllProducts(baseUrl: string) {
  const pageSize = 50;
  const first = await fetchPage(baseUrl, 1, pageSize);
  const products = [...first.items];
  const totalPages = Math.max(1, Math.ceil(first.total / first.page_size));
  for (let page = 2; page <= totalPages; page += 1) {
    const result = await fetchPage(baseUrl, page, pageSize);
    products.push(...result.items);
  }
  return products;
}

async function fetchProductDetail(baseUrl: string, slug: string) {
  const response = await fetch(`${baseUrl}/web/catalog/products/${encodeURIComponent(slug)}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Detalle respondió ${response.status} para ${slug}`);
  return response.json() as Promise<CatalogDetail>;
}

async function enrichFromCatalogDetails(baseUrl: string, products: CatalogKnowledgeProduct[]) {
  const enriched = [...products];
  let nextIndex = 0;
  let enrichedCount = 0;
  let failedCount = 0;
  const worker = async () => {
    while (nextIndex < products.length) {
      const index = nextIndex;
      nextIndex += 1;
      const product = products[index];
      if (!product.slug) continue;
      try {
        const detail = await fetchProductDetail(baseUrl, product.slug);
        enriched[index] = {
          ...product,
          ...detail,
          price: product.price ?? detail.price,
          stock_status: product.stock_status ?? detail.stock_status,
          featured: product.featured ?? detail.featured,
          specs: detail.specs || product.specs || {},
          service: product.service ?? detail.service ?? detail.stock_status === "service",
        };
        enrichedCount += 1;
      } catch {
        failedCount += 1;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(8, products.length) }, () => worker()));
  return { products: enriched, enrichedCount, failedCount };
}

async function main() {
  const baseUrl = safeBaseUrl();
  const outputDir = path.resolve(process.cwd(), argValue("output-dir") || "reports/kora-knowledge");
  const catalogProducts = await fetchAllProducts(baseUrl);
  const details = await enrichFromCatalogDetails(baseUrl, catalogProducts);
  const products = details.products;
  const audit = auditCatalogKnowledge(products, { source: `${baseUrl}/web/catalog/products + product details` });
  const dateKey = audit.generated_at.slice(0, 10);
  const jsonPath = path.join(outputDir, `${dateKey}-production-audit.json`);
  const markdownPath = path.join(outputDir, `${dateKey}-production-audit.md`);
  await mkdir(outputDir, { recursive: true });
  await Promise.all([
    writeFile(jsonPath, `${JSON.stringify(audit, null, 2)}\n`, "utf8"),
    writeFile(markdownPath, renderCatalogKnowledgeAuditMarkdown(audit), "utf8"),
  ]);
  console.log(`KORA knowledge audit: ${products.length} productos`);
  console.log(`Detalles enriquecidos: ${details.enrichedCount} · Fallidos: ${details.failedCount}`);
  console.log(`Listos: ${audit.summary.auto_ready} · Revisión: ${audit.summary.needs_review} · Cobertura: ${audit.summary.average_coverage_score}%`);
  console.log(`Markdown: ${markdownPath}`);
  console.log(`JSON: ${jsonPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
