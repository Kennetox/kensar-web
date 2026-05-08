# KORA Fase 2F.2 - Validación de conversación completa

Fecha: 2026-05-08
Objetivo: validar comportamiento multi-turn real sin agregar features nuevas.

## Alcance validado
- Flujo 1: Producto + follow-up
- Flujo 2: Envíos + follow-up
- Flujo 3: Pagos + follow-up
- Flujo 4: Garantía + follow-up
- Flujo 5: Cambio de tema (shipping -> producto)
- Verificación de debug en producción
- Verificación de privacidad de memoria en UI
- Verificación de “no quedar atrapado” en tema previo

## Resultado por flujo

### 1) Producto + follow-up
Caso:
- "quiero una cabina para fiesta"
- "más barata"
- "otra parecida"
- "háblame por WhatsApp"

Estado: **Correcto (con ajuste mínimo aplicado)**
- Producto inicial: entra a recommender y devuelve opciones reales.
- "más barata": ahora reconocido de forma robusta (incluye femenino "barata").
- "otra parecida": utiliza memoria de recomendación previa.
- "háblame por WhatsApp": enruta correctamente a advisor.

Corrección mínima aplicada:
- Se añadió soporte explícito para "barata / más barata" en:
  - `app/lib/kora/entities.ts`
  - `app/lib/kora/intents.ts`

### 2) Envíos + follow-up
Caso:
- "cómo funcionan los envíos"
- "envían a mi ciudad"
- "cuánto tarda"
- "tiene costo"

Estado: **Correcto**
- Con Fase 2F.1, follow-ups cortos/ambiguos se resuelven por contexto `shipping`.
- Respuestas contextualizadas sin caer al fallback genérico.

### 3) Pagos + follow-up
Caso:
- "qué métodos de pago tienen"
- "reciben nequi"
- "puedo pagar en cuotas"
- "aceptan transferencia"

Estado: **Correcto**
- Intención `payments` estable.
- Follow-ups ambiguos sobre pagos se mantienen en el mismo dominio por memoria contextual.

### 4) Garantía + follow-up
Caso:
- "cómo funciona la garantía"
- "y si se daña"
- "cuánto cubre"
- "cómo reclamo"

Estado: **Correcto**
- Se conserva contexto `warranty` y responde dentro del dominio.
- No cae al fallback cuando hay continuidad temática.

### 5) Cambio de tema
Caso:
- "cómo funcionan los envíos"
- "quiero una guitarra"

Estado: **Correcto**
- Sale correctamente de contexto `shipping`.
- Entra a flujo de producto/recomendación.

## Verificaciones de seguridad/comportamiento

### recommendation_debug / nlu_debug en producción
Estado: **Correcto**
- En `route.ts`, ambos campos se incluyen solo con `NODE_ENV !== "production"`.

### Memoria visible al usuario
Estado: **Correcto**
- `memory_updates` / `memory_patch` se usan internamente en frontend.
- No se renderizan como texto en mensajes del chat.

### Chat atrapado en tema anterior
Estado: **Correcto con guardrails**
- Reutiliza contexto solo si el follow-up es corto/ambiguo.
- Si detecta intención nueva fuerte (producto/pagos/shipping/etc.) cambia de dominio.

## Fallos encontrados

### Alta severidad
- No se encontró fallo alto en estos 5 flujos objetivo.

### Media severidad
1. Dependencia de calidad del catálogo para ranking comercial fino (premium/profesional) en ciertos productos.
2. Follow-ups extremadamente ambiguos fuera del vocabulario actual pueden requerir un prompt de rescate adicional.

### Baja severidad
1. Tono/estilo de algunas respuestas de soporte podría personalizarse más por canal o ciudad.
2. Alias regionales adicionales podrían mejorar hit-rate en escritura informal.

## Correcciones mínimas aplicadas
1. Alias de "barata / más barata" añadidos en NLU:
- `app/lib/kora/entities.ts`
- `app/lib/kora/intents.ts`

No se hicieron cambios de UI, cards, recommender core ni features nuevas.

## Conclusión
KORA queda **lista para piloto real controlado**.

Recomendación de despliegue:
1. Activar piloto con monitoreo diario de conversaciones.
2. Registrar frases que terminen en fallback para cerrar aliases faltantes.
3. Revisión rápida semanal de top fallos semánticos antes de abrir tráfico total.
