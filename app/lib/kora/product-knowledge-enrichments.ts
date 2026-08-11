import type { KoraProductFamily } from "./product-family-guards";

export type ProductEnrichmentSource = "manufacturer_documentation" | "human_review";
export type ProductEnrichmentStatus = "draft" | "approved";
export type ProductEnrichmentFactGroup =
  | "features"
  | "intended_uses"
  | "materials"
  | "requirements"
  | "complements"
  | "limitations";

export type ProductEnrichmentFact = {
  value: string;
  confidence: number;
  evidence: string;
};

export type ProductKnowledgeEnrichment = {
  record_id: string;
  status: ProductEnrichmentStatus;
  product_key: {
    id?: number | string;
    sku?: string;
    slug?: string;
  };
  reviewed_by: string;
  reviewed_at: string;
  source: ProductEnrichmentSource;
  source_references: string[];
  classification?: {
    family?: KoraProductFamily;
    role?: "main_product" | "accessory" | "complement" | "service";
    subtype?: string;
  };
  facts?: Partial<Record<ProductEnrichmentFactGroup, ProductEnrichmentFact[]>>;
};

type ProductReference = {
  id?: number | string | null;
  sku?: string | null;
  slug?: string | null;
};

export const KORA_PRODUCT_KNOWLEDGE_ENRICHMENTS: ProductKnowledgeEnrichment[] = [
  {
    record_id: "manufacturer-jbl-flip-6-2026-08",
    status: "approved",
    product_key: { id: 1128, sku: "1128", slug: "jbl-flip-6" },
    reviewed_by: "Kensar product knowledge review",
    reviewed_at: "2026-08-11",
    source: "manufacturer_documentation",
    source_references: [
      "https://support.jbl.com/on/demandware.static/-/Sites-masterCatalog_Harman/default/dw96f5c5b9/pdfs/JBL_Flip_6_SpecSheet_English.pdf",
    ],
    classification: { family: "cabinas", role: "main_product", subtype: "parlante_portatil_bluetooth" },
    facts: {
      features: [
        { value: "bluetooth_5_1", confidence: 0.99, evidence: "Ficha oficial JBL Flip 6: Bluetooth 5.1" },
        { value: "proteccion_ip67", confidence: 0.99, evidence: "Ficha oficial JBL Flip 6: resistencia IP67" },
        { value: "bateria_hasta_12_horas", confidence: 0.97, evidence: "Ficha oficial JBL Flip 6: hasta 12 horas según uso" },
        { value: "carga_usb_c", confidence: 0.99, evidence: "Ficha oficial JBL Flip 6: cable y carga USB-C" },
        { value: "partyboost", confidence: 0.99, evidence: "Ficha oficial JBL Flip 6: compatibilidad PartyBoost" },
      ],
      intended_uses: [
        { value: "reproducir_musica_de_forma_portatil", confidence: 0.97, evidence: "JBL lo clasifica como parlante portátil" },
      ],
      requirements: [
        { value: "recarga_usb_c", confidence: 0.98, evidence: "Ficha oficial incluye carga por USB-C" },
      ],
      limitations: [
        { value: "autonomia_depende_del_volumen_y_contenido", confidence: 0.99, evidence: "Aclaración expresa de autonomía en ficha JBL" },
      ],
    },
  },
  {
    record_id: "manufacturer-tplink-tapo-c500-2026-08",
    status: "approved",
    product_key: { id: 865, sku: "865", slug: "camara-de-seguridad-tapo-tp-link-tapo-c500" },
    reviewed_by: "Kensar product knowledge review",
    reviewed_at: "2026-08-11",
    source: "manufacturer_documentation",
    source_references: ["https://www.tp-link.com/cac/home-networking/cloud-camera/tapo-c500/"],
    classification: { family: "seguridad", role: "main_product", subtype: "wifi_exterior_pan_tilt" },
    facts: {
      features: [
        { value: "wifi_2_4_ghz", confidence: 0.99, evidence: "Ficha oficial TP-Link Tapo C500: Wi-Fi 2.4 GHz" },
        { value: "resolucion_1080p", confidence: 0.99, evidence: "Ficha oficial TP-Link Tapo C500: 1920 × 1080 px" },
        { value: "cobertura_360_grados", confidence: 0.99, evidence: "Ficha oficial TP-Link Tapo C500: cobertura horizontal 360°" },
        { value: "vision_nocturna", confidence: 0.99, evidence: "Ficha oficial TP-Link Tapo C500: visión nocturna" },
        { value: "deteccion_de_personas", confidence: 0.99, evidence: "Ficha oficial TP-Link Tapo C500: detección de personas" },
        { value: "seguimiento_de_movimiento", confidence: 0.99, evidence: "Ficha oficial TP-Link Tapo C500: seguimiento de movimiento" },
        { value: "audio_bidireccional", confidence: 0.99, evidence: "Ficha oficial TP-Link Tapo C500: audio bidireccional" },
        { value: "proteccion_ip65", confidence: 0.99, evidence: "Ficha oficial TP-Link Tapo C500: resistencia IP65" },
        { value: "ranura_micro_sd", confidence: 0.99, evidence: "Ficha oficial TP-Link Tapo C500: ranura microSD" },
      ],
      intended_uses: [
        { value: "vigilancia_exterior", confidence: 0.99, evidence: "TP-Link la clasifica como cámara de seguridad para exterior" },
      ],
      requirements: [
        { value: "wifi_2_4_ghz_y_alimentacion_dc", confidence: 0.97, evidence: "Ficha oficial requiere Wi-Fi 2.4 GHz y adaptador DC" },
      ],
      limitations: [
        { value: "tarjeta_micro_sd_se_vende_por_separado", confidence: 0.99, evidence: "Aclaración expresa en ficha oficial TP-Link" },
        { value: "almacenamiento_nube_requiere_suscripcion", confidence: 0.99, evidence: "Tapo Care requiere suscripción" },
      ],
    },
  },
];

function normalizedKey(value: number | string | null | undefined) {
  return value === null || value === undefined ? "" : String(value).trim().toLowerCase();
}

function recordMatchesProduct(record: ProductKnowledgeEnrichment, product: ProductReference) {
  const keys = Object.entries(record.product_key) as Array<[keyof ProductKnowledgeEnrichment["product_key"], number | string]>;
  return keys.some(([key, value]) => normalizedKey(value) === normalizedKey(product[key]));
}

export function validateProductKnowledgeEnrichments(records: ProductKnowledgeEnrichment[] = KORA_PRODUCT_KNOWLEDGE_ENRICHMENTS) {
  const errors: string[] = [];
  const recordIds = new Set<string>();
  const approvedProductKeys = new Map<string, string>();
  for (const record of records) {
    if (!record.record_id.trim()) errors.push("Hay un enriquecimiento sin record_id");
    if (recordIds.has(record.record_id)) errors.push(`record_id duplicado: ${record.record_id}`);
    recordIds.add(record.record_id);
    if (!Object.values(record.product_key).some((value) => normalizedKey(value))) errors.push(`${record.record_id}: falta product_key`);
    if (record.status === "approved") {
      for (const [key, value] of Object.entries(record.product_key)) {
        const normalized = normalizedKey(value);
        if (!normalized) continue;
        const composite = `${key}:${normalized}`;
        const owner = approvedProductKeys.get(composite);
        if (owner) errors.push(`${record.record_id}: clave aprobada duplicada con ${owner} (${composite})`);
        approvedProductKeys.set(composite, record.record_id);
      }
    }
    if (!record.reviewed_by.trim()) errors.push(`${record.record_id}: falta reviewed_by`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(record.reviewed_at)) errors.push(`${record.record_id}: reviewed_at inválido`);
    if (!record.source_references.length) errors.push(`${record.record_id}: falta fuente verificable`);
    if (record.source_references.some((reference) => !/^https:\/\//.test(reference))) errors.push(`${record.record_id}: fuente no HTTPS`);
    for (const facts of Object.values(record.facts || {})) {
      for (const item of facts || []) {
        if (!item.value.trim() || !item.evidence.trim()) errors.push(`${record.record_id}: hecho incompleto`);
        if (item.confidence < 0 || item.confidence > 1) errors.push(`${record.record_id}: confianza fuera de rango`);
      }
    }
  }
  return errors;
}

export function getApprovedProductKnowledgeEnrichment(product: ProductReference) {
  return KORA_PRODUCT_KNOWLEDGE_ENRICHMENTS.find(
    (record) => record.status === "approved" && recordMatchesProduct(record, product)
  ) || null;
}
