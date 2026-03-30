import Link from "next/link";
import Reveal from "../components/Reveal";

const companyPoints = [
  "Operacion retail real: tienda fisica, inventario activo y atencion directa todos los dias.",
  "Catalogo amplio y de alta rotacion con 3000+ referencias en sonido, electronica e instrumentos.",
  "Venta practica con asesoria clara para comprar rapido y con seguridad.",
];

const companyTags = ["Retail fisico", "3000+ SKU", "Venta inmediata", "Soporte tecnico"];

const services = [
  {
    number: "01",
    title: "Servicio tecnico de audio",
    image:
      "linear-gradient(180deg, rgba(10,14,20,0.08), rgba(10,14,20,0.32)), url('https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=1400&auto=format&fit=crop')",
    description:
      "Diagnostico, reparacion y mantenimiento de parlantes, amplificadores, mixers, microfonos y otros equipos de sonido profesional.",
  },
  {
    number: "02",
    title: "Instalacion de camaras",
    image:
      "linear-gradient(180deg, rgba(10,14,20,0.08), rgba(10,14,20,0.32)), url('https://images.unsplash.com/photo-1558002038-1055907df827?q=80&w=1400&auto=format&fit=crop')",
    description:
      "Instalacion y configuracion de videovigilancia para hogares y negocios, con recomendacion de equipos segun necesidad real.",
  },
  {
    number: "03",
    title: "Asesoria comercial en tienda",
    image:
      "linear-gradient(180deg, rgba(10,14,20,0.08), rgba(10,14,20,0.32)), url('https://images.unsplash.com/photo-1556740738-b6a63e27c4df?q=80&w=1400&auto=format&fit=crop')",
    description:
      "Orientacion para elegir referencias por uso, presupuesto y disponibilidad inmediata, sin lenguaje tecnico innecesario.",
  },
];

const trustMetrics = [
  { label: "Referencias activas", value: "3000+" },
  { label: "Canales de atencion", value: "Tienda + WhatsApp + Telefono" },
  { label: "Lineas de negocio", value: "Retail + Servicios tecnicos" },
  { label: "Cobertura", value: "Palmira y alrededores" },
];

const workGallery = [
  "linear-gradient(180deg, rgba(10,14,20,0.06), rgba(10,14,20,0.28)), url('https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1200&auto=format&fit=crop')",
  "linear-gradient(180deg, rgba(10,14,20,0.06), rgba(10,14,20,0.28)), url('https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?q=80&w=1200&auto=format&fit=crop')",
  "linear-gradient(180deg, rgba(10,14,20,0.06), rgba(10,14,20,0.28)), url('https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=1200&auto=format&fit=crop')",
];

export default function EmpresaPage() {
  return (
    <>
      <section id="empresa" className="home-section home-anchor-section home-section-light empresa-section">
        <div className="content-shell section-stack-lg">
          <div className="split-section section-intro-grid">
            <Reveal className="section-heading-block" delay="none" direction="left">
              <p className="section-kicker">Empresa</p>
              <h2 className="section-heading">Tienda retail especializada en audio, electronica e instrumentos con operacion comercial real.</h2>
              <div className="section-tag-row" aria-label="Enfoque de empresa">
                {companyTags.map((tag) => (
                  <span key={tag} className="section-tag">
                    {tag}
                  </span>
                ))}
              </div>
            </Reveal>
            <Reveal className="section-copy-block" delay="short" direction="right" speed="slow">
              <p>
                Trabajamos con inventario fisico, rotacion alta y atencion rapida en punto de venta. El cliente llega
                con una necesidad y sale con una solucion concreta.
              </p>
              <p>
                Competimos por variedad, precio y disponibilidad inmediata. La tecnologia acompana la operacion, pero
                el foco sigue siendo vender bien y atender mejor.
              </p>
              <div
                className="section-media-frame"
                style={{
                  backgroundImage:
                    "linear-gradient(180deg, rgba(10,14,20,0.08), rgba(10,14,20,0.36)), url('https://images.unsplash.com/photo-1558002038-1055907df827?q=80&w=1600&auto=format&fit=crop')",
                }}
                aria-label="Atencion y operacion en tienda"
              />
            </Reveal>
          </div>

          <div className="feature-grid three-up home-points-grid">
            {companyPoints.map((point, index) => (
              <Reveal
                key={point}
                delay={index === 0 ? "none" : index === 1 ? "short" : "mid"}
                direction={index % 2 === 0 ? "left" : "right"}
                speed={index === 1 ? "slow" : "normal"}
              >
                <article className="feature-card point-card">
                  <p className="service-number">0{index + 1}</p>
                  <p>{point}</p>
                </article>
              </Reveal>
            ))}
          </div>

          <Reveal delay="mid" direction="up">
            <div className="trust-metrics-grid">
              {trustMetrics.map((metric) => (
                <article key={metric.label} className="trust-metric-item">
                  <p className="trust-metric-value">{metric.value}</p>
                  <p className="trust-metric-label">{metric.label}</p>
                </article>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section id="servicios" className="home-section home-anchor-section home-section-soft servicios-section">
        <div className="content-shell section-stack-lg">
          <Reveal className="section-heading-row" delay="none" direction="left">
            <div>
              <p className="section-kicker">Servicios</p>
              <h2 className="section-heading">Servicios tecnicos integrados al negocio, no un extra oculto.</h2>
              <p className="section-lead">
                Reparamos, instalamos y asesoramos con enfoque practico para resolver en un solo canal.
              </p>
            </div>
          </Reveal>

          <div className="feature-grid three-up home-services-grid">
            {services.map((service, index) => (
              <Reveal
                key={service.title}
                delay={index === 0 ? "none" : index === 1 ? "short" : "mid"}
                direction={index === 1 ? "up" : index === 0 ? "left" : "right"}
                speed={index === 1 ? "fast" : "normal"}
              >
                <article className="feature-card service-card service-card-tall">
                  <div className="service-card-media" style={{ backgroundImage: service.image }} aria-hidden="true" />
                  <p className="service-number">{service.number}</p>
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                </article>
              </Reveal>
            ))}
          </div>

          <Reveal delay="mid" direction="up" speed="slow">
            <div className="cta-band compact-band">
              <div>
                <p className="section-kicker">Atencion directa y util</p>
                <h2>Compra, repara o instala por el mismo canal: respuesta clara, tiempos reales y seguimiento.</h2>
              </div>
              <div className="cta-band-actions">
                <Link href="https://wa.me/573185657508" className="btn-dark" target="_blank" rel="noreferrer">
                  Escribir por WhatsApp
                </Link>
                <Link href="/catalogo" className="btn-ghost-dark">
                  Ver catalogo
                </Link>
              </div>
            </div>
          </Reveal>

          <div className="feature-grid three-up work-gallery-grid">
            {workGallery.map((image, index) => (
              <Reveal
                key={image}
                delay={index === 0 ? "none" : index === 1 ? "short" : "mid"}
                direction={index === 1 ? "up" : index === 0 ? "left" : "right"}
              >
                <article className="work-gallery-item" style={{ backgroundImage: image }} aria-label={`Galeria ${index + 1}`} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="contacto" className="home-section home-anchor-section home-section-dark contacto-section">
        <div className="content-shell section-stack-lg contact-home-shell">
          <Reveal delay="none" direction="up">
            <section className="contact-panel">
              <div className="contact-panel-top">
                <div className="contact-panel-info">
                  <h3>Contacto</h3>
                  <p>
                    Correo:{" "}
                    <a href="mailto:kensarelec@gmail.com">
                      kensarelec@gmail.com
                    </a>
                  </p>
                  <p>
                    WhatsApp:{" "}
                    <a href="https://wa.me/573185657508" target="_blank" rel="noreferrer">
                      +57 318 565 7508
                    </a>
                  </p>
                  <p className="contact-panel-link-row">
                    <a href="https://wa.me/573185657508" target="_blank" rel="noreferrer">
                      Abrir WhatsApp
                    </a>
                  </p>
                </div>
              </div>

              <div className="contact-panel-divider" />

              <div className="contact-map-block">
                <p className="contact-map-address">Direccion: Cra 24 #30-75, Palmira, Valle del Cauca, Colombia</p>
                <p className="contact-panel-link-row">
                  <a
                    href="https://maps.google.com/?q=Cra+24+%2330-75,+Palmira,+Valle+del+Cauca,+Colombia"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir en Google Maps
                  </a>
                </p>
                <div className="contact-map-embed">
                  <iframe
                    title="Mapa de Kensar Electronic"
                    src="https://maps.google.com/maps?q=Cra%2024%20%2330-75%2C%20Palmira%2C%20Valle%20del%20Cauca%2C%20Colombia&z=16&output=embed"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>

              <div className="contact-panel-divider" />

              <div className="contact-form-block">
                <h3>Solicitar ayuda</h3>
                <p>Completa este formulario y te enviaremos la solicitud por correo directamente.</p>

                <form className="contact-form-grid" action="mailto:kensarelec@gmail.com" method="post" encType="text/plain">
                  <label className="contact-field contact-field-full">
                    <span>Tipo de ayuda</span>
                    <select name="tipo_ayuda" defaultValue="Soporte tecnico" required>
                      <option>Soporte tecnico</option>
                      <option>Cotizacion de producto</option>
                      <option>Instalacion de camaras</option>
                      <option>Consulta general</option>
                    </select>
                  </label>

                  <label className="contact-field">
                    <span>Nombre</span>
                    <input name="nombre" type="text" placeholder="Tu nombre" required />
                  </label>

                  <label className="contact-field">
                    <span>Correo de respuesta (opcional)</span>
                    <input name="correo" type="email" placeholder="correo@empresa.com" />
                  </label>

                  <label className="contact-field contact-field-full">
                    <span>Describe tu solicitud</span>
                    <textarea
                      name="mensaje"
                      rows={6}
                      maxLength={700}
                      placeholder="Cuentanos que necesitas y te respondemos lo antes posible."
                      required
                    />
                    <small>700 caracteres disponibles</small>
                  </label>

                  <div className="contact-form-actions">
                    <button type="submit" className="contact-submit-btn">
                      Enviar solicitud
                    </button>
                  </div>
                </form>
              </div>
            </section>
          </Reveal>
        </div>
      </section>
    </>
  );
}
