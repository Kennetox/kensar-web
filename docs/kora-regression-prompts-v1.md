# Kora Regression Prompts v1 (Kensar Web)

Fecha: 8 de mayo de 2026

## Objetivo
Validar regresión funcional mínima de Kora web en:
- intención base
- matching de producto
- desambiguación
- follow-ups con memoria

## Matriz rápida (ejecutar manualmente)

1. Prompt: `hola`
Esperado: intent `menu`, saludo claro, sin fallback.

2. Prompt: `quiero audio para negocio`
Esperado: intent `products`, sugiere productos/categoría audio, guarda preferencia de categoría.

3. Prompt: `muéstrame opciones hasta 300 mil`
Esperado: intent `products`, resultados filtrados por presupuesto si hay coincidencias.

4. Prompt: `busca yamaha`
Esperado: intent `products`, ranking prioriza productos con marca/nombre coincidente.

5. Prompt: `quiero un microfono`
Esperado: intent `products`, si hay empate alto entre varias referencias: respuesta de desambiguación.

6. Prompt: `dame una opción más económica`
Esperado: intent `products`, usa memoria de producto/categoría previa.

7. Prompt: `muéstrame algo similar`
Esperado: intent `products`, usa memoria y responde con alternativas relacionadas.

8. Prompt: `que opinas de este producto` (desde `/catalogo/[slug]`)
Esperado: intent `products`, respuesta contextual del producto actual con estado/precio.

9. Prompt: `agrega este producto al carrito` (desde `/catalogo/[slug]`)
Esperado: acción `add_to_cart` cuando aplique; si no aplica, sugiere alternativa.

10. Prompt: `metodos de pago`
Esperado: intent `payments`, respuesta operativa sin fallback.

11. Prompt: `como funciona la garantia`
Esperado: intent `warranty`, guía y acción a políticas/soporte.

12. Prompt: `envian a mi ciudad`
Esperado: intent `shipping`, respuesta de envíos y siguiente acción.

13. Prompt: `quiero hablar con asesor`
Esperado: intent `advisor`, acción WhatsApp.

14. Prompt: `blablabla cosa rara`
Esperado: intent `unknown`, fallback controlado con menú/sugerencias.

15. Prompt: `otro`
Esperado: si hay memoria de contexto reciente: follow-up de producto; si no, aclaración/fallback guiado.

## Telemetría mínima a revisar por cada caso
- evento `intent_detected`
- `handled`
- `confidence_score`
- `resolution_kind` (`direct`, `disambiguation`, `fallback`)

## Criterio de salida mínimo v1
- 12/15 casos con `handled=true`
- 0 respuestas vacías
- 0 errores de runtime en `/api/kora/ask`
