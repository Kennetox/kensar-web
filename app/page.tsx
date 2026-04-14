import Link from "next/link";
import Image from "next/image";
import CatalogProductCard from "@/app/catalogo/CatalogProductCard";
import AddToCartButton from "@/app/components/AddToCartButton";
import CommerceSlider from "@/app/components/CommerceSlider";
import HomeProductCarousel from "@/app/components/HomeProductCarousel";
import Reveal from "@/app/components/Reveal";
import {
  getCatalogCategories,
  getCatalogProducts,
  type WebCatalogCategory,
  type WebCatalogProductCard,
} from "@/app/lib/metrikCatalog";

type HomeData = {
  categories: WebCatalogCategory[];
  products: WebCatalogProductCard[];
};

const fallbackCategories: WebCatalogCategory[] = [
  {
    id: "audio",
    path: "audio-profesional",
    name: "Audio profesional",
    image_url: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=1200&auto=format&fit=crop",
    tile_color: null,
    product_count: 0,
  },
  {
    id: "instrumentos",
    path: "instrumentos",
    name: "Instrumentos",
    image_url: "https://images.unsplash.com/photo-1461784180009-21121b2f204c?q=80&w=1200&auto=format&fit=crop",
    tile_color: null,
    product_count: 0,
  },
  {
    id: "microfonos",
    path: "microfonos",
    name: "Microfonos",
    image_url: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?q=80&w=1200&auto=format&fit=crop",
    tile_color: null,
    product_count: 0,
  },
  {
    id: "accesorios",
    path: "accesorios",
    name: "Accesorios",
    image_url: "https://images.unsplash.com/photo-1580894894513-a9760f4c4d53?q=80&w=1200&auto=format&fit=crop",
    tile_color: null,
    product_count: 0,
  },
  {
    id: "camaras",
    path: "camaras",
    name: "Camaras",
    image_url: "https://images.unsplash.com/photo-1557324232-b8917d3c3dcb?q=80&w=1200&auto=format&fit=crop",
    tile_color: null,
    product_count: 0,
  },
  {
    id: "servicio",
    path: "servicio-tecnico",
    name: "Servicio tecnico",
    image_url: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=1200&auto=format&fit=crop",
    tile_color: null,
    product_count: 0,
  },
];

const fallbackProducts: WebCatalogProductCard[] = [
  {
    id: 9001,
    sku: "F-9001",
    slug: "cabina-activa-12",
    name: "Cabina activa 12\"",
    short_description: "Bluetooth, USB y potencia para eventos.",
    brand: "Kensar",
    group_name: null,
    category_path: "audio-profesional",
    category_name: "Audio profesional",
    image_url: "https://images.unsplash.com/photo-1545454675-3531b543be5d?q=80&w=1200&auto=format&fit=crop",
    image_thumb_url: null,
    gallery: [],
    badge_text: "Oferta",
    price_mode: "visible",
    price: 1290000,
    compare_price: 1490000,
    web_price_source: "base",
    web_price_value: null,
    stock_status: "in_stock",
    featured: true,
  },
  {
    id: 9002,
    sku: "F-9002",
    slug: "microfono-inalambrico-doble",
    name: "Microfono inalambrico doble",
    short_description: "Set receptor + 2 microfonos para tarima.",
    brand: "Kensar",
    group_name: null,
    category_path: "microfonos",
    category_name: "Microfonos",
    image_url: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=1200&auto=format&fit=crop",
    image_thumb_url: null,
    gallery: [],
    badge_text: "Nuevo",
    price_mode: "visible",
    price: 520000,
    compare_price: 610000,
    web_price_source: "base",
    web_price_value: null,
    stock_status: "in_stock",
    featured: true,
  },
  {
    id: 9003,
    sku: "F-9003",
    slug: "teclado-61-teclas",
    name: "Teclado 61 teclas",
    short_description: "Ideal para estudio y presentacion en vivo.",
    brand: "Kensar",
    group_name: null,
    category_path: "instrumentos",
    category_name: "Instrumentos",
    image_url: "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?q=80&w=1200&auto=format&fit=crop",
    image_thumb_url: null,
    gallery: [],
    badge_text: "Oferta",
    price_mode: "visible",
    price: 890000,
    compare_price: 990000,
    web_price_source: "base",
    web_price_value: null,
    stock_status: "low_stock",
    featured: false,
  },
  {
    id: 9004,
    sku: "F-9004",
    slug: "kit-dvr-4-camaras",
    name: "Kit DVR + 4 camaras",
    short_description: "Seguridad completa para hogar y negocio.",
    brand: "Kensar",
    group_name: null,
    category_path: "camaras",
    category_name: "Camaras",
    image_url: "https://images.unsplash.com/photo-1557324232-b8917d3c3dcb?q=80&w=1200&auto=format&fit=crop",
    image_thumb_url: null,
    gallery: [],
    badge_text: "Top venta",
    price_mode: "visible",
    price: 1450000,
    compare_price: 1680000,
    web_price_source: "base",
    web_price_value: null,
    stock_status: "in_stock",
    featured: true,
  },
];

async function loadHomeData(): Promise<HomeData> {
  try {
    const [categories, productList] = await Promise.all([
      getCatalogCategories(),
      getCatalogProducts({ page: 1 }),
    ]);

    return {
      categories: categories.length ? categories : fallbackCategories,
      products: productList.items.length ? productList.items : fallbackProducts,
    };
  } catch {
    return {
      categories: fallbackCategories,
      products: fallbackProducts,
    };
  }
}

function buildCategoryHref(path: string | null) {
  if (!path) return "/catalogo";
  return `/catalogo?category=${encodeURIComponent(path)}`;
}

function normalizeCategoryValue(value: string | null) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isHomeCategoryProduct(product: WebCatalogProductCard) {
  const categoryPath = normalizeCategoryValue(product.category_path);
  const categoryName = normalizeCategoryValue(product.category_name);
  return (
    categoryPath.includes("camara") ||
    categoryPath.includes("tecnologia") ||
    categoryName.includes("camara") ||
    categoryName.includes("tecnologia")
  );
}

function shuffleProducts(items: WebCatalogProductCard[]) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
}

async function fetchCategoryProducts(category: string, targetCount = 10) {
  const collected: WebCatalogProductCard[] = [];
  let page = 1;

  while (collected.length < targetCount) {
    const response = await getCatalogProducts({ category, page });
    collected.push(...response.items);

    const reachedEnd = response.items.length === 0 || page * response.page_size >= response.total;
    if (reachedEnd) break;
    page += 1;
  }

  return collected;
}

async function loadHomeLivingProducts(seedProducts: WebCatalogProductCard[]) {
  const mergedById = new Map<number, WebCatalogProductCard>();

  try {
    const [cameraProducts, technologyProducts] = await Promise.all([
      fetchCategoryProducts("camaras", 10),
      fetchCategoryProducts("tecnologia", 10),
    ]);

    [...cameraProducts, ...technologyProducts].forEach((product) => {
      mergedById.set(product.id, product);
    });
  } catch {
    // Si alguna consulta por categoría falla, mantenemos fallback local.
  }

  if (mergedById.size < 10) {
    seedProducts.filter(isHomeCategoryProduct).forEach((product) => {
      mergedById.set(product.id, product);
    });
  }

  return shuffleProducts([...mergedById.values()]).slice(0, 10);
}

export default async function HomePage() {
  const { categories, products } = await loadHomeData();

  const discoverProducts = products.slice(0, 5);
  const livingProducts = await loadHomeLivingProducts(products);
  const sliderSlides = [
    {
      id: "guitarras",
      image: "/sliders/home/slide-01-desktop.webp",
      alt: "Promociones y descuentos en categorias destacadas",
      href: "/catalogo?category=instrumentos",
      ctaLabel: "VER GUITARRAS",
    },
    {
      id: "audio-main",
      image: "/sliders/home/slide-02-desktop.webp",
      alt: "Sonido profesional para eventos y produccion",
      href: "/catalogo",
      ctaLabel: "VER EQUIPOS",
    },
    {
      id: "contacto",
      image: "/sliders/home/slide-03-desktop.webp",
      alt: "Marcas premium en audio profesional",
      href: "/empresa",
      ctaLabel: "EXPLORAR TIENDA",
    },
  ];
  const marqueeLogos = [
    { name: "Yamaha", src: "/brands/marquee/yamaha.svg" },
    { name: "Pro DJ", src: "/brands/marquee/prodj.svg" },
    { name: "RM", src: "/brands/marquee/rm.svg" },
    { name: "Spain", src: "/brands/marquee/spain.svg" },
    { name: "Audio Sound", src: "/brands/marquee/audiosound.svg", scaleClass: "is-scale-audiosound" },
    { name: "Ayson", src: "/brands/marquee/ayson.svg", scaleClass: "is-scale-ayson" },
    { name: "EZVIZ", src: "/brands/marquee/ezviz.svg" },
    { name: "Hikvision", src: "/brands/marquee/hikvision.svg" },
    { name: "HiLook", src: "/brands/marquee/hilook.svg" },
    { name: "iSmart", src: "/brands/marquee/ismart.svg" },
    { name: "Jaltech", src: "/brands/marquee/jaltech.svg", scaleClass: "is-scale-jaltech" },
    { name: "Proel", src: "/brands/marquee/proel.svg" },
  ];
  const preferredFeaturedCategories = [
    { key: "audio-profesional", name: "Audio profesional", imageUrl: "/categories/home/cat-01-audio.webp" },
    { key: "accesorios", name: "Accesorios", imageUrl: "/categories/home/cat-02-accesorios.webp" },
    { key: "instrumentos", name: "Instrumentos", imageUrl: "/categories/home/cat-03-instrumentos.webp" },
    { key: "microfonos", name: "Microfonos", imageUrl: "/categories/home/cat-04-microfonos.webp" },
  ];
  const featuredCategories = preferredFeaturedCategories.map((preferred, index) => {
    const matchedCategory = categories.find((category) => category.path === preferred.key);
    return {
      id: matchedCategory?.id || `featured-${index}`,
      href: matchedCategory ? buildCategoryHref(matchedCategory.path) : buildCategoryHref(preferred.key),
      name: matchedCategory?.name || preferred.name,
      imageUrl: preferred.imageUrl,
    };
  });
  const socialConnectLinks = [
    {
      id: "instagram",
      label: "Instagram",
      href: "https://instagram.com/",
    },
    {
      id: "facebook",
      label: "Facebook",
      href: "https://facebook.com/",
    },
    {
      id: "tiktok",
      label: "TikTok",
      href: "https://www.tiktok.com/",
    },
    {
      id: "whatsapp",
      label: "WhatsApp",
      href: "https://wa.me/573185657508?text=Hola%2C%20quiero%20informaci%C3%B3n%20sobre%20productos%20disponibles%20en%20la%20tienda%20web%20de%20Kensar.",
    },
  ];

  return (
    <div id="inicio" className="commerce-home home-anchor-section">
      <CommerceSlider slides={sliderSlides} categories={featuredCategories} intervalMs={8000} />

      <section className="commerce-discover" aria-label="Descubre lo nuevo">
        <div className="commerce-categories-divider" aria-hidden="true" />
        <div className="commerce-discover-head">
          <div>
            <p className="commerce-section-kicker">Descubre lo nuevo</p>
            <h2>Nuevos productos para comprar hoy</h2>
          </div>
          <Link href="/catalogo">Ir al catalogo</Link>
        </div>

        <div className="catalog-product-grid commerce-discover-grid">
          {discoverProducts.map((product) => {
            return (
              <div key={product.id} className="commerce-discover-item">
                <CatalogProductCard product={product} />
                <div className="commerce-discover-cta">
                  <AddToCartButton
                    productId={product.id}
                    productName={product.name}
                    productSlug={product.slug}
                    productSku={product.sku}
                    imageUrl={product.image_thumb_url || product.image_url}
                    brand={product.brand}
                    stockStatus={product.stock_status}
                    unitPrice={product.price ?? 0}
                    comparePrice={product.compare_price}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <div className="commerce-categories-divider" aria-hidden="true" />

      <section className="commerce-brand-collage" aria-label="Marcas que respaldan tu sonido">
        <div className="commerce-brand-collage-head">
          <p className="commerce-section-kicker">Marcas destacadas</p>
          <h2>Marcas que respaldan tu sonido</h2>
        </div>

        <div className="brand-collage-grid">
          <Link href="/catalogo?brand=yamaha" className="brand-tile brand-tile-main" aria-label="Explorar Yamaha">
            <div
              className="brand-tile-image"
              style={{ backgroundImage: "url('/brands/collage/hero-yamaha.webp')" }}
              aria-hidden="true"
            />
          </Link>

          <Link href="/catalogo?brand=pro-dj" className="brand-tile brand-tile-top-left" aria-label="Explorar Pro DJ">
            <div
              className="brand-tile-image"
              style={{ backgroundImage: "url('/brands/collage/title-prodj.webp')" }}
              aria-hidden="true"
            />
          </Link>

          <Link href="/catalogo?brand=rm" className="brand-tile brand-tile-top-right" aria-label="Explorar RM">
            <div
              className="brand-tile-image"
              style={{ backgroundImage: "url('/brands/collage/title-rm1.webp')" }}
              aria-hidden="true"
            />
          </Link>

          <Link href="/catalogo?brand=spain" className="brand-tile brand-tile-bottom" aria-label="Explorar Spain">
            <div
              className="brand-tile-image"
              style={{ backgroundImage: "url('/brands/collage/banner-spain.webp')" }}
              aria-hidden="true"
            />
          </Link>
        </div>
      </section>
      <section className="commerce-next-clean-section" aria-label="Banner hogar">
        <Image
          src="/sliders/home/banner-hogar.png"
          alt="Banner de hogar Kensar Electronic"
          width={1920}
          height={640}
          sizes="100vw"
          unoptimized
          className="commerce-next-banner-image"
        />

        {livingProducts.length > 0 ? (
          <div className="commerce-home-living-products">
            <HomeProductCarousel ariaLabel="Carrusel de productos del hogar">
              {livingProducts.map((product) => (
                <div key={`hogar-${product.id}`} className="home-product-carousel-item">
                  <CatalogProductCard product={product} />
                  <div className="home-product-carousel-cta">
                    <AddToCartButton
                      productId={product.id}
                      productName={product.name}
                      productSlug={product.slug}
                      productSku={product.sku}
                      imageUrl={product.image_thumb_url || product.image_url}
                      brand={product.brand}
                      stockStatus={product.stock_status}
                      unitPrice={product.price ?? 0}
                      comparePrice={product.compare_price}
                    />
                  </div>
                </div>
              ))}
            </HomeProductCarousel>
          </div>
        ) : null}
      </section>
      <div className="commerce-categories-divider commerce-after-home-divider" aria-hidden="true" />
      <section className="commerce-next-placeholder-section" aria-label="Seccion pendiente">
        <div className="brand-marquee-strip" aria-label="Marcas aliadas">
          <div className="brand-marquee-fade brand-marquee-fade-left" aria-hidden="true" />
          <div className="brand-marquee-fade brand-marquee-fade-right" aria-hidden="true" />
          <div className="brand-marquee-track">
            {[0, 1].map((loop) =>
              marqueeLogos.map((logo) => (
                <div
                  key={`brand-marquee-${loop}-${logo.src}`}
                  className={`brand-marquee-item${logo.scaleClass ? ` ${logo.scaleClass}` : ""}`}
                  aria-hidden={loop === 1}
                >
                  <Image src={logo.src} alt={logo.name} width={160} height={40} />
                </div>
              ))
            )}
          </div>
        </div>
        <div className="commerce-home-video-strip" aria-label="Video de vitrina hogar">
          <video className="commerce-home-video" autoPlay muted loop playsInline preload="auto">
            <source src="/media/home/home-strip-video.mp4" type="video/mp4" />
          </video>
        </div>
      </section>
      <section className="commerce-financing-showcase" aria-label="Métodos de pago a crédito">
        <div className="commerce-financing-shell">
          <Reveal className="commerce-financing-head" delay="short">
            <p className="commerce-section-kicker">Métodos de pago a crédito</p>
            <h2>Paga a cuotas con Addi o Sistecrédito</h2>
            <p>Elige la opción que mejor se adapte a ti y compra hoy.</p>
          </Reveal>

          <div className="commerce-financing-grid">
            <Reveal className="commerce-financing-card is-addi" direction="left" speed="normal">
              <div className="commerce-financing-logo-wrap">
                <Image
                  src="/payments/logos/addi.png"
                  alt="Logo de Addi"
                  width={320}
                  height={110}
                  className="commerce-financing-logo"
                />
              </div>
              <h3>Compra con Addi</h3>
              <p>Solicita tu cupo en minutos y paga en cuotas según aprobación.</p>
              <ul>
                <li>Respuesta rápida en línea</li>
                <li>Proceso 100% digital</li>
                <li>Sin trámites en tienda</li>
              </ul>
              <div className="commerce-financing-actions">
                <a
                  href="https://co.addi.com"
                  target="_blank"
                  rel="noreferrer"
                  className="commerce-financing-btn is-primary"
                >
                  Solicitar con Addi
                </a>
                <a
                  href="https://co.addi.com"
                  target="_blank"
                  rel="noreferrer"
                  className="commerce-financing-btn is-ghost"
                >
                  Conocer más
                </a>
              </div>
            </Reveal>

            <Reveal className="commerce-financing-visual" delay="mid" speed="slow">
              <div className="commerce-financing-float-logo is-addi" aria-hidden="true">
                <Image src="/payments/logos/addi.png" alt="" width={156} height={52} className="commerce-financing-float-image" />
              </div>
              <div className="commerce-financing-float-logo is-sistecredito" aria-hidden="true">
                <Image
                  src="/payments/logos/sistecredito.png"
                  alt=""
                  width={206}
                  height={52}
                  className="commerce-financing-float-image"
                />
              </div>
              <div className="commerce-financing-float-logo is-kensar" aria-hidden="true">
                <Image
                  src="/payments/logos/kensarlog.png"
                  alt=""
                  width={220}
                  height={68}
                  className="commerce-financing-float-image is-kensar-logo"
                />
              </div>
              <Image
                src="/payments/people/hero-woman.png"
                alt="Asesora de crédito para compras a cuotas"
                width={900}
                height={1100}
                className="commerce-financing-person"
              />
            </Reveal>

            <Reveal className="commerce-financing-card is-sistecredito" direction="right" speed="normal">
              <div className="commerce-financing-logo-wrap">
                <Image
                  src="/payments/logos/sistecredito.png"
                  alt="Logo de Sistecrédito"
                  width={420}
                  height={110}
                  className="commerce-financing-logo"
                />
              </div>
              <h3>Compra con Sistecrédito</h3>
              <p>Usa tu cupo para comprar hoy y paga en cuotas cómodas.</p>
              <ul>
                <li>Aprobación sujeta a política de la entidad</li>
                <li>Cuotas según monto y perfil</li>
                <li>Acompañamiento por WhatsApp</li>
              </ul>
              <div className="commerce-financing-actions">
                <a
                  href="https://www.sistecredito.com"
                  target="_blank"
                  rel="noreferrer"
                  className="commerce-financing-btn is-primary"
                >
                  Aplicar a Sistecrédito
                </a>
                <a
                  href="https://www.sistecredito.com/teescuchamos/#prueba-iframe"
                  target="_blank"
                  rel="noreferrer"
                  className="commerce-financing-btn is-ghost"
                >
                  Conocer más
                </a>
              </div>
            </Reveal>
          </div>

          <p className="commerce-financing-legal">
            Financiación sujeta a aprobación y condiciones de Addi y Sistecrédito.
          </p>
        </div>
      </section>

      <section className="commerce-social-strip" aria-label="Redes sociales de Kensar">
        <div className="commerce-social-strip-inner">
          <article className="commerce-social-info-item is-social">
            <span className="commerce-social-info-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="8" />
                <path d="M4 12h16M12 4c3 2.6 3 13.4 0 16M12 4c-3 2.6-3 13.4 0 16M6.8 8.6h10.4M6.8 15.4h10.4" />
              </svg>
            </span>
            <div className="commerce-social-info-copy">
              <strong>Comunidad Kensar</strong>
              <p>Síguenos en nuestras redes</p>
              <div className="commerce-social-info-links">
                {socialConnectLinks.map((social) => (
                  <a
                    key={social.id}
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    className={`commerce-social-info-link is-${social.id}`}
                    aria-label={`Abrir ${social.label} de Kensar`}
                  >
                    {social.id === "instagram" ? (
                      <svg viewBox="0 0 24 24">
                        <path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2Zm0 1.8A3.7 3.7 0 0 0 3.8 7.5v9a3.7 3.7 0 0 0 3.7 3.7h9a3.7 3.7 0 0 0 3.7-3.7v-9a3.7 3.7 0 0 0-3.7-3.7h-9Zm9.65 1.5a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.8A3.2 3.2 0 1 0 12 15.2 3.2 3.2 0 0 0 12 8.8Z" />
                      </svg>
                    ) : null}
                    {social.id === "facebook" ? (
                      <svg viewBox="0 0 24 24">
                        <path d="M13.6 22v-8.1h2.8l.42-3.2h-3.22V8.7c0-.92.26-1.54 1.58-1.54h1.68V4.3c-.3-.04-1.3-.12-2.47-.12-2.45 0-4.12 1.5-4.12 4.25v2.37H7.5v3.2h2.75V22h3.35Z" />
                      </svg>
                    ) : null}
                    {social.id === "tiktok" ? (
                      <svg viewBox="0 0 24 24">
                        <path d="M14.9 2h2.63a5.4 5.4 0 0 0 3.75 3.75v2.69a8.1 8.1 0 0 1-3.78-.94v7.05a6.54 6.54 0 1 1-5.66-6.49v2.82a3.72 3.72 0 1 0 2.42 3.49V2Z" />
                      </svg>
                    ) : null}
                    {social.id === "whatsapp" ? (
                      <svg viewBox="0 0 24 24">
                        <path d="M12 3a8.95 8.95 0 0 0-7.77 13.37L3 21l4.8-1.2A9 9 0 1 0 12 3Zm0 16.2a7.17 7.17 0 0 1-3.66-1.01l-.26-.15-2.84.71.76-2.77-.17-.28A7.2 7.2 0 1 1 12 19.2Zm3.95-5.4c-.22-.11-1.3-.64-1.5-.71-.2-.08-.35-.11-.5.11-.15.22-.57.71-.7.86-.13.15-.26.17-.49.06-.22-.11-.94-.34-1.8-1.09-.66-.58-1.1-1.3-1.23-1.52-.13-.22-.01-.34.1-.45.1-.1.22-.26.34-.39.11-.13.15-.22.22-.37.08-.15.04-.28-.02-.39-.06-.11-.5-1.21-.69-1.66-.18-.43-.36-.38-.5-.39h-.43c-.15 0-.39.06-.6.28-.2.22-.78.76-.78 1.86s.8 2.16.91 2.31c.11.15 1.57 2.4 3.8 3.37.53.23.95.37 1.28.47.54.17 1.04.15 1.43.09.44-.07 1.3-.53 1.49-1.04.18-.5.18-.93.13-1.02-.06-.09-.2-.15-.42-.26Z" />
                      </svg>
                    ) : null}
                  </a>
                ))}
              </div>
            </div>
          </article>

          <article className="commerce-social-info-item">
            <span className="commerce-social-info-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V22a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H2a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.08a1.65 1.65 0 0 0 1-1.51V2a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.08a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.08a1.65 1.65 0 0 0 1.51 1H22a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
              </svg>
            </span>
            <div className="commerce-social-info-copy">
              <strong>Servicio técnico</strong>
              <p>Instalaciones, soporte y mantenimiento para tus equipos.</p>
            </div>
          </article>

          <article className="commerce-social-info-item">
            <span className="commerce-social-info-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 21s7-5.76 7-11a7 7 0 1 0-14 0c0 5.24 7 11 7 11Z" />
                <circle cx="12" cy="10" r="2.8" />
              </svg>
            </span>
            <div className="commerce-social-info-copy">
              <strong>Punto de atención</strong>
              <p>Cra 24 #30-75, Palmira, Valle del Cauca.</p>
            </div>
          </article>

          <article className="commerce-social-info-item">
            <span className="commerce-social-info-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M6.8 3.5h2.4l1.2 3.6-1.8 1.7a13 13 0 0 0 6.7 6.7l1.7-1.8 3.6 1.2v2.4a2 2 0 0 1-2 2A16.9 16.9 0 0 1 4.8 5.5a2 2 0 0 1 2-2Z" />
              </svg>
            </span>
            <div className="commerce-social-info-copy">
              <strong>Atención comercial</strong>
              <p>
                <a href="tel:+573185657508">(+57) 318 565 7508</a>
              </p>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
