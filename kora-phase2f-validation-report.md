# KORA Fase 2F - Validation Report (Pre-Production)

Fecha: 2026-05-08
Alcance: validación manual/funcional sobre Fases 2A-2E usando banco `kora-phase2d-real-prompts.md`.

## Método
- Revisión manual de flujo completo en:
  - `app/api/kora/ask/route.ts`
  - `app/lib/kora/entities.ts`
  - `app/lib/kora/query-normalizer.ts`
  - `app/lib/kora/recommender.ts`
  - `app/components/KoraChat.tsx`
- Evaluación de prompts críticos + cobertura por grupos del banco 2D.
- Clasificación de hallazgos por severidad: Alta / Media / Baja.

## Estado general
- KORA está funcional para pruebas controladas con usuarios reales.
- La arquitectura actual ya cubre: NLU básica, routing de intención, recomendaciones reales, memoria multi-turn y cards.
- Persisten riesgos de calidad comercial en algunos edge cases (sobre todo follow-ups sin contexto claro, aliases no cubiertos y mezcla de fallback clásico vs. router nuevo).

## Resultado por áreas

### 1) Prompts que funcionan bien
- "con qué puedes ayudarme"
  - Responde comercial y amplia capacidades (mejora de Fase 2E aplicada).
- "quiero una guitarra"
  - Activa flujo producto y busca catálogo real.
- "guitarra para empezar"
  - Detecta intención + contexto `principiante`; ranking favorece opciones de entrada.
- "qué piano me recomiendas"
  - Normaliza a teclado/piano y retorna recomendaciones.
- "quiero una cabina barata"
  - Detecta `cheap` y ordena por precio cuando hay datos.
- "algo que suene duro"
  - Detecta `high_output_bass`; aplica scoring por potencia.
- "micrófono inalámbrico"
  - Normaliza tildes y alias a bluetooth/inalámbrico.
- "cámara de seguridad"
  - Mapea a seguridad/cámaras.
- "cable hdmi"
  - Mapeo específico de categoría/subcategoría.
- "cómo son los envíos"
- "cómo funciona la garantía"
- "reciben nequi"
  - Flujos no-producto cubiertos por intents de payments/shipping/warranty.

### 2) Prompts con comportamiento parcial o frágil
- "más barato" / "otro parecido" (sin contexto previo)
  - Puede caer en pregunta guiada correcta, pero depende de memoria disponible.
- "algo que suene duro para negocio"
  - Entiende intención, pero el ranking puede mezclar resultados si descripción de catálogo es pobre.
- "guitarra" + follow-up "una mejor"
  - `premium` no siempre sólido por falta de metadatos fiables (brand/long_description incompletos).

## Hallazgos detallados

### Alta severidad
1. Inconsistencia potencial entre fallback de route y fallback de recommender en ciertos bordes.
- Impacto: respuestas diferentes para casos similares; puede confundir.
- Evidencia: coexistencia de `resolveProductsResponse` clásico y recommender avanzado.

2. Dependencia de `slug` para URLs de cards/actions.
- Se mitigó en cards con fallback a `/catalogo`, pero aún puede degradar navegación específica si backend trae slug vacío.
- Impacto: pérdida de precisión de destino.

3. Recomendaciones pueden degradarse fuerte si API de catálogo falla momentáneamente.
- Impacto: caída a fallback con baja utilidad comercial si hay intermitencia de catálogo.

### Media severidad
4. Follow-up "más barato" puede repetir productos si el universo de resultados es corto.
- Existe penalización de repetición, pero no garantiza diversidad en catálogos pequeños.

5. Exclusión de accesorios mejoró, pero en algunas consultas ambiguas aún podrían aparecer alto.
- Especialmente en búsquedas de instrumentos si el catálogo tiene muchos accesorios etiquetados similar.

6. Heurística `premium` limitada por calidad de datos de catálogo.
- Si `brand`/`long_description` faltan, premium queda cerca de "precio alto".

7. Ambigüedad en prompts muy generales ("algo bueno", "algo fino").
- Respuesta puede ser correcta pero no siempre conduce rápido a conversión.

8. Alias cubren bastantes errores, pero aún no todos los typo reales colombianos.
- Riesgo moderado en escritura muy informal.

### Baja severidad
9. Tono de algunas respuestas fallback aún suena "plantilla" en cadenas largas.

10. Algunas sugerencias podrían ser más contextuales por vertical (audio vs seguridad) cuando ya hay señal parcial.

## Problemas específicos solicitados

### Problemas de cards
- Estado actual: estable.
- Cobertura:
  - Si falta imagen o falla URL -> placeholder.
  - Si falta precio -> "Precio a consultar".
  - Si falta slug -> URL fallback `/catalogo`.
- Riesgo residual: cards con contenido poco útil si `name` viene ruidoso desde catálogo.

### Problemas de memoria/follow-up
- Estado actual: funcional con `memory_patch`.
- Riesgo residual:
  - Si usuario entra directo con "más barato" sin contexto, depende de guided fallback (comportamiento esperado).
  - En sesiones largas, no hay resumen semántico avanzado (normal en esta fase).

### Problemas de links
- Estado actual: sin fallo crítico evidente en código.
- Riesgo residual:
  - Links a producto dependen de slug válido del catálogo.

### Problemas de pagos/envíos/garantías
- Estado actual: cubiertos por intents y respuestas directas.
- Riesgo residual:
  - No hay profundidad por ciudad/costo exacto en tiempo real (respuestas informativas, no cotizador logístico).

## Checklist final (resumen)
- [x] Intención correcta en la mayoría de prompts comerciales clave.
- [x] Categoría detectada para dominios principales (cabinas, instrumentos, cámaras, cables).
- [x] Producto real cuando aplica (vía recommender).
- [x] Sin debug en producción (`recommendation_debug`/`nlu_debug` gated).
- [x] Cards tolerantes a datos incompletos.
- [~] Follow-ups correctos en mayoría, con riesgos en contexto débil.
- [~] Ranking comercial bueno, todavía sensible a calidad del catálogo.

## Top 10 fallos a corregir (priorizados)
1. Unificar completamente fallback clásico y fallback recommender para evitar respuestas divergentes.
2. Fortalecer manejo de follow-up sin contexto (rescate más corto + opciones rápidas).
3. Aumentar diversidad forzada en follow-ups para no repetir items en catálogos pequeños.
4. Penalizar aún más accesorios cuando query sea explícitamente de producto principal.
5. Mejorar detección de "premium" sin depender tanto de precio.
6. Añadir más aliases de errores reales recolectados en producción.
7. Añadir guardas para nombres de producto demasiado genéricos/ruidosos en top resultados.
8. Refinar prompts ambiguos con una sola pregunta de clarificación más directa.
9. Añadir telemetría ligera por intent/fallback (para priorizar correcciones con datos reales).
10. Validar enlaces de producto con slug no estándar (sanitización/fallback adicional).

## Cambios mínimos recomendados antes de abrir más tráfico
1. Resolver punto 1 (unificación fallback).
2. Aplicar tuning de puntos 3 y 4 (diversidad + anti-accesorios).
3. Cerrar 10-20 aliases extras con datos de chats reales.
4. Ejecutar una ronda QA manual multi-turn completa con 30 conversaciones encadenadas.

## Qué dejar para versión futura
- Re-ranking más avanzado con señales comportamentales (clics/CTR).
- Catálogo enriquecido (specs, stock confiable, atributos estructurados).
- Explicaciones más personalizadas por vertical (audio/seguridad/instrumentos).
- Comparador semiestructurado (sin rediseño grande, pero con lógica más profunda).
