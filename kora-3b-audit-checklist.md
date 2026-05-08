# KORA 3B - Audit Checklist (Second Pass)

## Coverage
- Attributes loaded: 30/30
- Categories loaded: 15/15
- Guidance detectors: 5/5
- PageContext request integration: Yes
- Category opening by context (single-run memory): Yes
- Product page advice contextualized: Yes

## Prompt validation (rule mapping)
1. qué significa bluetooth -> attribute_explanation + bluetooth
2. qué significa FM -> attribute_explanation + fm
3. qué es entrada auxiliar -> attribute_explanation + auxiliar
4. qué es una cabina activa -> attribute_explanation + cabina_activa
5. diferencia entre activa y pasiva -> explicit heuristic branch
6. qué son las pulgadas de una cabina -> attribute_explanation + pulgadas_parlante
7. qué es potencia -> attribute_explanation + potencia
8. quiero algo con buen bajo -> attribute/bass + routed recommendation path
9. qué micrófono me sirve para cantar -> category guidance microfonos
10. diferencia entre micrófono alámbrico e inalámbrico -> attribute_explanation + mic attributes
11. diferencia entre micrófono sencillo y doble -> attribute_explanation + mic attributes
12. qué es un amplificador -> attribute_explanation + amplificador
13. para qué sirve una consola -> attribute_explanation + consola
14. qué diferencia hay entre cámara WiFi y DVR -> attribute_explanation + camara_wifi/dvr
15. qué significa visión nocturna -> attribute_explanation + vision_nocturna
16. qué es microSD -> attribute_explanation + micro_sd
17. cómo elijo un televisor -> category_guidance + televisores
18. qué guitarra sirve para principiante -> category/attribute guidance
19. qué teclado sirve para aprender -> category/attribute guidance
20. qué cable necesito -> compatibility_question
21. necesito sonido para iglesia -> recommendation/context routing
22. quiero algo para fiesta -> recommendation/context routing
23. no sé cuál comprar -> category_guidance
24. este producto me sirve para negocio -> product_advice + pageContext(product)
25. qué tiene de bueno este producto -> product_advice + pageContext(product)
26. qué más necesito con esto -> product_advice + compatibility guidance

> Nota: validación funcional completa de los 26 prompts requiere ejecución manual en UI/endpoint runtime.
