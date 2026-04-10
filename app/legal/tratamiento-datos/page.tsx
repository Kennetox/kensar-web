import Link from "next/link";

export default function TratamientoDatosPage() {
  return (
    <section className="legal-page-shell">
      <Link href="/" className="legal-page-back-link">
        ← Volver al inicio
      </Link>
      <article className="legal-page-card">
        <p className="legal-page-kicker">Legal Kensar</p>
        <h1>Tratamiento de datos personales</h1>
        <p>
          Kensar Electronic realiza tratamiento de datos personales para fines comerciales, operativos, administrativos
          y de servicio, conforme a la normativa aplicable y a los principios de confidencialidad, finalidad y
          seguridad.
        </p>

        <h2>Finalidades principales</h2>
        <p>
          Contacto comercial, gestión de pedidos, facturación, soporte técnico, seguimiento postventa, respuesta a
          solicitudes y cumplimiento de obligaciones legales.
        </p>

        <h2>Derechos del titular</h2>
        <p>
          Como titular de datos puedes conocer, actualizar, rectificar o solicitar la supresión de tu información, así
          como revocar autorizaciones cuando proceda legalmente.
        </p>

        <h2>Canales de atención</h2>
        <p>
          Puedes radicar solicitudes relacionadas con datos personales por correo electrónico o por nuestros canales de
          atención comercial oficiales publicados en esta web.
        </p>
      </article>
    </section>
  );
}
