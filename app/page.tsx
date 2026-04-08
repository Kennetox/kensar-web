import Link from "next/link";
import Image from "next/image";
import CatalogProductCard from "@/app/catalogo/CatalogProductCard";
import CommerceSlider from "@/app/components/CommerceSlider";
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

export default async function HomePage() {
  const { categories, products } = await loadHomeData();

  const discoverProducts = products.slice(0, 5);
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
              <CatalogProductCard key={product.id} product={product} />
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
      <div className="commerce-categories-divider commerce-next-section-divider" aria-hidden="true" />
      <section className="commerce-next-clean-section" aria-label="Banner hogar">
        <Image
          src="/sliders/home/banner-hogar.png"
          alt="Banner de hogar Kensar Electronic"
          width={1920}
          height={640}
          sizes="100vw"
          className="commerce-next-banner-image"
        />
      </section>
    </div>
  );
}
