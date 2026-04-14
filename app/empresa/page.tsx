import Link from "next/link";

export default function EmpresaPage() {
  return (
    <section className="empresa-legal-shell">
      <article className="legal-page-card empresa-legal-card">
        <div className="empresa-legal-content">
          <p className="legal-page-kicker">Empresa</p>
          <h1>Kensar Electronic</h1>
          <p>
            Somos una tienda especializada en audio, tecnología, instrumentos y soporte técnico en Palmira, Valle del
            Cauca. Este espacio está diseñado para presentar información clara de la empresa y servicios.
          </p>
          <p className="legal-page-note">Espacio reservado para texto institucional de presentación.</p>
        </div>
        <aside className="empresa-legal-media" aria-label="Espacio de imagen de empresa">
          <p>Espacio para imagen</p>
        </aside>
      </article>

      <article className="legal-page-card empresa-legal-card">
        <div className="empresa-legal-content">
          <p className="legal-page-kicker">Servicios</p>
          <h2>Bloque de servicios</h2>
          <p>
            Aquí podrás mostrar servicios clave como instalación, mantenimiento, reparación y asesoría comercial en
            formato simple.
          </p>
          <p className="legal-page-note">Espacio reservado para descripción de servicios.</p>
        </div>
        <aside className="empresa-legal-media" aria-label="Espacio de imagen de servicios">
          <p>Espacio para imagen</p>
        </aside>
      </article>

      <article className="legal-page-card empresa-legal-card">
        <div className="empresa-legal-content">
          <p className="legal-page-kicker">Contacto comercial</p>
          <h2>Canales de atención</h2>
          <p>
            Te atendemos por WhatsApp, teléfono y correo. Este bloque queda listo para completar con mensajes cortos y
            directos.
          </p>
          <div className="empresa-legal-actions">
            <Link href="https://wa.me/573185657508" target="_blank" rel="noreferrer" className="account-primary-btn">
              Escribir por WhatsApp
            </Link>
            <Link href="/catalogo" className="account-secondary-btn">
              Ver catálogo
            </Link>
          </div>
        </div>
        <aside className="empresa-legal-media" aria-label="Espacio de imagen de contacto">
          <p>Espacio para imagen</p>
        </aside>
      </article>
    </section>
  );
}
