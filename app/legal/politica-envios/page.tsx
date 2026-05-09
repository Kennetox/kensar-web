import type { Metadata } from "next";
import Link from "next/link";
import { buildWhatsAppPrefill } from "@/app/lib/kora/whatsapp-handoff";

export const metadata: Metadata = {
  title: "Política de Envíos | Kensar Electronic",
  description:
    "Consulta la cobertura, tiempos de entrega, envío gratis en Palmira y Cali, costos y condiciones de envío de Kensar Electronic.",
  alternates: {
    canonical: "/legal/politica-envios",
  },
};

type ShippingSection = {
  title: string;
  content?: string[];
  bullets?: string[];
  note?: string;
};

const SHIPPING_SECTIONS: ShippingSection[] = [
  {
    title: "1. Cobertura de envíos",
    content: [
      "Realizamos entregas en Palmira, Cali y otras ciudades de Colombia mediante transportadoras nacionales.",
      "La cobertura puede variar según disponibilidad logística y zona de destino.",
    ],
  },
  {
    title: "2. Envío gratis en Palmira y Cali",
    content: [
      "Ofrecemos envío GRATIS en compras desde $100.000 COP para Palmira y Cali.",
      "Los pedidos inferiores a este monto pueden generar un costo adicional de domicilio según la zona de entrega.",
    ],
  },
  {
    title: "3. Tiempos estimados de entrega",
    bullets: [
      "Palmira: entregas el mismo día o el siguiente día hábil, según disponibilidad operativa.",
      "Cali: entregas entre 1 y 2 días hábiles.",
      "Otras ciudades: entre 2 y 5 días hábiles aproximadamente, dependiendo de la transportadora y ciudad de destino.",
    ],
    note:
      "Los tiempos pueden variar según disponibilidad del producto, horario de compra, validación del pedido y condiciones logísticas externas.",
  },
  {
    title: "4. Confirmación del pedido",
    content: [
      "Todos los pedidos son verificados antes del despacho.",
      "Nuestro equipo puede comunicarse contigo vía WhatsApp, llamada telefónica o correo electrónico para confirmar:",
    ],
    bullets: [
      "dirección de entrega",
      "disponibilidad del producto",
      "datos de contacto",
      "detalles del envío",
    ],
  },
  {
    title: "5. Costos de envío",
    content: ["El costo de envío puede variar según:"],
    bullets: [
      "ciudad",
      "zona de entrega",
      "tamaño del pedido",
      "peso o volumen del producto",
      "cobertura disponible",
    ],
    note: "En algunos casos, el valor final del envío será confirmado antes del despacho.",
  },
  {
    title: "6. Envíos nacionales",
    content: [
      "Los pedidos fuera de Palmira y Cali serán enviados mediante transportadoras nacionales.",
      "Una vez el pedido sea procesado, te confirmaremos la información de despacho correspondiente.",
    ],
  },
  {
    title: "7. Horarios de procesamiento",
    content: [
      "Los pedidos se procesan en horario laboral.",
      "Pedidos realizados fuera del horario de atención, domingos o festivos podrán ser procesados el siguiente día hábil o según disponibilidad operativa.",
    ],
  },
  {
    title: "8. Información importante",
    content: ["Para evitar retrasos, es responsabilidad del cliente proporcionar correctamente:"],
    bullets: ["nombre completo", "número de contacto", "dirección completa", "ciudad de entrega"],
    note:
      "Kensar Electronic no se hace responsable por retrasos ocasionados por información incorrecta o incompleta suministrada por el cliente.",
  },
  {
    title: "9. Soporte y contacto",
    content: [
      "Si tienes dudas sobre tu pedido o envío, puedes comunicarte con nosotros por WhatsApp, llamada telefónica o correo electrónico.",
      "Nuestro equipo estará disponible para ayudarte durante el proceso de compra y entrega.",
    ],
  },
];

export default function PoliticaEnviosPage() {
  const whatsappHref = buildWhatsAppPrefill({
    origin: "unknown",
    need: "envio",
    intent: "shipping_question",
    currentPath: "/legal/politica-envios",
    currentUrl: "https://kensarelectronic.com/legal/politica-envios",
    latestInput: "Quiero confirmar cobertura, tiempos y costos de envío antes de comprar.",
  }).href;

  return (
    <section className="legal-page-shell shipping-policy-shell">
      <Link href="/" className="legal-page-back-link">
        ← Volver al inicio
      </Link>

      <article className="legal-page-card shipping-policy-card">
        <p className="legal-page-kicker">Envíos Kensar</p>
        <h1>Política de Envíos</h1>

        <p>
          En Kensar Electronic trabajamos para ofrecer entregas rápidas, seguras y coordinadas según tu ubicación y
          la disponibilidad de cada pedido.
        </p>
        <p>
          Todos los pedidos realizados a través de Kensar Web son verificados antes del despacho para garantizar una
          mejor experiencia de compra y una correcta coordinación logística.
        </p>

        <div className="shipping-policy-grid" aria-label="Detalle de política de envíos">
          {SHIPPING_SECTIONS.map((section) => (
            <section key={section.title} className="shipping-policy-block">
              <h2>{section.title}</h2>
              {section.content?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {section.bullets?.length ? (
                <ul>
                  {section.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
              {section.note ? <p className="shipping-policy-note">Nota: {section.note}</p> : null}
            </section>
          ))}
        </div>

        <section className="shipping-policy-cta" aria-label="Consultar envío por WhatsApp">
          <h2>¿Tienes dudas sobre tu envío?</h2>
          <p>
            Escríbenos por WhatsApp y te ayudamos a confirmar cobertura, tiempos y costos antes de realizar tu compra.
          </p>
          <a href={whatsappHref} target="_blank" rel="noreferrer" className="shipping-policy-cta-btn">
            Consultar por WhatsApp
          </a>
        </section>
      </article>
    </section>
  );
}
