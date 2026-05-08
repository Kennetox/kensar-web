# KORA 3B - Runtime Validation (Prod-backed Catalog)

Endpoint probado: `http://127.0.0.1:3001/api/kora/ask` con `METRIK_API_BASE_URL=https://api.metrikpos.com`.

## Resumen
- Attribute knowledge: 13/20 PASA
- Category guidance: 0/7 PASA (4 parciales)
- Product page context: 5/6 PASA
- Category opening messages: 0/5 PASA
- Routing business/support: 6/6 PASA
- Multi-turn memory (producto): 2 parciales, 2 fallas

## Evidencia puntual
- qué significa bluetooth => intent:products, guidance:attribute_explanation, attr:bluetooth | Bluetooth: Bluetooth permite conectar el celular, tablet u otro dispositivo sin cables para reproducir música o audio. Es ideal si quieres p
- qué significa FM => intent:products, guidance:attribute_explanation, attr:fm | Radio FM: FM permite sintonizar emisoras sin conectar el celular. Útil para negocio, casa o taller donde escuchan radio a diario. Si quiere 
- qué es entrada auxiliar => intent:products, guidance:attribute_explanation, attr:auxiliar | Entrada auxiliar: La entrada auxiliar conecta audio por cable desde celular, PC u otro equipo. Conexión estable y sencilla sin depender de B
- qué es una cabina activa => intent:products, guidance:-, attr:- | Te muestro algunas opciones relacionadas con tu búsqueda que tenemos publicadas. Referencias: relacionada con la categoría que pediste, buen
- diferencia entre activa y pasiva => intent:products, guidance:attribute_explanation, attr:cabina_activa | Cabina activa: La cabina activa ya trae amplificador interno, así que no necesita planta aparte para funcionar. Es más fácil de instalar y u
- qué son las pulgadas de una cabina => intent:products, guidance:-, attr:- | Te muestro algunas opciones relacionadas con tu búsqueda que tenemos publicadas. Referencias: relacionada con la categoría que pediste, buen

## Fallos críticos observados
- Preguntas educativas con categoría fuerte siguen yéndose al recomendador (`qué es una cabina activa`, `qué son las pulgadas de una cabina`).
- Prompts comerciales válidos caen en fallback (`qué micrófono me sirve para cantar`, `qué teclado sirve para aprender`, `diferencia cámara WiFi y DVR`).
- Apertura contextual por categoría no aparece en saludo (no dispara `Veo que estás mirando ...`).
- Follow-ups de atributo en multi-turn (`que tenga bluetooth`, `pero recargable`) pierden contexto.

## Conclusión
Con catálogo real, los resultados son esencialmente iguales a dev en la parte conversacional. El principal problema no es contenido del catálogo: es prioridad/routing entre contextual-selling y recommender/fallback.