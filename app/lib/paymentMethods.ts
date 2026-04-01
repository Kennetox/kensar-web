export type ProductPaymentMethod = {
  id: string;
  label: string;
  emphasis?: boolean;
};

function getWhatsAppHref(message: string) {
  const raw = process.env.NEXT_PUBLIC_KENSAR_WHATSAPP?.trim() || "+57 318 565 7508";
  const digits = raw.replace(/[^\d]/g, "");
  const base = digits ? `https://wa.me/${digits}` : "https://wa.me/573185657508";
  return `${base}?text=${encodeURIComponent(message)}`;
}

export const PRODUCT_PAYMENT_METHODS: ProductPaymentMethod[] = [
  { id: "cards", label: "Tarjetas débito y crédito" },
  { id: "transfer", label: "Transferencia / Nequi" },
  { id: "mercado-pago", label: "Mercado Pago" },
  { id: "addi", label: "Addi", emphasis: true },
  { id: "sistecredito", label: "Sistecrédito", emphasis: true },
];

export const PRODUCT_FINANCING_NOTE = "Financiación sujeta a aprobación de la entidad.";

export const PRODUCT_ADDI_LINK = getWhatsAppHref(
  "Hola, quiero conocer opciones de compra con Addi para este producto."
);

export const PRODUCT_SISTECREDITO_LINK = getWhatsAppHref(
  "Hola, quiero conocer opciones de compra con Sistecrédito para este producto."
);
