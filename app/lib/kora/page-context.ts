import type { KoraPageContext } from "./knowledge-types";
import { findCategoryKnowledge } from "./category-knowledge";

function normalize(value: string) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizePageContext(input: unknown): KoraPageContext | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const pageType = typeof raw.pageType === "string" ? raw.pageType : "unknown";
  const allowed = new Set(["home", "category", "subcategory", "product", "unknown"]);
  const safeType = allowed.has(pageType) ? (pageType as KoraPageContext["pageType"]) : "unknown";

  const ctx: KoraPageContext = { pageType: safeType };
  if (typeof raw.categorySlug === "string") ctx.categorySlug = raw.categorySlug;
  if (typeof raw.categoryName === "string") ctx.categoryName = raw.categoryName;
  if (typeof raw.subcategorySlug === "string") ctx.subcategorySlug = raw.subcategorySlug;
  if (typeof raw.subcategoryName === "string") ctx.subcategoryName = raw.subcategoryName;
  if (typeof raw.productId === "string" || typeof raw.productId === "number") ctx.productId = raw.productId;
  if (typeof raw.productName === "string") ctx.productName = raw.productName;
  if (Number.isFinite(Number(raw.productPrice))) ctx.productPrice = Number(raw.productPrice);
  if (typeof raw.productBrand === "string") ctx.productBrand = raw.productBrand;
  if (typeof raw.productCategory === "string") ctx.productCategory = raw.productCategory;
  if (typeof raw.productDescription === "string") ctx.productDescription = raw.productDescription;
  if (raw.productAttributes && typeof raw.productAttributes === "object") {
    ctx.productAttributes = raw.productAttributes as Record<string, unknown>;
  }

  return ctx;
}

export function shouldShowCategoryOpeningMessage(memoryCategorySlug: string | null | undefined, pageContext?: KoraPageContext | null) {
  if (!pageContext) return false;
  if (pageContext.pageType !== "category" && pageContext.pageType !== "subcategory") return false;
  const slug = normalize(pageContext.subcategorySlug || pageContext.categorySlug || "");
  if (!slug) return false;
  return slug !== normalize(memoryCategorySlug || "");
}

export function detectCategoryKnowledgeFromPageContext(pageContext?: KoraPageContext | null) {
  if (!pageContext) return null;
  const probes = [pageContext.subcategoryName, pageContext.categoryName, pageContext.subcategorySlug, pageContext.categorySlug]
    .filter((v): v is string => Boolean(v && typeof v === "string"));
  for (const probe of probes) {
    const found = findCategoryKnowledge(probe);
    if (found) return found;
  }
  return null;
}
