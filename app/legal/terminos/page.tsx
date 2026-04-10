import Link from "next/link";

export default function TerminosPage() {
  return (
    <section className="legal-page-shell">
      <Link href="/" className="legal-page-back-link">
        ← Volver al inicio
      </Link>
      <article className="legal-page-card">
        <p className="legal-page-kicker">Legal Kensar</p>
        <h1>Términos y condiciones</h1>
        <p>
          El uso del sitio web de Kensar Electronic implica la aceptación de estos términos y condiciones para compra,
          consulta de catálogo, contacto comercial y uso general de la plataforma.
        </p>

        <h2>1. Uso del sitio</h2>
        <p>
          El usuario se compromete a utilizar la web de forma lícita, respetando la información publicada y evitando
          cualquier acción que afecte la seguridad o disponibilidad del servicio.
        </p>

        <h2>2. Información de productos y precios</h2>
        <p>
          Las publicaciones pueden actualizarse sin previo aviso. La disponibilidad de inventario, condiciones
          comerciales y precios finales se confirman en el proceso de compra o validación comercial.
        </p>

        <h2>3. Pedidos y atención</h2>
        <p>
          Kensar Electronic podrá validar información del pedido para garantizar cumplimiento logístico, disponibilidad
          real y seguridad en el proceso de pago.
        </p>

        <h2>4. Propiedad intelectual</h2>
        <p>
          Las marcas, logotipos, textos, imágenes y elementos gráficos del sitio pertenecen a Kensar Electronic o a
          sus titulares autorizados.
        </p>

        <h2>5. Modificaciones</h2>
        <p>
          Kensar Electronic puede modificar estos términos en cualquier momento. La versión vigente será la publicada
          en esta sección.
        </p>
      </article>
    </section>
  );
}
