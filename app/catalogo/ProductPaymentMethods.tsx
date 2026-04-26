"use client";

import Image from "next/image";
import Link from "next/link";
import {
  PRODUCT_ADDI_LINK,
  PRODUCT_FINANCING_NOTE,
  PRODUCT_SISTECREDITO_LINK,
} from "@/app/lib/paymentMethods";

const PRODUCT_PAYMENT_LOGOS = [
  { id: "bancolombia", src: "/payment-icons/metodos2/bancolombia.svg", alt: "Bancolombia", width: 86, height: 26 },
  { id: "pse", src: "/payment-icons/metodos2/pse.svg", alt: "PSE", width: 62, height: 24 },
  { id: "nequi", src: "/payment-icons/metodos2/nequi.svg", alt: "Nequi", width: 70, height: 24 },
  { id: "visa", src: "/payment-icons/metodos2/visa.svg", alt: "Visa", width: 62, height: 24 },
  { id: "maestro", src: "/payment-icons/metodos2/maestro.svg", alt: "Maestro", width: 70, height: 24 },
  { id: "addi", src: "/payment-icons/metodos2/addi.svg", alt: "Addi", width: 70, height: 24 },
  {
    id: "sistecredito",
    src: "/payment-icons/metodos2/sistecredito.svg",
    alt: "Sistecrédito",
    width: 96,
    height: 24,
  },
] as const;

export default function ProductPaymentMethods() {
  return (
    <section className="product-payment-methods" aria-label="Medios de pago disponibles">
      <strong>Medios de pago</strong>
      <div className="product-payment-logo-grid">
        {PRODUCT_PAYMENT_LOGOS.map((logo) => (
          <Image
            key={logo.id}
            src={logo.src}
            alt={logo.alt}
            width={logo.width}
            height={logo.height}
            className={`product-payment-logo-image is-${logo.id}`}
            unoptimized
          />
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
