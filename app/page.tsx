"use client";

import { useState } from "react";
import Link from "next/link";
import HeroBackgroundSlider from "./components/HeroBackgroundSlider";

type PromoSlide = {
  image: string;
  eyebrow: string;
  title: string;
  description: string;
  primaryCtaLabel: string;
};

const promoSlides: PromoSlide[] = [
  {
    image: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=2000&auto=format&fit=crop",
    eyebrow: "Audio profesional e instrumentos",
    title: "Potencia sonido, estudio y tarima con stock real en tienda.",
    description: "Parlantes, mixers, microfonos e instrumentos con asesoria comercial clara.",
    primaryCtaLabel: "Ver catalogo",
  },
  {
    image: "/branding/hero/camaras.jpg",
    eyebrow: "Videovigilancia para hogar y negocio",
    title: "Instalacion de camaras con configuracion y entrega operativa.",
    description: "Te ayudamos a elegir equipo, instalar y dejar todo funcionando.",
    primaryCtaLabel: "Cotizar instalacion",
  },
  {
    image: "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?q=80&w=2000&auto=format&fit=crop",
    eyebrow: "Servicio tecnico",
    title: "Diagnostico y reparacion para equipos de audio y electronica.",
    description: "Atencion rapida para que tu operacion no se detenga.",
    primaryCtaLabel: "Solicitar soporte",
  },
];

const categories = [
  { name: "Audio profesional", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=1200&auto=format&fit=crop" },
  { name: "Instrumentos", image: "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?q=80&w=1200&auto=format&fit=crop" },
  { name: "Microfonos", image: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?q=80&w=1200&auto=format&fit=crop" },
  { name: "Accesorios", image: "https://images.unsplash.com/photo-1484704849700-f032a568e944?q=80&w=1200&auto=format&fit=crop" },
  { name: "Camaras", image: "https://images.unsplash.com/photo-1557862921-37829c790f19?q=80&w=1200&auto=format&fit=crop" },
  { name: "Servicio tecnico", image: "https://images.unsplash.com/photo-1580894732444-8ecded7900cd?q=80&w=1200&auto=format&fit=crop" },
];

const featuredProducts = [
  { name: "Parlante activo 12\"", price: "$1.290.000", before: "$1.490.000", tag: "Audio", image: "https://images.unsplash.com/photo-1545454675-3531b543be5d?q=80&w=1200&auto=format&fit=crop" },
  { name: "Microfono inalambrico doble", price: "$520.000", before: "$610.000", tag: "Microfonos", image: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=1200&auto=format&fit=crop" },
  { name: "Teclado 61 teclas", price: "$890.000", before: "$990.000", tag: "Instrumentos", image: "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?q=80&w=1200&auto=format&fit=crop" },
  { name: "Kit DVR + 4 camaras", price: "$1.450.000", before: "$1.680.000", tag: "Seguridad", image: "https://images.unsplash.com/photo-1557324232-b8917d3c3dcb?q=80&w=1200&auto=format&fit=crop" },
];

export default function HomePage() {
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const activeSlide = promoSlides[activeSlideIndex] ?? promoSlides[0];

  return (
    <div id="inicio" className="commerce-home home-anchor-section">
      <section className="commerce-hero">
        <HeroBackgroundSlider
          images={promoSlides.map((slide) => slide.image)}
          intervalMs={9000}
          speed={0.06}
          onSlideChange={setActiveSlideIndex}
        />

        <div className="commerce-hero-overlay">
          <div key={activeSlideIndex} className="commerce-hero-copy">
            <p className="commerce-hero-eyebrow">{activeSlide.eyebrow}</p>
            <h1>{activeSlide.title}</h1>
            <p>{activeSlide.description}</p>
            <div className="commerce-hero-actions">
              <Link href="/catalogo" className="commerce-btn commerce-btn-primary">
                {activeSlide.primaryCtaLabel}
              </Link>
              <Link href="https://wa.me/573185657508" className="commerce-btn commerce-btn-ghost" target="_blank" rel="noreferrer">
                WhatsApp
              </Link>
            </div>
          </div>

          <aside className="commerce-quick-panel">
            <p className="panel-title">Atencion comercial hoy</p>
            <p className="panel-row"><strong>WhatsApp:</strong> +57 318 565 7508</p>
            <p className="panel-row"><strong>Horario:</strong> 8:30am - 6:30pm</p>
            <p className="panel-row"><strong>Ubicacion:</strong> Palmira, Valle</p>
            <Link href="/empresa#contacto" className="panel-link">Ver contacto completo</Link>
          </aside>
        </div>
      </section>

      <section className="commerce-categories content-shell">
        <div className="commerce-section-head">
          <div>
            <p className="commerce-section-kicker">Compra por categoria</p>
            <h2>Categorias destacadas</h2>
            <p className="commerce-section-sub">Encuentra rapido lo que mas rota en tienda y por pedido.</p>
          </div>
          <Link href="/catalogo">Ver todo</Link>
        </div>
        <div className="commerce-category-grid">
          {categories.map((category) => (
            <Link
              key={category.name}
              href="/catalogo"
              className="commerce-category-card"
              style={{ backgroundImage: `linear-gradient(180deg, rgba(11,18,32,0.08), rgba(11,18,32,0.62)), url('${category.image}')` }}
            >
              <span>{category.name}</span>
              <small>Ver categoria</small>
            </Link>
          ))}
        </div>
      </section>

      <section className="commerce-products content-shell">
        <div className="commerce-section-head">
          <div>
            <p className="commerce-section-kicker">Movimiento comercial</p>
            <h2>Ofertas y productos destacados</h2>
            <p className="commerce-section-sub">Referencias con precio competitivo y disponibilidad inmediata.</p>
          </div>
          <Link href="/catalogo">Ir al catalogo</Link>
        </div>
        <div className="commerce-product-grid">
          {featuredProducts.map((product) => (
            <article key={product.name} className="commerce-product-card">
              <div
                className="commerce-product-image"
                style={{ backgroundImage: `url('${product.image}')` }}
                aria-hidden="true"
              />
              <div className="commerce-product-body">
                <p className="commerce-product-tag">{product.tag}</p>
                <h3>{product.name}</h3>
                <p className="commerce-product-price">
                  <span>{product.price}</span>
                  <del>{product.before}</del>
                </p>
                <Link href="https://wa.me/573185657508" target="_blank" rel="noreferrer" className="commerce-product-btn">
                  Consultar compra
                </Link>
              </div>
              <span className="commerce-product-badge">Oferta</span>
            </article>
          ))}
        </div>
      </section>

      <section className="commerce-services content-shell">
        <div className="commerce-service-strip">
          <article>
            <h3>Servicio tecnico de audio</h3>
            <p>Diagnostico, mantenimiento y reparacion para equipos de sonido profesional.</p>
          </article>
          <article>
            <h3>Instalacion de camaras</h3>
            <p>Soluciones de videovigilancia para hogares y negocios con configuracion completa.</p>
          </article>
          <Link href="/empresa#servicios" className="commerce-btn commerce-btn-primary">
            Ver servicios
          </Link>
        </div>
      </section>

      <section className="commerce-trust">
        <div className="content-shell commerce-trust-inner">
          <p><strong>3000+ referencias</strong> en rotacion</p>
          <p><strong>Atencion directa</strong> en tienda y WhatsApp</p>
          <p><strong>Entrega comercial</strong> clara y practica</p>
          <p><strong>Respaldo tecnico</strong> en audio y videovigilancia</p>
        </div>
      </section>
    </div>
  );
}
