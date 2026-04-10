import Link from "next/link";

export default function PrivacidadPage() {
  return (
    <section className="legal-page-shell">
      <Link href="/" className="legal-page-back-link">
        ← Volver al inicio
      </Link>
      <article className="legal-page-card">
        <p className="legal-page-kicker">Legal Kensar</p>
        <h1>Política de privacidad</h1>
        <p>
          En Kensar Electronic protegemos los datos personales de nuestros clientes, visitantes y contactos
          comerciales. Esta política explica qué información recolectamos, para qué la usamos y cómo puedes
          solicitar actualización o eliminación de tus datos.
        </p>

        <h2>1. Información que recopilamos</h2>
        <p>
          Podemos recopilar datos de contacto, información de compra, datos de navegación y datos necesarios para
          atención comercial, logística, soporte y cumplimiento legal.
        </p>

        <h2>2. Finalidad del tratamiento</h2>
        <p>
          Usamos la información para procesar pedidos, atender solicitudes, informar estado de compras, brindar
          soporte, mejorar la experiencia del sitio y cumplir obligaciones legales y contables.
        </p>

        <h2>3. Conservación y seguridad</h2>
        <p>
          Mantenemos medidas razonables de seguridad para evitar acceso no autorizado, pérdida o uso indebido de la
          información personal.
        </p>

        <h2>4. Derechos del titular</h2>
        <p>
          Puedes solicitar consulta, corrección, actualización o supresión de tus datos personales mediante los
          canales de contacto publicados por Kensar Electronic.
        </p>

        <p className="legal-page-note">
          Para solicitudes sobre datos personales, consulta también la página de{" "}
          <Link href="/legal/tratamiento-datos">Tratamiento de datos</Link>.
        </p>
      </article>
    </section>
  );
}
