# Plan de Integracion del Catalogo Web con Metrik

## Objetivo

Construir el catalogo de `kensar_web` usando `Metrik` como unica fuente de verdad para productos, stock, precios e imagenes.

La web no debe administrar una base de productos paralela. Debe consumir una capa de API de catalogo preparada especificamente para publicacion web.


## Decision base

- `kensar_backend` mantiene el inventario total y la operacion real.
- `kensar_web` consume solo productos publicables.
- La logica de publicacion vive en Metrik, no en Next.js.
- No se exponen todos los SKU por defecto.
- La web es una vitrina comercial conectada a datos reales, no un POS ni un ERP.


## Lo que ya existe en Metrik

Hoy el backend ya tiene una base valida para esto:

- `products`
  - nombre
  - sku
  - precio
  - costo
  - barcode
  - imagen
  - grupo
  - marca
  - estado activo
- `product_groups`
  - jerarquia o agrupacion comercial
  - imagen y color de grupo
- `inventory_movements`
  - base para calcular stock real
- `catalog-version`
  - señal de versionado para invalidar cache o refrescar catalogo

Esto significa que no hay que inventar otro sistema de productos. Solo falta una capa de publicacion web.


## Problema actual

Los endpoints existentes de productos en Metrik estan pensados para gestion interna:

- requieren autenticacion POS
- devuelven modelo operativo, no modelo comercial
- no filtran por visibilidad web
- no separan claramente lo publico de lo interno

Por eso no conviene conectar `kensar_web` directo a `/products`.


## Arquitectura recomendada

### 1. Fuente unica de verdad

`Metrik` sigue siendo el sistema maestro.

### 2. Capa de publicacion web

Crear en backend un router dedicado, por ejemplo:

- `routers/web_catalog.py`

Con endpoints orientados a web:

- `GET /web/catalog/version`
- `GET /web/catalog/categories`
- `GET /web/catalog/products`
- `GET /web/catalog/products/{slug}`

### 3. Consumo desde Next.js

`kensar_web` consume esos endpoints desde el servidor de Next, no desde componentes cliente cuando no sea necesario.

Esto permite:

- SSR o SSG parcial
- mejor SEO
- control de errores
- manejo de cache
- no exponer detalles innecesarios del backend


## Cambios recomendados al modelo Product en Metrik

Agregar metadata web sobre el mismo producto, sin crear tablas duplicadas.

### Campos nuevos minimos

- `web_published: bool = false`
- `web_featured: bool = false`
- `web_slug: string | null`
- `web_short_description: string | null`
- `web_sort_order: int = 0`
- `web_visible_when_out_of_stock: bool = true`
- `web_price_mode: string = "visible"`

### Valores propuestos para `web_price_mode`

- `visible`
- `consultar`

Opcionalmente despues:

- `desde`

### Campos recomendados para una segunda fase

- `web_long_description: text | null`
- `web_specs: json | null`
- `web_badges: json | null`
- `web_meta_title: string | null`
- `web_meta_description: string | null`
- `web_whatsapp_message: string | null`


## Reglas de publicacion

Un producto aparece en la web si cumple:

- `active = true`
- `web_published = true`
- tiene `name`
- tiene `web_slug`

Y preferiblemente:

- tiene imagen
- tiene grupo o categoria comercial clara

### Regla de stock

No mostraria stock numerico exacto al inicio.

La web deberia recibir un estado resumido:

- `in_stock`
- `low_stock`
- `out_of_stock`
- `service`
- `consultar`

### Regla de visibilidad segun stock

- Si `out_of_stock` y `web_visible_when_out_of_stock = false`, no se lista.
- Si `out_of_stock` y `web_visible_when_out_of_stock = true`, se puede listar con CTA de consulta.


## Contrato de datos recomendado

### Categoria web

```ts
type WebCatalogCategory = {
  id: string;
  path: string;
  name: string;
  imageUrl: string | null;
  tileColor: string | null;
  productCount: number;
};
```

### Producto web en listado

```ts
type WebCatalogProductCard = {
  id: number;
  sku: string | null;
  slug: string;
  name: string;
  shortDescription: string | null;
  brand: string | null;
  categoryPath: string | null;
  categoryName: string | null;
  imageUrl: string | null;
  imageThumbUrl: string | null;
  priceMode: "visible" | "consultar";
  price: number | null;
  stockStatus: "in_stock" | "low_stock" | "out_of_stock" | "service" | "consultar";
  featured: boolean;
};
```

### Producto web detalle

```ts
type WebCatalogProductDetail = {
  id: number;
  sku: string | null;
  slug: string;
  name: string;
  shortDescription: string | null;
  longDescription: string | null;
  brand: string | null;
  categoryPath: string | null;
  categoryName: string | null;
  imageUrl: string | null;
  imageThumbUrl: string | null;
  gallery: string[];
  priceMode: "visible" | "consultar";
  price: number | null;
  stockStatus: "in_stock" | "low_stock" | "out_of_stock" | "service" | "consultar";
  specs: Record<string, string>;
  whatsappMessage: string | null;
};
```


## Endpoints recomendados

### `GET /web/catalog/version`

Uso:

- invalidar cache
- saber si hubo cambios en productos o grupos

Respuesta ejemplo:

```json
{
  "updated_at": "2026-03-27T12:00:00Z",
  "products_count": 48,
  "groups_count": 6
}
```

### `GET /web/catalog/categories`

Respuesta ejemplo:

```json
{
  "items": [
    {
      "id": "audio-profesional",
      "path": "audio-profesional",
      "name": "Audio profesional",
      "imageUrl": "/uploads/...",
      "tileColor": "#1A2233",
      "productCount": 12
    }
  ]
}
```

### `GET /web/catalog/products`

Parametros sugeridos:

- `q`
- `category`
- `brand`
- `featured`
- `sort`
- `page`
- `page_size`

Respuesta ejemplo:

```json
{
  "items": [],
  "total": 48,
  "page": 1,
  "page_size": 24,
  "filters": {
    "categories": [],
    "brands": []
  }
}
```

### `GET /web/catalog/products/{slug}`

Devuelve el detalle comercial del producto para SEO, ficha y CTA de WhatsApp.


## Logica interna sugerida para stock

La base ya existe en `inventory_movements`. La API web debe traducir eso a un estado comercial.

Regla inicial recomendada:

- `service = true` -> `service`
- `qty_on_hand <= 0` -> `out_of_stock`
- `low_stock_alert = true` y `qty_on_hand <= stock_min` -> `low_stock`
- `qty_on_hand > 0` -> `in_stock`

Si el equipo prefiere no depender aun del stock real para publicacion:

- devolver `consultar`

Pero como Metrik ya calcula stock, lo razonable es usarlo desde el inicio.


## Seguridad y acceso

Hay dos opciones viables.

### Opcion A. Endpoints publicos controlados

Los endpoints `/web/catalog/*` son publicos y solo exponen data ya aprobada para web.

Ventajas:

- mas simple
- ideal para catalogo publico
- facil de consumir desde Next

Riesgo:

- requiere cuidar muy bien que el serializer no filtre campos internos por accidente

### Opcion B. Endpoints protegidos para servidor

`kensar_web` consume el backend con un token privado de servidor.

Ventajas:

- mejor control
- no quedan endpoints abiertos a cualquiera

Costo:

- mas complejidad operativa
- gestion de secretos entre Vercel y backend

### Recomendacion

Para el catalogo actual recomiendo `Opcion A`, pero con endpoints extremadamente delgados y dedicados.

No abrir `products` ni `inventory` existentes.
Abrir solo `web_catalog`.


## Integracion recomendada en kensar_web

### Capa de acceso

Crear algo como:

- `app/lib/metrikCatalog.ts`

Con funciones:

- `getCatalogProducts(params)`
- `getCatalogProduct(slug)`
- `getCatalogCategories()`
- `getCatalogVersion()`

### Variables de entorno

- `METRIK_API_BASE_URL`

Opcional si se usa endpoint privado:

- `METRIK_WEB_CATALOG_TOKEN`

### Renderizado

- `/catalogo` como Server Component
- filtro por `searchParams`
- detalle por producto en ruta futura:
  - `/catalogo/[slug]`


## Fases de implementacion

### Fase 1. Backend listo para publicar

Objetivo:

- agregar metadata web al producto
- crear endpoints de catalogo

Entregables:

- migracion de campos web en `products`
- schemas web
- router `web_catalog.py`
- tests de listado y detalle

### Fase 2. Catalogo web funcional

Objetivo:

- conectar `kensar_web` a Metrik

Entregables:

- fetch server-side
- pagina `/catalogo`
- filtros basicos
- cards de producto
- estados comerciales
- CTA a WhatsApp

### Fase 3. Ficha de producto

Objetivo:

- mejorar descubrimiento y conversion

Entregables:

- `/catalogo/[slug]`
- metadata SEO
- breadcrumbs
- specs
- productos relacionados

### Fase 4. Operacion comercial

Objetivo:

- hacer mantenible la publicacion desde Metrik

Entregables:

- toggle `publicar en web`
- toggle `destacado`
- orden manual
- vista previa interna


## Criterios de exito del MVP

- Kensar puede tener miles de productos en Metrik.
- Solo una parte aparece en la web.
- Precio, imagen y categoria vienen desde Metrik.
- El stock mostrado no depende de data duplicada.
- La web no necesita editar productos.
- El catalogo se puede ampliar sin rediseñar la arquitectura.


## Recomendacion final

La mejor implementacion es:

1. agregar metadata de publicacion web al modelo `Product` de Metrik
2. crear un router `web_catalog` publico y delgado
3. conectar `kensar_web` a esa API con Server Components
4. usar la web como vitrina conectada a operacion real, no como sistema de gestion

Esto deja una arquitectura coherente con Kensar y evita tanto la doble base de datos como el acoplamiento directo a endpoints internos de gestion.
