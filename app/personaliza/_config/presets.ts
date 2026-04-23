export type PersonalizableProductType = "campana" | "guiro" | "maraca";

export type PersonalizableSize = "small" | "large";
export type PersonalizableCommerceProductType = Exclude<PersonalizableProductType, "maraca">;

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
};

export const PERSONALIZABLE_PRODUCTS: ProductPreset[] = [
  {
    id: "campana",
    name: "Campana salsera",
    description: "Personaliza color y texto de tu campana.",
    textLabel: "Texto en campana",
    textPlaceholder: "Ej: Son de Barrio",
    cardImage: "/personaliza/cards/campana.png",
  },
  {
    id: "guiro",
    name: "Güiro salsero",
    description: "Diseña una versión única de tu güiro.",
    textLabel: "Texto en güiro",
    textPlaceholder: "Ej: Rumba Viva",
    cardImage: "/personaliza/cards/guiro.png",
  },
  {
    id: "maraca",
    name: "Maracas",
    description: "Define estilo y frase para tus maracas.",
    textLabel: "Texto en maracas",
    textPlaceholder: "Ej: Clan Rivera",
    cardImage: "/personaliza/cards/maracas.png",
  },
];

export const PERSONALIZABLE_SIZES: Array<{ id: PersonalizableSize; label: string }> = [
  { id: "small", label: "Mediano" },
  { id: "large", label: "Grande" },
];

type EcommerceSizeConfig = {
  sku: string;
  slug: string;
};

type EcommerceConfigByProduct = Record<PersonalizableCommerceProductType, Record<PersonalizableSize, EcommerceSizeConfig>>;
type PersonalizationServiceConfig = Record<PersonalizableCommerceProductType, { sku: string }>;

const ECOMMERCE_PRODUCT_BY_SIZE: EcommerceConfigByProduct = {
  campana: {
    small: {
      sku: "92",
      slug: "campana-mediana",
    },
    large: {
      sku: "93",
      slug: "campana-grande",
    },
  },
  guiro: {
    small: {
      sku: "2780",
      slug: "guiro-salsero-mediano-instrumento",
    },
    large: {
      sku: "2779",
      slug: "guiro-salsero-grande-instrumento",
    },
  },
};

const PERSONALIZATION_SERVICE_BY_PRODUCT: PersonalizationServiceConfig = {
  campana: { sku: "3740" },
  guiro: { sku: "3741" },
};

export type PersonalizableCheckoutBinding = {
  productSku: string;
  productSlug: string;
  personalizationSku: string;
};

export function resolvePersonalizableCheckoutBinding(
  product: PersonalizableProductType,
  size: PersonalizableSize
): PersonalizableCheckoutBinding | null {
  if (product === "maraca") return null;
  const productConfig = ECOMMERCE_PRODUCT_BY_SIZE[product][size];
  const serviceConfig = PERSONALIZATION_SERVICE_BY_PRODUCT[product];
  return {
    productSku: productConfig.sku,
    productSlug: productConfig.slug,
    personalizationSku: serviceConfig.sku,
  };
}

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: "negro-clasico",
    label: "Negro clásico",
    kind: "solid",
    fill: "#1f2937",
    textColor: "#f9fafb",
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
