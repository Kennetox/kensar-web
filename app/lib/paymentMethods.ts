import { buildWhatsAppPrefill } from "@/app/lib/kora/whatsapp-handoff";

export type ProductPaymentMethod = {
  id: string;
  label: string;
  emphasis?: boolean;
};

export const PRODUCT_PAYMENT_METHODS: ProductPaymentMethod[] = [
  { id: "cards", label: "Tarjetas débito y crédito" },
  { id: "transfer", label: "Transferencia / Nequi" },
  { id: "mercado-pago", label: "Mercado Pago" },
  { id: "addi", label: "Addi", emphasis: true },
  { id: "sistecredito", label: "Sistecrédito", emphasis: true },
];

export const PRODUCT_FINANCING_NOTE = "Financiación sujeta a aprobación de la entidad.";

export const PRODUCT_ADDI_LINK = buildWhatsAppPrefill({
  origin: "product_page_whatsapp",
  need: "cotizacion",
  intent: "quotation_request",
  latestInput: "Hola, quiero conocer opciones de compra con Addi para este producto.",
  currentPath: "/catalogo",
  currentUrl: "https://kensarelectronic.com/catalogo",
}).href;

export const PRODUCT_SISTECREDITO_LINK = buildWhatsAppPrefill({
  origin: "product_page_whatsapp",
  need: "cotizacion",
  intent: "quotation_request",
  latestInput: "Hola, quiero conocer opciones de compra con Sistecrédito para este producto.",
  currentPath: "/catalogo",
  currentUrl: "https://kensarelectronic.com/catalogo",
}).href;
