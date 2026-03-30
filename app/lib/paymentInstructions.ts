export type ManualPaymentInstructions = {
  owner: string;
  bank: string;
  account_type: string;
  account_number: string;
  alt_channel_label: string;
  alt_channel_value: string;
  whatsapp: string;
};

export function getManualPaymentInstructions(): ManualPaymentInstructions {
  return {
    owner: process.env.NEXT_PUBLIC_KENSAR_PAYMENT_OWNER?.trim() || "Kensar Electronic",
    bank: process.env.NEXT_PUBLIC_KENSAR_PAYMENT_BANK?.trim() || "Bancolombia",
    account_type: process.env.NEXT_PUBLIC_KENSAR_PAYMENT_ACCOUNT_TYPE?.trim() || "Ahorros",
    account_number:
      process.env.NEXT_PUBLIC_KENSAR_PAYMENT_ACCOUNT_NUMBER?.trim() || "Pendiente de configurar",
    alt_channel_label:
      process.env.NEXT_PUBLIC_KENSAR_PAYMENT_ALT_LABEL?.trim() || "Nequi / Transferencia",
    alt_channel_value:
      process.env.NEXT_PUBLIC_KENSAR_PAYMENT_ALT_VALUE?.trim() || "+57 318 565 7508",
    whatsapp: process.env.NEXT_PUBLIC_KENSAR_WHATSAPP?.trim() || "+57 318 565 7508",
  };
}
