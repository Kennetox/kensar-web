# KORA 3B - Runtime Validation Report

Fuente: llamadas reales a `http://127.0.0.1:3001/api/kora/ask`

## 1) Attribute Knowledge (20 prompts)
| # | Prompt | Resolver observado | Match observado | Resultado | Evidencia |
|---|---|---|---|---|---|
| 1 | qué significa bluetooth | contextual-selling (attribute_explanation) | attr:bluetooth | PASA | Bluetooth: Bluetooth permite conectar el celular, tablet u otro dispositivo sin cables para reproducir música o audio. E |
| 2 | qué significa FM | contextual-selling (attribute_explanation) | attr:fm | PASA | Radio FM: FM permite sintonizar emisoras sin conectar el celular. Útil para negocio, casa o taller donde escuchan radio  |
| 3 | qué es entrada auxiliar | contextual-selling (attribute_explanation) | attr:auxiliar | PASA | Entrada auxiliar: La entrada auxiliar conecta audio por cable desde celular, PC u otro equipo. Conexión estable y sencil |
| 4 | qué es una cabina activa | recommender/router | - | FALLA | Te muestro algunas opciones relacionadas con tu búsqueda que tenemos publicadas. Referencias: relacionada con la categor |
| 5 | diferencia entre activa y pasiva | contextual-selling (attribute_explanation) | attr:cabina_activa | PASA | Cabina activa: La cabina activa ya trae amplificador interno, así que no necesita planta aparte para funcionar. Es más f |
| 6 | qué son las pulgadas de una cabina | recommender/router | - | FALLA | Te muestro algunas opciones relacionadas con tu búsqueda que tenemos publicadas. Referencias: relacionada con la categor |
| 7 | qué es potencia | contextual-selling (attribute_explanation) | attr:potencia | PASA | Potencia: La potencia influye en cuánto volumen y energía de sonido entrega el equipo. Permite orientar si alcanza para  |
| 8 | quiero algo con buen bajo | recommender/router | - | FALLA | Busqué opciones relacionadas con cabinas activas, potencia y buen bajo. Si me dices si es para casa, fiesta o negocio, p |
| 9 | qué micrófono me sirve para cantar | fallback/otro | - | FALLA | No estoy segura de qué producto buscas. ¿Quieres que te ayude con sonido, instrumentos, cámaras, cables o formas de pago |
| 10 | diferencia entre micrófono alámbrico e inalámbrico | contextual-selling (attribute_explanation) | attr:microfono_alambrico, cat:microfonos | PASA | Micrófono alámbrico: El micrófono alámbrico se conecta por cable a cabina, consola o amplificador. Es estable, confiable |
| 11 | diferencia entre micrófono sencillo y doble | contextual-selling (attribute_explanation) | attr:microfono_sencillo, cat:microfonos | PASA | Micrófono sencillo: Incluye una sola unidad para una persona. Más económico cuando solo participa una persona a la vez.  |
| 12 | qué es un amplificador | contextual-selling (attribute_explanation) | attr:amplificador | PASA | Amplificador: Un amplificador da potencia a parlantes o cabinas pasivas. Necesario para sistemas pasivos y montajes de m |
| 13 | para qué sirve una consola | contextual-selling (attribute_explanation) | attr:consola | PASA | Consola de sonido: La consola permite conectar y controlar varias fuentes de audio. Da control de volúmenes y mezcla par |
| 14 | qué diferencia hay entre cámara WiFi y DVR | fallback/otro | - | FALLA | No estoy segura de qué producto buscas. ¿Quieres que te ayude con sonido, instrumentos, cámaras, cables o formas de pago |
| 15 | qué significa visión nocturna | contextual-selling (attribute_explanation) | attr:vision_nocturna | PASA | Visión nocturna: Permite a la cámara capturar imagen en poca luz u oscuridad. Clave para vigilancia nocturna real. Si ne |
| 16 | qué es microSD | contextual-selling (attribute_explanation) | attr:micro_sd, cat:microfonos | PASA | MicroSD: MicroSD es una memoria pequeña para guardar videos o archivos en equipos compatibles. En cámaras WiFi permite g |
| 17 | cómo elijo un televisor | contextual-selling (category_guidance) | cat:televisores | PASA | Para elegir televisor importan pulgadas, si es Smart TV, resolución y lugar de uso. Para elegir bien, te recomiendo revi |
| 18 | qué guitarra sirve para principiante | recommender/router | - | FALLA | Te muestro algunas opciones relacionadas con guitarras que tenemos publicadas. Referencias: relacionada con la categoría |
| 19 | qué teclado sirve para aprender | fallback/otro | - | FALLA | No estoy segura de qué producto buscas. ¿Quieres que te ayude con sonido, instrumentos, cámaras, cables o formas de pago |
| 20 | qué cable necesito | contextual-selling (compatibility_question) | cat:cables | PASA | Para decirte compatibilidad exacta, necesito saber qué equipo quieres conectar con cuál. Por ejemplo: celular a cabina,  |

## 2) Category Guidance (7 prompts)
| Prompt | Resolver observado | Match | Resultado | Evidencia |
|---|---|---|---|---|
| necesito sonido para iglesia | fallback | - | FALLA | No estoy segura de qué producto buscas. ¿Quieres que te ayude con sonido, instrumentos, cámaras, cables o formas de pago? |
| quiero algo para fiesta | recommender/router | - | FALLA | Te muestro algunas opciones relacionadas con tu búsqueda que tenemos publicadas. Referencias: buena opción por precio. |
| no sé cuál comprar | fallback | - | FALLA | Tranquilo, te lo explico fácil. No estoy segura de qué producto buscas. ¿Quieres que te ayude con sonido, instrumentos, cámaras, c |
| cuál me recomiendas | recommender/router | - | FALLA | Te muestro algunas opciones relacionadas con tu búsqueda que tenemos publicadas. Referencias: buena opción por precio. |
| ayúdame a escoger | fallback | - | FALLA | Tranquilo, te lo explico fácil. No estoy segura de qué producto buscas. ¿Quieres que te ayude con sonido, instrumentos, cámaras, c |
| quiero algo para karaoke | recommender/router | - | FALLA | Te muestro algunas opciones relacionadas con tu búsqueda que tenemos publicadas. Referencias: buena opción por precio. |
| quiero algo para negocio | recommender/router | - | FALLA | Te muestro algunas opciones relacionadas con tu búsqueda que tenemos publicadas. Referencias: buena opción por precio. Lo enfocamo |

## 3) Product Page Context (6 prompts)
| Prompt | guidance detectado | Resultado | Evidencia |
|---|---|---|---|
| este me sirve para negocio | product_advice | PASA | Para negocio, Cabina 12 Pro Max de la marca NIA puede servir según el tamaño del espacio y el nivel de exigencia. En Audio profesional convi |
| este me sirve para fiesta | product_advice | PASA | Para fiesta, Cabina 12 Pro Max de la marca NIA puede servir según el tamaño del espacio y el nivel de exigencia. En Audio profesional convie |
| qué tiene de bueno este producto | - | FALLA | No encontré opciones claras con esa búsqueda, pero puedo ayudarte a revisar el catálogo o pasarte con un asesor. |
| qué más necesito con esto | product_advice | PASA | Para completar Cabina 12 Pro Max, normalmente se revisa conectividad y accesorios según el uso: cables adecuados, soporte/base y, si aplica, |
| me conviene | product_advice | PASA | Cabina 12 Pro Max de la marca NIA puede ser buena opción si buscas algo de Audio profesional alineado con un uso concreto. Lo importante es  |
| por qué vale más | product_advice | PASA | Por lo que veo en la ficha, Cabina 12 Pro Max de la marca NIA puede ser buena opción dependiendo del uso. En Audio profesional conviene vali |

## 4) Category Opening Message (5 categorías, 2 turnos)
| Categoría | Turno 1 | Turno 2 | Resultado |
|---|---|---|---|
| cabinas | sin opening | sin opening | FALLA |
| camaras | sin opening | sin opening | FALLA |
| microfonos | sin opening | sin opening | FALLA |
| televisores | sin opening | sin opening | FALLA |
| guitarras | sin opening | sin opening | FALLA |

## 5) Routing guardrails (support/business)
| Prompt | intent final | ¿Interceptado por contextual-selling? | Resultado | Evidencia |
|---|---|---|---|---|
| qué métodos de pago tienen | payments | No | PASA | Sí, te ayudo con pagos. Manejamos varios medios, incluyendo opciones digitales y financiación. |
| cómo funciona la garantía | warranty_policy | No | PASA | La política de garantía está publicada en nuestro sitio. Si me compartes el producto o SKU, te orientamos paso a paso. |
| cómo funcionan los envíos | shipping | No | PASA | Claro. Te explico envíos: despachamos a diferentes ciudades y el tiempo depende de destino y disponibilidad. |
| qué horario manejan | business_hours | No | PASA | Nuestros horarios son: Lunes a viernes: 8:30 a.m. - 6:00 p.m. Sábados: 8:30 a.m. - 2:00 p.m. Domingos: confirmar disponi |
| dónde están ubicados | business_location | No | PASA | Estamos ubicados en Palmira, Valle del Cauca, en la Cra 24 #30-75. |
| cuál es el whatsapp | advisor | No | PASA | Perfecto, te conecto con un asesor para ayudarte en tiempo real. |

## 6) Memory multi-turn (4 turnos)
| Turno | Prompt | intent | Memoria observada | Resultado | Evidencia |
|---|---|---|---|---|---|
| 1 | quiero una cabina para fiesta | products | cat:audio-profesional attrs: usage:fiesta_evento | PARCIAL | Te muestro algunas opciones relacionadas con tu búsqueda que tenemos publicadas. Referencias: relacionada con la categor |
| 2 | que tenga bluetooth | unknown | cat:audio-profesional attrs: usage:fiesta_evento | FALLA | No estoy segura de qué producto buscas. ¿Quieres que te ayude con sonido, instrumentos, cámaras, cables o formas de pago |
| 3 | y algo más potente | products | cat:cabinas attrs:high_output_bass usage:- | PARCIAL | Te muestro opciones más orientadas a calidad/profesional, según nombre, categoría y descripción. Referencias: buena opci |
| 4 | pero recargable | unknown | cat:cabinas attrs:high_output_bass usage:- | FALLA | No estoy segura de qué producto buscas. ¿Quieres que te ayude con sonido, instrumentos, cámaras, cables o formas de pago |

## Problemas detectados (reales)
- `qué es una cabina activa` se fue a recomendador en vez de explicación de atributo.
- `qué son las pulgadas de una cabina` también se fue a recomendador.
- `qué micrófono me sirve para cantar` cayó en fallback.
- `qué diferencia hay entre cámara WiFi y DVR` cayó en fallback.
- `qué teclado sirve para aprender` cayó en fallback.
- Category guidance genérico falla en prompts sin categoría explícita (`no sé cuál comprar`, `ayúdame a escoger`).
- Category opening messages no se activan en saludo (`hola`) con pageContext por orden de routing actual.
- En memory multi-turn, `que tenga bluetooth` y `pero recargable` pierden contexto y caen a fallback.
- `cuál es el whatsapp` resuelve como `advisor` y no como `business_contact`.

## Mejoras prioritarias (sin expansión de arquitectura)
1. Priorizar `contextual-selling.attribute_explanation` antes de recommender cuando query comience por “qué es/qué significa/para qué sirve/diferencia entre”.
2. Añadir matcher compuesto para diferencias duales (inalámbrico vs alámbrico, sencillo vs doble, WiFi vs DVR).
3. En category guidance ambiguo, usar `pageContext`/`last_recommendation_category` para evitar fallback.
4. Mover category opening message para que aplique también en primer saludo contextual.
5. En follow-ups de producto, mapear atributos sueltos (`bluetooth`, `recargable`) al contexto previo en memoria.
6. Ajustar prioridad de intent para que “cuál es el whatsapp” responda contacto directo, no advisor genérico.

## Detectores débiles observados
- `product_advice`: “qué tiene de bueno este producto” no activó consistentemente.
- `category_guidance`: frases abiertas sin categoría explícita (`no sé cuál comprar`, `ayúdame a escoger`) no se rescatan.
- `attribute_explanation`: colisiona con recommender cuando la frase contiene categoría fuerte (`cabina`, `teclado`).

## Prompts ambiguos identificados
- `cuál me recomiendas`
- `no sé cuál comprar`
- `ayúdame a escoger`
- `me conviene` (sin pageContext es ambiguo)

## Respuestas demasiado genéricas observadas
- “Te muestro algunas opciones relacionadas…” en preguntas educativas donde debía explicar atributo.
- Fallback “No estoy segura de qué producto buscas…” en prompts comerciales válidos.

## Knowledge entries con baja activación en esta corrida
- `teclado_principiante`
- `dvr` + `camara_wifi` en diferencia dual
- `microfono_inalambrico` y `microfono_doble` como respuesta primaria en prompts de diferencia