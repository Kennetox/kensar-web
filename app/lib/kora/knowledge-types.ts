export type KoraPageContext = {
  pageType: "home" | "category" | "subcategory" | "product" | "unknown";
  categorySlug?: string;
  categoryName?: string;
  subcategorySlug?: string;
  subcategoryName?: string;
  productId?: string | number;
  productName?: string;
  productPrice?: number;
  productBrand?: string;
  productCategory?: string;
  productDescription?: string;
  productAttributes?: Record<string, unknown>;
};

export type KoraAttributeKnowledge = {
  id: string;
  label: string;
  aliases: string[];
  explanation: string;
  commercialBenefit: string;
  goodFor: string[];
  limitations: string;
  salesAngle: string;
  relatedCategories: string[];
  suggestedFollowups: string[];
};

export type KoraCategoryKnowledge = {
  id: string;
  label: string;
  aliases: string[];
  shortIntro: string;
  commonQuestions: string[];
  buyingCriteria: string[];
  usageContexts: string[];
  relatedAttributes: string[];
  salesGuidance: string;
  suggestedOpeningMessage: string;
};

export type KoraGuidanceIntent =
  | "attribute_explanation"
  | "category_guidance"
  | "product_advice"
  | "objection_handling"
  | "compatibility_question"
  | null;

export type KoraContextualSellingDebug = {
  detectedAttribute?: string | null;
  detectedCategoryKnowledge?: string | null;
  detectedGuidanceIntent?: KoraGuidanceIntent;
  pageContext?: KoraPageContext;
  contextualSellingReason?: string;
  matchedKnowledgeSource?: "attribute" | "category" | "page_context" | "heuristic" | null;
  relatedAttributes?: string[];
  categoryKnowledgeId?: string | null;
};
