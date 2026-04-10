import Link from "next/link";

export default function CambiosDevolucionesGarantiasPage() {
  return (
    <section className="legal-page-shell">
      <Link href="/" className="legal-page-back-link">
        ← Volver al inicio
      </Link>
      <article className="legal-page-card">
        <p className="legal-page-kicker">Postventa Kensar</p>
        <h1>Cambios, devoluciones y garantías</h1>
        <p>
          Esta página resume las condiciones generales de postventa de Kensar Electronic para productos adquiridos por
          canal web o gestión comercial directa.
        </p>

        <h2 id="cambios-devoluciones">Cambios y devoluciones</h2>
        <p>
          Los cambios o devoluciones aplican conforme al estado del producto, tiempos de solicitud, evidencia de
          compra y validación del equipo comercial o técnico. El producto debe conservar condiciones de entrega y
          accesorios incluidos.
        </p>
        <p>
          Para iniciar una solicitud, contáctanos por nuestros canales oficiales indicando número de pedido, motivo y
          soporte fotográfico cuando aplique.
        </p>

        <h2 id="garantias">Garantías</h2>
        <p>
          La garantía aplica según políticas del fabricante y normativa vigente. Se realiza revisión técnica para
          identificar si la falla corresponde a garantía o a condiciones no cubiertas (mal uso, intervención no
          autorizada, daño físico, entre otras).
        </p>
        <p>
          Los tiempos de diagnóstico y respuesta dependen del tipo de producto, disponibilidad de repuestos y
          lineamientos de marca.
        </p>

        <p className="legal-page-note">
          En todos los casos, Kensar Electronic informará el estado del proceso por los canales de contacto del
          cliente.
        </p>
      </article>
    </section>
  );
}
