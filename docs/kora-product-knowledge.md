# Conocimiento de productos de KORA

KORA construye cada perfil en dos capas:

1. **Catálogo oficial:** nombre, categoría, descripciones y especificaciones del endpoint de detalle de Metrik.
2. **Enriquecimiento curado por SKU:** hechos que no existen en el catálogo, respaldados por una fuente verificable.

La segunda capa vive en `app/lib/kora/product-knowledge-enrichments.ts`. Solo los registros con `status: "approved"` se aplican en conversaciones y recomendaciones. Los registros `draft` nunca afectan producción.

## Flujo para enriquecer un producto

1. Ejecutar `npm run kora:knowledge:audit -- --base-url=https://api.metrikpos.com`.
2. Revisar la cola priorizada en `reports/kora-knowledge/`.
3. Confirmar el producto por SKU, ID y slug.
4. Buscar una fuente primaria: ficha del fabricante, manual oficial o revisión humana documentada.
5. Crear primero el registro como `draft` y completar:
   - `record_id` único.
   - `product_key`, preferiblemente con SKU, ID y slug.
   - revisor y fecha ISO `YYYY-MM-DD`.
   - una o más URLs HTTPS en `source_references`.
   - clasificación y hechos estrictamente respaldados por esas fuentes.
6. Cambiar a `approved` únicamente después de revisar que no haya variantes del mismo modelo con especificaciones diferentes.
7. Ejecutar `npm run kora:enrichments:test`, `npm run kora:knowledge:test` y nuevamente la auditoría de producción.

## Reglas de calidad

- No inferir materiales, potencia, compatibilidad o autonomía a partir de fotografías o nombres de modelo.
- Registrar limitaciones y requisitos, no solo beneficios comerciales.
- No copiar automáticamente datos de un modelo parecido.
- Si la versión exacta no está confirmada, conservar el campo sin resolver.
- Usar valores normalizados y estables, por ejemplo `audio_bidireccional` o `recarga_usb_c`.
- Cada hecho debe incluir evidencia breve y una confianza entre `0` y `1`.
- Si dos registros aprobados comparten SKU, ID o slug, la validación falla.

## Qué consume KORA

El recomendador consulta primero las tarjetas del catálogo y luego intenta cargar las fichas de detalle de los candidatos relevantes. La espera de enriquecimiento tiene un límite de 2,5 segundos; si el detalle no responde, KORA continúa con el conocimiento seguro disponible en vez de bloquear el chat.

Los perfiles con contradicciones de subtipo o conflictos entre identidad y categoría quedan excluidos de recomendaciones hasta ser corregidos o revisados.
