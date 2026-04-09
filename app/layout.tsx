import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import Reveal from "./components/Reveal";
import TopNav from "./components/TopNav";
import AccountAccess from "./components/AccountAccess";
import CartAccess from "./components/CartAccess";
import HeaderCatalogSearch from "./components/HeaderCatalogSearch";
import FloatingWhatsAppButton from "./components/FloatingWhatsAppButton";
import GlobalBackToTop from "./components/GlobalBackToTop";
import WebCartProvider from "./components/WebCartProvider";
import WebCustomerProvider from "./components/WebCustomerProvider";
import TopbarScrollBehavior from "./components/TopbarScrollBehavior";
import CheckoutHeaderMode from "./components/CheckoutHeaderMode";
import { getCatalogCategories } from "@/app/lib/metrikCatalog";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://kensar-web.vercel.app"),
  title: {
    default: "Kensar Electronic | Audio, seguridad y servicio técnico",
    template: "%s | Kensar Electronic",
  },
  description:
    "Catálogo web de Kensar Electronic con productos de audio, videovigilancia, accesorios y atención comercial directa en Palmira.",
  applicationName: "Kensar Electronic",
  icons: {
    icon: [{ url: "/branding/icono-white.svg", type: "image/svg+xml" }],
    shortcut: [{ url: "/branding/icono-white.svg", type: "image/svg+xml" }],
    apple: "/branding/icono-transparent.png",
  },
  openGraph: {
    title: "Kensar Electronic | Audio, seguridad y servicio técnico",
    description:
      "Compra, consulta y sigue tu proceso comercial con Kensar Electronic desde una web conectada a su operación real.",
    siteName: "Kensar Electronic",
    locale: "es_CO",
    type: "website",
    images: [
      {
        url: "/branding/kensar-logo.png",
        width: 1200,
        height: 630,
        alt: "Kensar Electronic",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kensar Electronic | Audio, seguridad y servicio técnico",
    description:
      "Catálogo web de Kensar Electronic con atención comercial directa y operación conectada a tienda.",
    images: ["/branding/kensar-logo.png"],
  },
};

type HeaderCategory = {
  id: string;
  path: string;
  name: string;
};

const fallbackHeaderCategories: HeaderCategory[] = [
  { id: "audio", path: "audio-profesional", name: "Audio profesional" },
  { id: "instrumentos", path: "instrumentos", name: "Instrumentos" },
  { id: "microfonos", path: "microfonos", name: "Microfonos" },
  { id: "camaras", path: "camaras", name: "Camaras" },
  { id: "tecnologia", path: "tecnologia", name: "Tecnologia" },
];

async function loadHeaderCategories(): Promise<HeaderCategory[]> {
  try {
    const categories = await getCatalogCategories();
    const activeCategories = categories.filter((category) => category.product_count > 0);
    const source = (activeCategories.length ? activeCategories : categories).slice(0, 8);

    if (!source.length) {
      return fallbackHeaderCategories;
    }

    return source.map((category) => ({
      id: category.id,
      path: category.path,
      name: category.name,
    }));
  } catch {
    return fallbackHeaderCategories;
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headerCategories = await loadHeaderCategories();

  return (
    <html lang="es">
      <body className={inter.className}>
        <TopbarScrollBehavior />
        <CheckoutHeaderMode />
        <WebCustomerProvider>
        <WebCartProvider>
        <header className="topbar">
          <div className="topbar-utility">
            <div className="topbar-utility-inner">
              <p><strong>WhatsApp:</strong> +57 318 565 7508</p>
              <p><strong>Horario:</strong> Lunes a sabado 8:30am - 6:30pm</p>
              <p><strong>Ubicacion:</strong> Palmira, Valle del Cauca</p>
            </div>
          </div>

          <div className="topbar-container">
            <Link href="/" className="brand-logo-top" aria-label="Ir al inicio de Kensar Electronic">
              <Image
                src="/branding/kensar-horizontal1.png"
                alt="Kensar Electronic"
                width={320}
                height={72}
                className="brand-logo-image"
                priority
              />
            </Link>
            <div className="topbar-main-right">
              <div className="topbar-actions">
                <div className="header-search-cluster">
                  <Suspense fallback={null}>
                    <HeaderCatalogSearch />
                  </Suspense>
                </div>

                <div className="header-icon-cluster">
                  <Suspense fallback={null}>
                    <AccountAccess />
                  </Suspense>
                  <Suspense fallback={null}>
                    <CartAccess />
                  </Suspense>

                  <div className="social-links" aria-label="Redes sociales">
                    <a
                      href="https://instagram.com/"
                      target="_blank"
                      rel="noreferrer"
                      className="social-icon-link"
                      aria-label="Instagram"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2Zm0 1.8A3.7 3.7 0 0 0 3.8 7.5v9a3.7 3.7 0 0 0 3.7 3.7h9a3.7 3.7 0 0 0 3.7-3.7v-9a3.7 3.7 0 0 0-3.7-3.7h-9Zm9.65 1.5a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.8A3.2 3.2 0 1 0 12 15.2 3.2 3.2 0 0 0 12 8.8Z" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
              <TopNav categories={headerCategories} />
            </div>
          </div>
        </header>

        <main className="main-wrapper">{children}</main>
        <FloatingWhatsAppButton />
        <GlobalBackToTop />

        <footer className="site-footer">
          <div className="site-footer-inner">
            <Reveal className="footer-brand-reveal" delay="none">
              <div className="footer-brand-block">
                <Link href="/" className="footer-logo-link" aria-label="Ir al inicio de Kensar Electronic">
                  <Image
                    src="/branding/texto-kensar.png"
                    alt="Kensar Electronic"
                    width={420}
                    height={108}
                    className="footer-logo-image"
                  />
                </Link>
                <p className="footer-brand-copy">
                  Tecnologia, servicio y atencion comercial para una operacion real en Palmira.
                </p>
              </div>
            </Reveal>

            <div className="footer-grid">
              <Reveal delay="short">
                <section className="footer-column">
                  <p className="footer-label">Ubicacion</p>
                  <p>Cra 24 #30-75</p>
                  <p>Palmira, Colombia</p>
                  <p>NIT 94385333-1</p>
                </section>
              </Reveal>

              <Reveal delay="mid">
                <section className="footer-column">
                  <p className="footer-label">Contacto</p>
                  <a href="tel:+573185657508">(+57) 318 565 7508</a>
                  <a href="https://wa.me/573185657508" target="_blank" rel="noreferrer">
                    WhatsApp directo
                  </a>
                  <a href="mailto:kensarelec@gmail.com">kensarelec@gmail.com</a>
                </section>
              </Reveal>

              <Reveal delay="long">
                <section className="footer-column">
                  <p className="footer-label">Horario</p>
                  <p>Lunes a sabado</p>
                  <p>8:30am a 6:30pm</p>
                  <p>Domingos y festivos</p>
                  <p>9:00am a 1:30pm</p>
                </section>
              </Reveal>
            </div>
          </div>

          <Reveal delay="mid">
            <div className="site-footer-bottom">
              <p>© 2026 Kensar Electronic. Todos los derechos reservados.</p>
              <p>Titular del sitio: Kensar Electronic</p>
            </div>
          </Reveal>
        </footer>
        </WebCartProvider>
        </WebCustomerProvider>
      </body>
    </html>
  );
}
