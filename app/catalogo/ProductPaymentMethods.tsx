"use client";

import Link from "next/link";
import {
  PRODUCT_ADDI_LINK,
  PRODUCT_FINANCING_NOTE,
  PRODUCT_PAYMENT_METHODS,
  PRODUCT_SISTECREDITO_LINK,
} from "@/app/lib/paymentMethods";

export default function ProductPaymentMethods() {
  return (
    <section className="product-payment-methods" aria-label="Medios de pago disponibles">
      <strong>Medios de pago</strong>
      <div className="product-payment-chip-row">
        {PRODUCT_PAYMENT_METHODS.map((method) => (
          <span
            key={method.id}
            className={`product-payment-chip${method.emphasis ? " is-emphasis" : ""}`}
          >
            {method.label}
          </span>
        ))}
      </div>
      <div className="product-payment-links">
        <Link href={PRODUCT_ADDI_LINK} target="_blank" rel="noreferrer">
          Solicitar cupo Addi
        </Link>
        <Link href={PRODUCT_SISTECREDITO_LINK} target="_blank" rel="noreferrer">
          Solicitar cupo Sistecrédito
        </Link>
      </div>
      <p>{PRODUCT_FINANCING_NOTE}</p>
    </section>
  );
}
