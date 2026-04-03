import Link from "next/link";
import AddToCartButton from "@/app/components/AddToCartButton";
import {
  formatCatalogPrice,
  getCatalogCategories,
  getCatalogProducts,
  getStockLabel,
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

function getDiscountPercent(product: WebCatalogProductCard) {
  if (
    product.price_mode !== "visible" ||
    product.price === null ||
    product.compare_price === null ||
    product.compare_price <= product.price
  ) {
    return null;
  }

  return Math.round(((product.compare_price - product.price) / product.compare_price) * 100);
}

export default async function HomePage() {
  const { categories, products } = await loadHomeData();

  const visibleCategories = [...categories]
    .sort((a, b) => b.product_count - a.product_count)
    .slice(0, 6);

  const spotlightProducts = products.slice(0, 8);
  const topDeals = [...products]
    .filter((product) => getDiscountPercent(product) !== null)
    .sort((a, b) => (getDiscountPercent(b) ?? 0) - (getDiscountPercent(a) ?? 0))
    .slice(0, 3);

  return (
    <div id="inicio" className="commerce-home home-anchor-section">
      <section className="commerce-conversion-strip" aria-label="beneficios de compra">
        <p>Compra por web con stock conectado a tienda.</p>
        <p>Atencion comercial en WhatsApp en minutos.</p>
        <p>Pago seguro y seguimiento de pedido.</p>
      </section>

      <section className="commerce-hero" aria-label="Portada ecommerce">
        <div className="commerce-hero-main">
          <p className="commerce-hero-eyebrow">Tienda online Kensar Electronic</p>
          <h1>Todo para audio y seguridad, listo para comprar hoy.</h1>
          <p>
            Encuentra referencias con precio actualizado, valida disponibilidad real y agrega al carrito desde el
            primer minuto.
          </p>

          <form action="/catalogo" className="commerce-hero-search" role="search">
            <input
              type="search"
              name="q"
              placeholder="Buscar producto, marca o referencia"
              aria-label="Buscar en el catalogo"
            />
            <button type="submit">Buscar</button>
          </form>

          <div className="commerce-hero-actions">
            <Link href="/catalogo" className="commerce-btn commerce-btn-primary">
              Comprar ahora
            </Link>
            <Link href="/carrito" className="commerce-btn commerce-btn-ghost">
              Ver carrito
            </Link>
          </div>

          <div className="commerce-category-pills" aria-label="Accesos rapidos por categoria">
            {visibleCategories.map((category) => (
              <Link key={category.id} href={buildCategoryHref(category.path)} className="commerce-category-pill">
                <span>{category.name}</span>
                <small>{category.product_count > 0 ? `${category.product_count} productos` : "Explorar"}</small>
              </Link>
            ))}
          </div>
        </div>

        <aside className="commerce-hero-side">
          <div className="hero-side-card hero-side-highlight">
            <p className="hero-side-kicker">Atencion comercial hoy</p>
            <h3>WhatsApp activo para cerrar tu compra</h3>
            <p>Lunes a sabado 8:30am - 6:30pm. Palmira, Valle del Cauca.</p>
            <Link href="https://wa.me/573185657508" target="_blank" rel="noreferrer">
              Hablar con asesor
            </Link>
          </div>

          <div className="hero-side-card">
            <p className="hero-side-kicker">Categorias top</p>
            <ul>
              {visibleCategories.slice(0, 4).map((category) => (
                <li key={`top-${category.id}`}>
                  <span>{category.name}</span>
                  <strong>{category.product_count > 0 ? category.product_count : "-"}</strong>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </section>

      <section className="commerce-categories" aria-label="Categorias destacadas">
        <div className="commerce-section-head">
          <div>
            <p className="commerce-section-kicker">Compra por categoria</p>
            <h2>Entra por tu necesidad y compra en 2 pasos</h2>
          </div>
          <Link href="/catalogo">Ver todas</Link>
        </div>

        <div className="commerce-category-grid">
          {visibleCategories.map((category) => (
            <Link
              key={`tile-${category.id}`}
              href={buildCategoryHref(category.path)}
              className="commerce-category-card"
              style={{
                backgroundImage: `linear-gradient(180deg, rgba(6,12,22,0.08), rgba(6,12,22,0.7)), url('${category.image_url || "https://images.unsplash.com/photo-1484704849700-f032a568e944?q=80&w=1200&auto=format&fit=crop"}')`,
              }}
            >
              <small>{category.product_count > 0 ? `${category.product_count} productos` : "Categoria"}</small>
              <span>{category.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="commerce-products" aria-label="Productos para comprar hoy">
        <div className="commerce-section-head">
          <div>
            <p className="commerce-section-kicker">Venta directa</p>
            <h2>Productos listos para agregar al carrito</h2>
          </div>
          <Link href="/catalogo">Ir al catalogo</Link>
        </div>

        <div className="commerce-product-grid">
          {spotlightProducts.map((product) => {
            const discount = getDiscountPercent(product);

            return (
              <article key={product.id} className="commerce-product-card">
                <Link href={`/catalogo/${product.slug}`} className="commerce-product-image-link" aria-label={product.name}>
                  <div
                    className={`commerce-product-image${product.image_url ? " has-image" : ""}`}
                    style={
                      product.image_url
                        ? { backgroundImage: `url('${product.image_url}')` }
                        : undefined
                    }
                    aria-hidden="true"
                  />
                </Link>

                <div className="commerce-product-body">
                  <p className="commerce-product-tag">{product.category_name || "Catalogo"}</p>
                  <Link href={`/catalogo/${product.slug}`} className="commerce-product-title-link">
                    <h3>{product.name}</h3>
                  </Link>
                  {product.short_description ? <p className="commerce-product-copy">{product.short_description}</p> : null}

                  <p className="commerce-product-price">
                    <span>{formatCatalogPrice(product.price_mode === "visible" ? product.price : null)}</span>
                    {product.price_mode === "visible" &&
                    product.compare_price !== null &&
                    product.price !== null &&
                    product.compare_price > product.price ? (
                      <del>{formatCatalogPrice(product.compare_price)}</del>
                    ) : null}
                  </p>

                  <p className="commerce-product-stock">{getStockLabel(product.stock_status)}</p>

                  <div className="commerce-product-cta">
                    {product.price_mode === "visible" &&
                    product.price !== null &&
                    product.stock_status !== "out_of_stock" ? (
                      <AddToCartButton
                        productId={product.id}
                        productName={product.name}
                        productSlug={product.slug}
                        productSku={product.sku}
                        imageUrl={product.image_thumb_url || product.image_url}
                        brand={product.brand}
                        stockStatus={product.stock_status}
                        unitPrice={product.price}
                        comparePrice={product.compare_price}
                      />
                    ) : (
                      <Link href="https://wa.me/573185657508" target="_blank" rel="noreferrer" className="commerce-product-btn">
                        Consultar compra
                      </Link>
                    )}
                  </div>
                </div>

                {discount ? <span className="commerce-product-badge">-{discount}%</span> : null}
              </article>
            );
          })}
        </div>
      </section>

      {topDeals.length > 0 ? (
        <section className="commerce-deals" aria-label="Ofertas destacadas">
          <div className="commerce-section-head">
            <div>
              <p className="commerce-section-kicker">Precio en oportunidad</p>
              <h2>Descuentos comerciales del momento</h2>
            </div>
            <Link href="/catalogo">Ver mas ofertas</Link>
          </div>

          <div className="commerce-deal-grid">
            {topDeals.map((product) => {
              const discount = getDiscountPercent(product);

              return (
                <Link key={`deal-${product.id}`} href={`/catalogo/${product.slug}`} className="commerce-deal-card">
                  <div
                    className="commerce-deal-image"
                    style={{
                      backgroundImage: `linear-gradient(180deg, rgba(5,12,24,0.05), rgba(5,12,24,0.48)), url('${product.image_url || "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?q=80&w=1200&auto=format&fit=crop"}')`,
                    }}
                    aria-hidden="true"
                  />
                  <div className="commerce-deal-body">
                    <p>{product.category_name || "Catalogo"}</p>
                    <h3>{product.name}</h3>
                    <strong>{formatCatalogPrice(product.price_mode === "visible" ? product.price : null)}</strong>
                    {discount ? <small>Ahorra {discount}% frente al precio anterior</small> : null}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="commerce-trust" aria-label="Confianza para comprar">
        <p>
          <strong>Stock conectado</strong> a operación de tienda
        </p>
        <p>
          <strong>Checkout web</strong> con seguimiento de pedido
        </p>
        <p>
          <strong>Asesor comercial</strong> por WhatsApp y llamada
        </p>
        <p>
          <strong>Respaldo técnico</strong> en audio y videovigilancia
        </p>
      </section>
    </div>
  );
}
