export type PersonalizableProductType = "campana" | "guiro" | "maraca";

export type PersonalizableSize = "small" | "large";

export type StylePreset = {
  id: string;
  label: string;
  kind: "solid" | "gradient";
  fill: string;
  textColor: string;
};

export type ProductPreset = {
  id: PersonalizableProductType;
  name: string;
  description: string;
  textLabel: string;
  textPlaceholder: string;
  cardImage: string;
  homeBeforeImage?: string;
  homeAfterImage?: string;
  homeHoverTitle?: string;
  homeHoverCopy?: string;
  homeWhatsappMessage?: string;
};

export const PERSONALIZABLE_PRODUCTS: ProductPreset[] = [
  {
    id: "campana",
    name: "Campana salsera",
    description: "Personaliza color y texto de tu campana.",
    textLabel: "Texto en campana",
    textPlaceholder: "Ej: Son de Barrio",
    cardImage: "/personaliza/cards/campana.png",
    homeBeforeImage: "/personaliza/cards/campana-cromada.png",
    homeAfterImage: "/personaliza/cards/campana.png",
    homeHoverTitle: "Convierte tu campana en una pieza única",
    homeHoverCopy: "Nombre, logo o bandera aplicada sobre un acabado profesional.",
    homeWhatsappMessage: "Hola, quiero personalizar una campana.",
  },
  {
    id: "guiro",
    name: "Güiro salsero",
    description: "Diseña una versión única de tu güiro.",
    textLabel: "Texto en güiro",
    textPlaceholder: "Ej: Rumba Viva",
    cardImage: "/personaliza/cards/guiro.png",
    homeBeforeImage: "/personaliza/cards/guiro.png",
    homeAfterImage: "/personaliza/cards/guiro.png",
    homeHoverTitle: "Lleva tu güiro a otro nivel",
    homeHoverCopy: "Personaliza con nombre, logo o una gráfica a tu estilo.",
    homeWhatsappMessage: "Hola, quiero personalizar un güiro.",
  },
  {
    id: "maraca",
    name: "Maracas",
    description: "Define estilo y frase para tus maracas.",
    textLabel: "Texto en maracas",
    textPlaceholder: "Ej: Clan Rivera",
    cardImage: "/personaliza/cards/maracas1.png",
    homeBeforeImage: "/personaliza/cards/maracas1.png",
    homeAfterImage: "/personaliza/cards/maracas1.png",
    homeHoverTitle: "Haz que tus maracas destaquen",
    homeHoverCopy: "Ideal para nombres, colores y diseños con identidad propia.",
    homeWhatsappMessage: "Hola, quiero personalizar unas maracas.",
  },
];

export const PERSONALIZABLE_SIZES: Array<{ id: PersonalizableSize; label: string }> = [
  { id: "small", label: "Mediano" },
  { id: "large", label: "Grande" },
];

export type PersonalizableCheckoutBinding = {
  productId: string;
  productName: string;
  productSku: string;
  productSlug: string;
  productPrice: number | null;
  productComparePrice: number | null;
  personalizationId: string;
  personalizationName: string;
  personalizationSku: string;
  personalizationPrice: number | null;
  personalizationComparePrice: number | null;
};

export type PersonalizationBindingVariantKey =
  | "campana_clasica_mediana"
  | "campana_clasica_grande"
  | "campana_cromada_mediana"
  | "campana_cromada_grande"
  | "guiro_mediano"
  | "guiro_grande"
  | "maraca_par";

export type PersonalizationBindingVariant = {
  product_id?: string | null;
  product_name?: string | null;
  product_sku?: string | null;
  product_slug?: string | null;
  product_price?: number | null;
  product_compare_price?: number | null;
  service_id?: string | null;
  service_name?: string | null;
  service_sku?: string | null;
  service_price?: number | null;
  service_compare_price?: number | null;
};

export type PersonalizationBindingsMap = Partial<
  Record<PersonalizationBindingVariantKey, PersonalizationBindingVariant>
>;

function resolveVariantKey(
  product: PersonalizableProductType,
  size: PersonalizableSize,
  campanaType?: "clasica" | "cromada"
): PersonalizationBindingVariantKey | null {
  if (product === "campana") {
    if (campanaType === "cromada") return size === "large" ? "campana_cromada_grande" : "campana_cromada_mediana";
    return size === "large" ? "campana_clasica_grande" : "campana_clasica_mediana";
  }
  if (product === "guiro") return size === "large" ? "guiro_grande" : "guiro_mediano";
  if (product === "maraca") return "maraca_par";
  return null;
}

export function resolvePersonalizableCheckoutBinding(
  product: PersonalizableProductType,
  size: PersonalizableSize,
  options?: {
    campanaType?: "clasica" | "cromada";
    bindingsMap?: PersonalizationBindingsMap | null;
  }
): PersonalizableCheckoutBinding | null {
  const variantKey = resolveVariantKey(product, size, options?.campanaType);
  const fromBackend = variantKey ? options?.bindingsMap?.[variantKey] : null;
  if (!fromBackend) return null;
  const productId = (fromBackend.product_id || "").trim();
  const productName = (fromBackend.product_name || "").trim();
  const productSku = (fromBackend.product_sku || "").trim();
  const productSlug = (fromBackend.product_slug || "").trim();
  const productPrice =
    typeof fromBackend.product_price === "number" ? fromBackend.product_price : null;
  const productComparePrice =
    typeof fromBackend.product_compare_price === "number" ? fromBackend.product_compare_price : null;
  const personalizationId = (fromBackend.service_id || "").trim();
  const personalizationName = (fromBackend.service_name || "").trim();
  const personalizationSku = (fromBackend.service_sku || "").trim();
  const personalizationPrice =
    typeof fromBackend.service_price === "number" ? fromBackend.service_price : null;
  const personalizationComparePrice =
    typeof fromBackend.service_compare_price === "number"
      ? fromBackend.service_compare_price
      : null;
  if (!productId || !productSku || !personalizationId || !personalizationSku) return null;
  return {
    productId,
    productName,
    productSku,
    productSlug,
    productPrice,
    productComparePrice,
    personalizationId,
    personalizationName,
    personalizationSku,
    personalizationPrice,
    personalizationComparePrice,
  };
}

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: "blanco-clasico",
    label: "Blanco clásico",
    kind: "solid",
    fill: "#ffffff",
    textColor: "#111827",
  },
  {
    id: "rojo-vivo",
    label: "Rojo vivo",
    kind: "solid",
    fill: "#dc2626",
    textColor: "#fff7ed",
  },
  {
    id: "amarillo-oro",
    label: "Amarillo oro",
    kind: "solid",
    fill: "#facc15",
    textColor: "#1f2937",
  },
  {
    id: "azul-tropical",
    label: "Azul tropical",
    kind: "solid",
    fill: "#2563eb",
    textColor: "#f8fafc",
  },
  {
    id: "gradiente-fuego",
    label: "Gradiente fuego",
    kind: "gradient",
    fill: "linear-gradient(135deg, #f97316 0%, #dc2626 50%, #7f1d1d 100%)",
    textColor: "#fff7ed",
  },
  {
    id: "gradiente-caribe",
    label: "Gradiente caribe",
    kind: "gradient",
    fill: "linear-gradient(135deg, #0ea5e9 0%, #2563eb 45%, #6d28d9 100%)",
    textColor: "#f8fafc",
  },
  {
    id: "gradiente-selva",
    label: "Gradiente selva",
    kind: "gradient",
    fill: "linear-gradient(135deg, #16a34a 0%, #15803d 45%, #14532d 100%)",
    textColor: "#f0fdf4",
  },
];

export const DEFAULT_PERSONALIZATION = {
  product: PERSONALIZABLE_PRODUCTS[0].id,
  size: PERSONALIZABLE_SIZES[0].id,
  styleId: STYLE_PRESETS[0].id,
  text: "",
};

export const CUSTOM_TEXT_MAX_LENGTH = 28;
