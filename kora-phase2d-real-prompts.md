# KORA Fase 2D - Banco real de pruebas manuales

## Objetivo
Validar estabilidad comercial antes de nuevas features: intención, categoría, recomendaciones reales, contexto multi-turn, y seguridad de respuesta en producción.

## Checklist de validación por grupo
Para cada prompt, validar:
- [ ] Detecta intención correcta.
- [ ] Detecta categoría correcta cuando aplique.
- [ ] Devuelve productos reales cuando aplica.
- [ ] Evita fallback genérico si sí entendió.
- [ ] No prioriza accesorios si se pidió producto principal (guitarra, piano, cabina, micrófono).
- [ ] Follow-up mantiene contexto (más barato / más potente / otro parecido).
- [ ] `recommendation_debug` y `nlu_debug` no aparecen en producción.
- [ ] `product_cards` no rompe si falta imagen/precio/marca/slug.
- [ ] Links de catálogo/WhatsApp responden correctamente.

## 1) Búsqueda simple (10)
1. quiero una guitarra
2. busco guitarras
3. qué cabinas tienes
4. quiero una cabina
5. me muestras teclados
6. necesito un microfono
7. tienes cámaras
8. quiero un televisor
9. necesito un cable hdmi
10. muéstrame reflectores solares

## 2) Recomendación (10)
1. qué guitarra me recomiendas
2. recomiéndame una cabina para casa
3. cuál microfono recomiendas para cantar
4. qué piano recomiendas para empezar
5. recomiéndame cámaras para negocio
6. cuál televisor me recomiendas
7. recomiéndame un cable xlr bueno
8. qué parlante recomiendas
9. recomiéndame algo para sonido
10. qué opción me recomiendas para iglesia

## 3) Económico / barato (10)
1. quiero una cabina barata
2. dame guitarras económicas
3. necesito un microfono no tan caro
4. cuál piano es más económico
5. muéstrame cámaras baratas
6. algo bueno y barato en sonido
7. televisor económico
8. cable hdmi barato
9. necesito algo baratico para empezar
10. dame lo más barato que tengas en cabinas

## 4) Profesional / calidad (8)
1. quiero una cabina profesional
2. muéstrame guitarras finas
3. necesito un microfono de calidad
4. qué teclado profesional tienes
5. algo premium en sonido
6. cámaras de seguridad profesionales
7. televisor de buena calidad
8. quiero algo pro para iglesia

## 5) Potencia / sonido duro (10)
1. algo que suene duro
2. quiero una cabina potente
3. con buen bajo
4. necesito bajo potente para fiesta
5. parlante con buena potencia
6. algo con bastante watts
7. quiero una 15 activa
8. subwoofer potente
9. sonido duro para evento
10. necesito algo que retumbe

## 6) Instrumentos para empezar (8)
1. guitarra para empezar
2. piano para aprender
3. teclado para principiante
4. instrumento para inicio
5. quiero aprender guitarra
6. algo para clases de música
7. necesito algo básico para practicar
8. primera guitarra económica

## 7) Micrófonos (8)
1. microfono inalambrico
2. micrófono inalámbrico para cantar
3. microfono para iglesia
4. microfono para podcast
5. microfonos profesionales
6. micro para negocio
7. necesito un micro barato
8. cable para microfono

## 8) Cámaras de seguridad (8)
1. cámara de seguridad
2. camaras wifi
3. cctv para local
4. seguridad para negocio
5. kit de camaras
6. necesito vigilancia para casa
7. cámara con visión nocturna
8. camara barata para tienda

## 9) Cables (10)
1. cable hdmi
2. cable rca
3. cable de red
4. cable ethernet cat 6
5. cable xlr
6. cable canon
7. cable para microfono
8. adaptador de audio
9. cable auxiliar
10. cable de parlante

## 10) Envíos (6)
1. cómo son los envíos
2. hacen envíos nacionales
3. cuánto demora el envío
4. cuánto vale enviar a medellín
5. hacen contraentrega
6. puedo recoger en tienda

## 11) Garantías (6)
1. cómo funciona la garantía
2. cuánto tiempo de garantía dan
3. cubre daño de fábrica
4. cómo hago una devolución
5. tienen cambios
6. dónde pido soporte

## 12) Pagos (6)
1. qué medios de pago manejan
2. reciben nequi
3. reciben daviplata
4. puedo pagar con tarjeta
5. manejan cuotas
6. tienen addi o sistecredito

## 13) Follow-ups multi-turn (12)
1. quiero una cabina para fiesta
2. más barato
3. otro parecido
4. más potente
5. ahora algo profesional
6. qué tal esa marca
7. quiero guitarra para empezar
8. otra parecida
9. una mejor
10. ahora más económica
11. microfono inalambrico
12. uno similar pero más barato

## 14) Preguntas ambiguas (8)
1. necesito algo bueno
2. algo para negocio
3. quiero algo fino
4. algo que suene bien
5. qué me aconsejas
6. no sé cuál elegir
7. ayúdame con sonido
8. quiero algo para un evento

## 15) Errores ortográficos / tildes / plurales (12)
1. quieroo una guitrra
2. busco cabnias
3. microfno inalambrico
4. camra de segurdad
5. spikers para fiesta
6. parlantess baratos
7. teclao para aprendr
8. cble hdmi
9. cable canon pa micro
10. piano economico
11. camaras wiffi
12. televisr barato

---

## Validación rápida por sesión (recomendado)
1. Ejecutar 15 prompts (1 por grupo) y registrar resultado.
2. Ejecutar bloque multi-turn completo y confirmar memoria.
3. Repetir 10 prompts con errores ortográficos.
4. En producción verificar ausencia de `recommendation_debug` y `nlu_debug` en payload final.
5. Confirmar que ninguna card rompe si faltan campos opcionales.

## Registro sugerido de hallazgos
- Prompt:
- Intent detectado:
- Categoría detectada:
- ¿Mostró productos?: Sí/No
- ¿Respuesta humana específica?: Sí/No
- ¿Problema encontrado?:
- Severidad: Alta / Media / Baja
- Acción correctiva:
