# KORA Fase 2A - Recomendador básico con catálogo real

Se añadió una capa incremental para traer opciones reales del catálogo sin romper el flujo existente:

- `app/lib/kora/query-normalizer.ts`
- `app/lib/kora/recommender.ts`
- Integración en `app/api/kora/ask/route.ts`

## Flujo
1. NLU detecta intención.
2. Si intención es de producto (`product_search`, `product_recommendation`, `cheap_options`, `premium_options`), se intenta recomendador.
3. Si hay opciones, responde con acciones tipo `link` al producto.
4. Si no hay opciones claras, fallback específico (no genérico).
5. Si el recomendador no aplica, sigue flujo actual (response-router + reglas legacy).

## Casos objetivo
- quisiera una guitarra
- busco una cabina barata
- qué speakers tienes
- algo que suene duro
- qué piano me recomiendas
- microfono inalambrico
- cámara de seguridad
- reflector solar
- cable hdmi
- cable rca
- xlr
