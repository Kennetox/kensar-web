# KORA Fase 2B.5 - Memoria real + validación de ranking

## Memoria conversacional nueva
KORA ahora guarda en sesión:
- `last_recommended_products` (máximo 5, payload liviano)
- `last_recommendation_query`
- `last_recommendation_category`
- `last_recommendation_attributes`
- `last_usage_context`
- `last_recommendation_type`

## Prueba manual multi-turn recomendada

1) `quiero una cabina para fiesta`  
Esperado: recomendaciones de sonido/cabinas y memoria de recomendación actualizada.

2) `más barata`  
Esperado: usa contexto previo, prioriza precio menor y evita repetir exactamente el top anterior cuando hay opciones.

3) `qué piano me recomiendas`  
Esperado: recomendaciones orientadas a teclados/instrumentos.

4) `otro parecido`  
Esperado: usa última recomendación y devuelve alternativas similares sin repetir top cuando sea posible.

5) `quiero microfono inalambrico`  
Esperado: alias a bluetooth + microfono, recomendaciones relacionadas.

6) `más económico`  
Esperado: reordena por precio dentro del mismo contexto.

7) `algo que suene duro`  
Esperado: enfoque potencia/cabinas.

8) `más potente`  
Esperado: usa contexto y prioriza tokens de potencia (`12`, `15`, `watts`, `rms`, `activa`, `subwoofer`).

9) `guitarra para empezar`  
Esperado: instrumentos de cuerda con sesgo de entrada.

10) `una mejor`  
Esperado: follow-up de premium relativo al contexto anterior.

## Debug interno
Respuesta backend puede incluir `recommendation_debug` con:
- `normalized_query`
- `applied_aliases`
- `expanded_queries`
- `selected_category_paths`
- `product_scores` resumidos

No se renderiza en UI.
