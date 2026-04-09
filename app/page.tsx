import Link from "next/link";
import Image from "next/image";
import CatalogProductCard from "@/app/catalogo/CatalogProductCard";
import AddToCartButton from "@/app/components/AddToCartButton";
import CommerceSlider from "@/app/components/CommerceSlider";
import HomeProductCarousel from "@/app/components/HomeProductCarousel";
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
      href: "/empresa#contacto",
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
        <section className="commerce-service-strip" aria-label="Beneficios de compra">
          <div className="commerce-service-item" role="presentation">
            <span className="commerce-service-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M3 7h10v8H3zM13 9h4l3 3v3h-3" />
                <circle cx="7" cy="17" r="2" />
                <circle cx="17" cy="17" r="2" />
              </svg>
            </span>
            <p>Envíos nacionales</p>
          </div>

          <div className="commerce-service-item" role="presentation">
            <span className="commerce-service-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="8" />
                <path d="M10 9h3a2 2 0 0 1 0 4h-2a2 2 0 0 0 0 4h3M12 7v10" />
              </svg>
            </span>
            <p>Pago seguro</p>
          </div>

          <div className="commerce-service-item" role="presentation">
            <span className="commerce-service-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="7" r="3" />
                <path d="M5 20a7 7 0 0 1 14 0M4 11h3M17 11h3" />
              </svg>
            </span>
            <p>Atención inmediata</p>
          </div>

          <div className="commerce-service-item is-service-tech" role="presentation">
            <span className="commerce-service-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
                <circle cx="12" cy="12" r="4" />
              </svg>
            </span>
            <p>Servicio técnico e instalaciones</p>
          </div>

          <div className="commerce-service-item" role="presentation">
            <span className="commerce-service-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M6 5h12v14H6zM9 9h6M9 13h6" />
                <path d="M6 7 3 9v10h3" />
              </svg>
            </span>
            <p>Devoluciones</p>
          </div>
        </section>
      </section>
    </div>
  );
}
