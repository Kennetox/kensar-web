# KORA Fase 1 - NLU estructurada (sin IA libre)

Archivos clave:
- `app/lib/kora/intents.ts`
- `app/lib/kora/entities.ts`
- `app/lib/kora/response-router.ts`
- `app/lib/kora/nlu-samples.ts`
- `app/api/kora/ask/route.ts`

## Estructura NLU devuelta
`extractKoraEntities(input)` retorna:
- `normalized_text`
- `intent`
- `category`
- `attributes[]`
- `usage_context`
- `budget`
- `followup_type`
- `confidence`
- `matched_aliases[]`

## Banco de frases (local)
Utilidad: `runKoraNluSamples()` en `app/lib/kora/nlu-samples.ts`

Frases:
- quiero una cabina
- busco una cabina barata
- algo que suene duro
- necesito sonido para iglesia
- qué piano me recomiendas
- tienen guitarras económicas
- cómo son las garantías
- reciben nequi?
- más barato
- otro parecido
- quiero algo para empezar

## Integración incremental
`/api/kora/ask` ahora calcula NLU al inicio y pasa por `response-router` antes del flujo legacy.
Si NLU no supera umbral o no aplica plantilla, el flujo actual sigue igual (fallback seguro).
