# KORA Master Plan

## 1) Resumen ejecutivo
**KORA (Knowledge and Order Response Assistant)** será el asistente digital de Kensar para dos frentes:
1. **Kensar Web (cliente final):** guía de compra, respuestas rápidas y escalamiento a WhatsApp.
2. **Metrik (operación interna):** copiloto operativo para inventario, pedidos, soporte técnico y decisiones diarias.

Objetivo central: **mejorar eficiencia operativa y experiencia de usuario** con una implementación incremental, sin sobreingeniería y con base técnica escalable.

---

## 2) Objetivos estratégicos
1. Reducir fricción en navegación y consulta de información.
2. Aumentar velocidad de respuesta para clientes y equipo interno.
3. Estandarizar respuestas de negocio (envíos, garantías, pagos, procesos).
4. Convertir datos operativos en acciones concretas (alertas, prioridades, seguimiento).
5. Construir una base sólida para evolucionar a IA asistida en fases posteriores.

---

## 3) Alcance del programa

## 3.1 Alcance inicial (confirmado)
- Widget conversacional en web con flujo guiado.
- Respuestas predefinidas y rutas de navegación.
- Escalamiento a WhatsApp con contexto.
- Persistencia de sesión local en frontend.
- Integración sin backend nuevo en primera fase.

## 3.2 Alcance objetivo (Web + Metrik + Backend)
- Capa de servicio KORA conectada a datos reales.
- Consultas operativas internas en lenguaje natural guiado.
- Alertas y resumen diario para operación.
- Métricas de uso, eficiencia y calidad de respuesta.
- Gobernanza (roles, trazabilidad, auditoría).

## 3.3 Fuera de alcance inmediato
- Agente autónomo con decisiones críticas automáticas.
- Integraciones complejas en tiempo real sin estabilización previa.
- IA generativa abierta sin controles de negocio y seguridad.

---

## 4) Principios del proyecto
1. **Iterativo:** entregas pequeñas con valor real cada sprint.
2. **Data-first:** reglas sobre datos confiables antes de IA avanzada.
3. **Seguridad y trazabilidad:** toda acción sensible debe quedar auditada.
4. **Reutilización:** una capa KORA para Web y Metrik.
5. **UX clara:** respuestas breves, accionables y sin ruido.

---

## 5) Arquitectura objetivo

## 5.1 Componentes
1. **Kora UI Web (`kensar_web`)**
   - Widget flotante, conversación guiada, handoff a WhatsApp.
2. **Kora UI Interna (`metrik_frontend`)**
   - Panel operativo para consultas internas, alertas y seguimiento.
3. **Kora Service (`kensar_backend`)**
   - Orquestación de intents/reglas, acceso a datos, armado de respuesta.
4. **Data Core (`kensar_backend` + BD)**
   - Productos, inventario, pedidos, clientes, soporte, garantías.
5. **Observabilidad**
   - Logs de conversación, eventos clave, métricas y errores.

## 5.2 Contrato funcional base (API KORA)
- `POST /api/kora/message`
- `GET /api/kora/context` (opcional para estado inicial)
- `POST /api/kora/handoff` (escalamiento humano)
- `GET /api/kora/health`

Respuesta base sugerida:
- `intent`
- `message`
- `actions[]`
- `references[]` (productos, pedidos, links)
- `confidence` (futuro)
- `trace_id` (auditoría)

---

## 6) Roadmap por fases

## Fase 0 - Fundaciones (2 semanas)
**Objetivo:** preparar reglas, datos y arquitectura mínima.

Entregables:
1. Documento de casos de uso priorizados (Web + Metrik).
2. Diccionario de datos operativo (inventario, pedidos, garantías).
3. Definición de intents v1 (10-15 intents).
4. Diseño API KORA v1 (contratos y errores).
5. Instrumentación de eventos (analytics base).

## Fase 1 - KORA Web v1.5 (2-3 semanas)
**Objetivo:** pasar de demo guiada a asistente útil conectado.

Entregables:
1. Conexión de opciones del chat a fuentes reales básicas.
2. Respuestas dinámicas para categorías, disponibilidad aproximada y contacto.
3. Tracking de conversiones (chat -> catálogo, chat -> WhatsApp).
4. Panel mínimo de métricas del widget.

## Fase 2 - KORA Metrik Read-Only (3-4 semanas)
**Objetivo:** habilitar valor operativo interno sin riesgo transaccional.

Capacidades:
1. Stock crítico por sede/categoría.
2. Pedidos atrasados y priorización.
3. Casos de garantía/soporte pendientes.
4. Resumen de estado diario.

Entregables:
1. Panel KORA dentro de Metrik.
2. Consultas auditadas por usuario y timestamp.
3. Reporte operativo diario (auto-generado).

## Fase 3 - Automatización Operativa (4 semanas)
**Objetivo:** convertir insights en acciones.

Capacidades:
1. Alertas automáticas (quiebre, atraso, saturación de soporte).
2. Sugerencias de reposición por rotación.
3. Colas priorizadas para equipo comercial/técnico.
4. Flujos de seguimiento interno.

## Fase 4 - Inteligencia Avanzada (continuo)
**Objetivo:** evolucionar a copiloto de decisión.

Capacidades futuras:
1. Predicción de demanda.
2. Detección de anomalías operativas.
3. Recomendaciones por margen/rotación.
4. IA asistida con contexto empresarial (RAG con políticas/procesos).

---

## 7) Plan por sprints (12 semanas iniciales)

## Sprint 1-2
1. Inventario de intents y casos de uso.
2. Mapa de datos y limpieza mínima.
3. Eventos de analítica en KORA web.
4. Definición API y mocks backend.

## Sprint 3-4
1. Endpoint `POST /api/kora/message` v1.
2. Respuestas dinámicas básicas en web.
3. Dashboard de eventos (uso, clics, handoff).

## Sprint 5-6
1. Integración de KORA en Metrik (read-only).
2. Módulos: stock crítico + pedidos atrasados.
3. Trazabilidad por usuario interno.

## Sprint 7-8
1. Módulo soporte/garantías.
2. Resumen diario automático.
3. Ajustes de performance y UX.

## Sprint 9-10
1. Alertas operativas.
2. Priorización de trabajo por área.
3. Roles y permisos refinados.

## Sprint 11-12
1. Endurecimiento de seguridad y observabilidad.
2. QA integral y plan de despliegue gradual.
3. Plan de fase 3/4 con backlog priorizado.

---

## 8) Casos de uso prioritarios (interno negocio)
1. “Muéstrame stock crítico por categoría y sede.”
2. “Qué pedidos están fuera de SLA hoy.”
3. “Qué garantías vencen esta semana.”
4. “Qué productos llevan más de X días sin rotación.”
5. “Qué debo priorizar hoy en operación.”
6. “Resumen de cierre del día.”

---

## 9) KPIs de éxito

## 9.1 Web
- CTR de acciones de KORA.
- % sesiones con interacción útil (>=1 acción relevante).
- % handoff a WhatsApp con intención clara.
- Impacto en conversión asistida.

## 9.2 Operación (Metrik)
- Tiempo medio para identificar incidencias.
- Reducción de quiebres no detectados.
- Reducción de pedidos fuera de SLA.
- Tiempo de resolución de garantías/soporte.
- Ahorro de tiempo por consulta operativa.

---

## 10) Equipo mínimo recomendado
1. 1 Backend Engineer (API, reglas, datos, jobs).
2. 1 Frontend Engineer (web widget + panel Metrik).
3. 1 Product/Operations Owner (reglas, validación, priorización).
4. 1 QA parcial (pruebas funcionales y regresión).

---

## 11) Riesgos y mitigaciones
1. **Datos inconsistentes**
   - Mitigación: fase 0 de normalización + validaciones.
2. **Sobrecarga de alcance**
   - Mitigación: backlog cerrado por sprint y criterios de salida claros.
3. **Falsa expectativa de IA**
   - Mitigación: comunicar alcance real por fase.
4. **Seguridad/privacidad**
   - Mitigación: RBAC, auditoría y control de PII.
5. **Adopción interna baja**
   - Mitigación: quick wins por área y capacitación corta.

---

## 12) Gobernanza
1. Comité quincenal (producto + tecnología + operación).
2. Revisión de KPIs por sprint.
3. Definición de “Done” por fase.
4. Registro de decisiones técnicas y operativas.

---

## 13) Backlog inicial recomendado
1. Consolidar catálogo de intents v1 (web e interno).
2. Crear módulo de analítica KORA web (eventos).
3. Diseñar API KORA v1 en backend.
4. Crear panel KORA read-only en Metrik.
5. Implementar módulo stock crítico.
6. Implementar módulo pedidos en riesgo.
7. Implementar resumen diario automático.

---

## 14) Criterios de salida por etapa
1. **Fase 1 cerrada:** KORA web conectada, estable y medible.
2. **Fase 2 cerrada:** KORA Metrik read-only útil para operación diaria.
3. **Fase 3 cerrada:** alertas y priorización automatizadas funcionando.
4. **Fase 4 activa:** inteligencia avanzada sobre base confiable.

---

## 15) Conclusión
KORA debe crecer como una **plataforma de asistencia operativa y comercial**, no solo como chat.
La ruta óptima es:
1. estabilizar experiencia web actual,
2. validar inteligencia operativa en Metrik read-only,
3. escalar a automatización y decisiones asistidas con control.

Este enfoque minimiza riesgo, acelera adopción y crea una base real para evolución con IA.
