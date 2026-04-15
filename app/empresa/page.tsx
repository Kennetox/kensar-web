import Link from "next/link";

export default function EmpresaPage() {
  return (
    <section className="empresa-legal-shell">
      <article className="legal-page-card empresa-legal-card">
        <div className="empresa-legal-content">
          <p className="legal-page-kicker">EMPRESA</p>
          <h1>Kensar Electronic</h1>
          <p>
            Somos una empresa especializada en soluciones de audio, instrumentos musicales y tecnología, ubicada en
            Palmira, Valle del Cauca. En Kensar no solo vendemos productos: acompañamos a nuestros clientes en cada
            etapa, desde la elección del equipo hasta la asesoría y el soporte posterior.
          </p>
          <p>
            Contamos con un catálogo amplio que incluye sonido profesional, instrumentos, accesorios y tecnología,
            seleccionados para ofrecer calidad, funcionalidad y confianza en cada compra.
          </p>
          <p className="legal-page-note">
            Trabajamos con un enfoque claro: ofrecer productos adecuados, asesoría honesta y atención cercana para
            ayudar a cada cliente a tomar una mejor decisión.
          </p>
        </div>
        <aside
          className="empresa-legal-media empresa-legal-media-image"
          style={{ backgroundImage: "url('/branding/hero/empresa-hero.png')" }}
          aria-label="Imagen principal de la empresa Kensar Electronic"
        />
      </article>

      <article className="legal-page-card empresa-legal-card">
        <div className="empresa-legal-content">
          <p className="legal-page-kicker">SERVICIOS</p>
          <h2>Nuestros servicios</h2>
          <p>
            En Kensar complementamos nuestra oferta de productos con servicios especializados pensados para brindar
            soluciones completas a nuestros clientes.
          </p>
          <div className="empresa-services-list" aria-label="Listado de servicios de Kensar">
            <article className="empresa-service-item">
              <h3>Servicio técnico especializado</h3>
              <p>Reparación y mantenimiento de equipos de sonido profesional y otros dispositivos relacionados.</p>
            </article>
            <article className="empresa-service-item">
              <h3>Instalación de sistemas de audio</h3>
              <p>Montaje y configuración de soluciones de sonido para distintos espacios y necesidades.</p>
            </article>
            <article className="empresa-service-item">
              <h3>Instalación de cámaras de seguridad</h3>
              <p>Implementación de sistemas de videovigilancia para hogares, negocios y otros entornos.</p>
            </article>
            <article className="empresa-service-item">
              <h3>Asesoría personalizada</h3>
              <p>Orientación para elegir productos y soluciones según el uso, presupuesto y necesidad del cliente.</p>
            </article>
          </div>
          <p className="empresa-services-note">
            Nuestro objetivo es que cada cliente encuentre en Kensar no solo productos, sino respaldo y soluciones
            reales.
          </p>
        </div>
        <aside
          className="empresa-legal-media empresa-legal-media-image empresa-legal-media-services-image"
          style={{ backgroundImage: "url('/branding/hero/hero-servicio.png')" }}
          aria-label="Imagen principal de servicios Kensar"
        />
      </article>

      <article className="legal-page-card empresa-legal-card">
        <div className="empresa-legal-content">
          <p className="legal-page-kicker">CONTACTO COMERCIAL</p>
          <h2>Canales de atención</h2>
          <p>
            Estamos disponibles para ayudarte de forma rápida y directa a través de nuestros canales de atención. Ya
            sea que necesites asesoría, cotización o información sobre productos y servicios, puedes comunicarte con
            nosotros fácilmente.
          </p>
          <div className="empresa-contact-facts" aria-label="Información de contacto comercial">
            <p>
              <strong>Ubicación:</strong> Palmira, Valle del Cauca
            </p>
            <p>
              <strong>Horario:</strong> Lunes a sábado, 8:30am a 6:30pm
            </p>
            <p>
              <strong>Domingos y festivos:</strong> 9:00am a 1:00pm
            </p>
            <p>
              <strong>WhatsApp:</strong> +57 318 565 7508
            </p>
            <p>
              <strong>Correo:</strong> kensarelec@gmail.com
            </p>
          </div>
          <div className="empresa-legal-actions">
            <Link href="https://wa.me/573185657508" target="_blank" rel="noreferrer" className="account-primary-btn">
              Escribir por WhatsApp
            </Link>
          </div>
          <p className="empresa-contact-note">
            Respondemos con la mayor agilidad posible para brindarte una atención clara y efectiva.
          </p>
        </div>
        <aside className="empresa-legal-media empresa-legal-media-map" aria-label="Mapa de ubicación de Kensar">
          <iframe
            title="Ubicación de Kensar Electronic en Google Maps"
            src="https://maps.google.com/maps?q=Cra%2024%20%2330-75%2C%20Palmira%2C%20Valle%20del%20Cauca%2C%20Colombia&z=16&output=embed"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </aside>
      </article>
    </section>
  );
}
