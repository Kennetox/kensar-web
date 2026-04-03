# Plan completo de implementacion Mercado Pago Bricks (Kensar Web)

## Objetivo

Definir un modelo de implementacion robusto para cobrar en `kensar_web` usando `Mercado Pago Bricks`, manteniendo una experiencia fluida para cliente y una operacion segura para negocio.

Este documento es una guia de construccion por fases, no un diseno teorico.

## Resultado esperado

Al finalizar el plan:

- El cliente puede completar pago real desde la pagina de checkout sin salir del flujo de Kensar.
- La orden web se crea, se paga y se actualiza automaticamente por webhook.
- El equipo puede auditar intentos, pagos aprobados, fallidos y duplicados sin inconsistencias.
- El flujo soporta reintentos y recuperacion de errores sin perder trazabilidad.

## Alcance

Incluye:

- `kensar_web` (UI checkout + consumo API interno)
- `kensar_backend` (ordenes, pagos, webhooks, persistencia)
- Operacion, seguridad, monitoreo y despliegue

No incluye en esta version:

- suscripciones
- pagos recurrentes
- split payments / marketplace
- antifraude avanzado propio

## Estado actual del proyecto (base real)

Hoy ya existe:

- Carrito web funcional con cupon.
- Checkout visual (`/pago`) con resumen y formulario.
- Modelo de orden web en backend con estados:
  - `pending_payment`, `paid`, `processing`, `payment_failed`, `fulfilled`, etc.
- Registro de pagos de orden (`web_order_payments`).
- Endpoint de creacion de orden desde carrito:
  - `POST /web/orders`
- Endpoint de pago manual:
  - `POST /web/orders/{order_id}/payments/manual`

Gap principal hoy:

- El boton `Continuar al pago` no dispara flujo real de pasarela.
- No hay integracion de Mercado Pago en backend ni webhook productivo.

## Decision tecnica

### Opcion elegida

- Usar `Checkout Bricks`.
- Priorizar experiencia embebida en sitio.
- Mantener backend como orquestador de pagos.

### Estrategia recomendada

Implementar en dos etapas dentro de Bricks:

1. `Wallet Brick` para salida estable inicial (menor complejidad).
2. `Payment Brick` para experiencia embebida completa y mayor control UX.

Nota: Si se desea ir directo a Payment Brick, es posible, pero aumenta superficie de errores y tiempo de QA.

## Principios de arquitectura

1. El frontend nunca usa credenciales secretas.
2. Toda creacion/confirmacion de pago pasa por backend.
3. El webhook es la fuente de verdad para estado final.
4. La URL de retorno solo mejora UX, no confirma pago.
5. Todas las operaciones de pago deben ser idempotentes.
6. Cada transaccion externa debe quedar trazable contra `web_order`.

## Modelo funcional de alto nivel

1. Cliente llena checkout y presiona `Continuar al pago`.
2. Sistema valida datos de contacto/envio requeridos.
3. Backend crea o reutiliza `web_order` en estado `pending_payment`.
4. Backend crea sesion/inicializacion de pago en Mercado Pago.
5. Front renderiza Brick con datos devueltos por backend.
6. Cliente confirma pago en Brick.
7. Mercado Pago notifica webhook al backend.
8. Backend registra pago y actualiza estado de orden.
9. Front consulta estado y muestra resultado final.

## Flujos de usuario a cubrir

## Flujo A: pago aprobado

1. Cliente inicia pago.
2. Brick finaliza sin error.
3. Webhook confirma `approved`.
4. Orden pasa a `paid`.
5. UI muestra pantalla de exito con numero de orden.

## Flujo B: pago rechazado

1. Cliente intenta pago.
2. Proveedor marca rechazo.
3. Webhook registra `failed`.
4. Orden pasa a `payment_failed`.
5. UI ofrece reintentar con mismo carrito/orden.

## Flujo C: pago pendiente

1. Cliente usa metodo asincrono.
2. Estado inicial queda `pending`.
3. UI muestra mensaje "Pago en validacion".
4. Webhook posterior define resultado final.

## Flujo D: doble click / doble intento

1. Usuario dispara pago mas de una vez.
2. Backend detecta intento duplicado por idempotencia.
3. Reusa intento activo o bloquea segundo intento.

## Flujo E: cierre accidental de pagina

1. Usuario cierra checkout durante pago.
2. Al volver, consulta estado de orden.
3. Si sigue pendiente, puede reintentar.
4. Si ya aprobo, ve resumen final.

## Flujo F: cambio de precio o stock entre carrito y pago

1. Antes de iniciar pago, backend recalcula orden.
2. Si hay diferencia relevante, bloquea inicio de pago y pide refrescar carrito.
3. No se debe cobrar monto desalineado al snapshot final.

## Cambios backend requeridos (`kensar_backend`)

## 1) Configuracion y credenciales

Agregar soporte de entorno para Mercado Pago:

- `MERCADOPAGO_ACCESS_TOKEN`
- `MERCADOPAGO_PUBLIC_KEY`
- `MERCADOPAGO_WEBHOOK_SECRET` (o clave equivalente para validacion)
- `MERCADOPAGO_ENV` (`sandbox` | `production`)
- `WEB_CHECKOUT_BASE_URL` (URL publica de `kensar_web`)

## 2) Nuevos endpoints web de pago

Crear router dedicado, por ejemplo `routers/web_payments_mercadopago.py`.

Endpoints minimos:

- `POST /web/payments/mercadopago/checkout`
  - Auth cliente web requerida.
  - Input: `order_id` y metadatos de cliente.
  - Output: datos para inicializar Brick.

- `POST /web/payments/mercadopago/webhook`
  - Publico, sin auth de cliente.
  - Verifica firma/notificacion.
  - Consulta detalle en API Mercado Pago.
  - Actualiza pago y orden local.

- `GET /web/payments/mercadopago/orders/{order_id}/status`
  - Auth cliente web.
  - Devuelve estado consolidado para polling de UI.

## 3) Persistencia de intentos de pago

Recomendado crear tabla nueva: `web_order_payment_attempts`.

Campos sugeridos:

- `id`
- `tenant_id`
- `web_order_id`
- `provider` (`mercadopago`)
- `provider_checkout_id` (id de preferencia/intent)
- `provider_payment_id` (si existe)
- `status` (`created`, `pending`, `approved`, `failed`, `cancelled`, `expired`)
- `amount`
- `currency`
- `idempotency_key`
- `request_payload_json`
- `response_payload_json`
- `created_at`, `updated_at`

Ventaja:

- Aisla intentos vs pagos confirmados.
- Facilita auditoria y debugging.

## 4) Idempotencia

Reglas minimas:

- Para creacion de intento: llave idempotente por `(order_id, monto, ventana temporal)`.
- Para webhook: deduplicar por `event_id` externo.
- Para registro final: si `provider_payment_id` ya fue procesado, ignorar repetido.

## 5) Mapeo de estados externos a internos

Definir una tabla de traduccion unica.

Ejemplo de destino interno:

- Externo `approved` -> `payment_status=approved`, `status=paid`
- Externo `pending` / `in_process` -> `payment_status=pending`, `status=pending_payment`
- Externo `rejected` / `cancelled` -> `payment_status=failed|cancelled`, `status=payment_failed`
- Externo `refunded` -> `payment_status=refunded`, `status=refunded`

Nota: consolidar nomenclatura exacta con respuesta oficial de API en implementacion.

## 6) Validaciones de negocio antes de abrir pago

- Orden debe pertenecer al cliente autenticado.
- Orden no debe estar `paid`, `fulfilled`, `cancelled`, `refunded`.
- Monto debe ser mayor a cero.
- Stock y publicacion web validos para items.
- Moneda y total consistentes con snapshot de orden.

## 7) Webhook robusto

Debe cubrir:

- validacion de firma/origen
- parseo seguro de payload
- consulta de detalle a API Mercado Pago
- persistencia de evento bruto
- actualizacion transaccional de intento + orden
- respuesta `200` rapida

## 8) Reconciliacion operativa

Agregar proceso (cron/job) para ordenes con pago `pending` mayor a X minutos:

- reconsultar estado externo
- corregir desviaciones
- dejar trazas de auditoria

## Cambios frontend requeridos (`kensar_web`)

## 1) UX del boton principal

En `/pago` el boton `Continuar al pago` debe:

1. Validar campos requeridos.
2. Persistir datos de checkout (en orden o perfil).
3. Crear/inicializar pago con backend.
4. Mostrar Brick o modal de pago segun flujo elegido.

## 2) Estado visual del proceso

Agregar estados UI:

- `idle`
- `creating_order`
- `initializing_payment`
- `payment_in_progress`
- `payment_pending_confirmation`
- `payment_success`
- `payment_error`

## 3) Componente de pago

Crear componentes dedicados:

- `CheckoutPaymentSection`
- `MercadoPagoBrickContainer`
- `CheckoutPaymentResult`

Cada uno con manejo de error, loading y retries.

## 4) Polling post pago

Despues de evento local del Brick:

- iniciar polling de `GET /web/payments/mercadopago/orders/{order_id}/status`
- timeout razonable
- si no hay confirmacion final, mostrar estado pendiente con accion de refrescar

## 5) Mensajeria al cliente

Textos minimos:

- Exito: "Pago aprobado. Tu orden fue recibida."
- Pendiente: "Estamos confirmando tu pago."
- Fallo: "No se pudo completar el pago. Puedes intentarlo de nuevo."

## 6) Guest checkout

Decision necesaria antes de construir:

- Opcion 1: exigir login para pagar (modelo actual)
- Opcion 2: habilitar invitado real (requiere token temporal de checkout)

Recomendacion:

- Fase inicial con login para reducir riesgo.
- Fase siguiente abrir invitado con flujo controlado.

## Contrato API propuesto (resumen)

## POST `/web/payments/mercadopago/checkout`

Input sugerido:

```json
{
  "order_id": 123,
  "payer": {
    "email": "cliente@correo.com",
    "first_name": "Nombre",
    "last_name": "Apellido",
    "identification": {
      "type": "CC",
      "number": "1234567890"
    }
  }
}
```

Output sugerido:

```json
{
  "order_id": 123,
  "provider": "mercadopago",
  "attempt_id": 456,
  "public_key": "APP_USR-...",
  "brick_mode": "payment",
  "initialization": {
    "amount": 414000,
    "currency": "COP",
    "reference": "OW-000123"
  }
}
```

## POST `/web/payments/mercadopago/webhook`

- Sin auth de cliente.
- Debe almacenar payload bruto y procesar asincronamente o en pipeline corto.

## GET `/web/payments/mercadopago/orders/{order_id}/status`

Output sugerido:

```json
{
  "order_id": 123,
  "status": "paid",
  "payment_status": "approved",
  "last_payment": {
    "provider": "mercadopago",
    "provider_reference": "987654321",
    "status": "approved",
    "amount": 414000
  }
}
```

## Seguridad y cumplimiento

1. Secretos solo en backend.
2. Verificacion de firma en webhook.
3. Sanitizacion y logs sin exponer PII sensible.
4. Rate limiting en endpoints de pago.
5. Control estricto de CORS y origenes.
6. TLS obligatorio en todos los callbacks.
7. Regla antifraude minima:
   - bloquear multiples intentos identicos en pocos segundos.

## Observabilidad y soporte

## Logs estructurados

Agregar campos en cada log:

- `order_id`
- `attempt_id`
- `provider_payment_id`
- `tenant_id`
- `status_before`
- `status_after`
- `idempotency_key`

## Metricas minimas

- tasa de aprobacion
- tasa de rechazo
- pagos pendientes > 15 min
- latencia webhook
- errores por endpoint de pago

## Alertas

- webhook caido
- aumento brusco de rechazos
- ordenes pendientes sin cierre > X min

## QA y pruebas

## Pruebas unitarias backend

- creacion de intento valida e invalida
- idempotencia
- mapeo de estados
- transiciones de orden
- deduplicacion de webhook

## Pruebas de integracion backend

- ciclo completo `pending -> approved`
- ciclo `pending -> failed`
- evento duplicado
- evento fuera de orden

## Pruebas frontend

- render Brick en flujo normal
- manejo de loading y timeout
- retry luego de rechazo
- recuperacion al recargar pagina

## Pruebas E2E

- compra completa aprobada
- compra con rechazo y reintento
- cierre de navegador durante pago y recuperacion

## Plan de implementacion por fases

## Fase 0 - Preparacion

- crear app en Mercado Pago
- obtener credenciales test/prod
- definir URLs de callback
- definir decision login-only vs guest

## Fase 1 - Backend base

- nuevos endpoints de pago
- persistencia de intentos
- webhook funcional
- pruebas unitarias y de integracion

## Fase 2 - Frontend checkout

- conectar boton `Continuar al pago`
- integrar Brick
- estados visuales
- polling de confirmacion

## Fase 3 - Endurecimiento

- idempotencia completa
- observabilidad
- reconciliacion de pendientes
- ajuste UX de errores

## Fase 4 - Go Live

- activar credenciales produccion
- smoke tests
- monitoreo intensivo primera semana

## Checklist de go-live

Antes de produccion:

- [ ] credenciales `production` cargadas en backend
- [ ] webhook publico accesible por HTTPS
- [ ] firma webhook validada
- [ ] idempotencia habilitada
- [ ] logs y metricas activas
- [ ] flujo aprobado/fallido probado en entorno productivo controlado
- [ ] mensajes de UX revisados
- [ ] runbook de soporte documentado

## Runbook operativo minimo

Si un cliente reporta "pague pero no aparece":

1. buscar `order_id`
2. revisar ultimo `attempt_id`
3. validar si llego webhook
4. consultar estado de pago en proveedor
5. si aprobo y no se reflejo, ejecutar reconciliacion manual
6. registrar incidente con causa raiz

## Riesgos y mitigacion

Riesgo: webhook no llega.

- Mitigacion: reconciliacion periodica + reintento proveedor + monitoreo.

Riesgo: pago duplicado.

- Mitigacion: idempotencia y bloqueo por referencia externa.

Riesgo: mismatch de monto.

- Mitigacion: snapshot de orden y validacion pre-pago.

Riesgo: UX confusa en pendientes.

- Mitigacion: pantalla de estado clara + polling + CTA de soporte.

## Definiciones pendientes antes de construir

1. Si fase 1 sera `Wallet Brick` o directo `Payment Brick`.
2. Si pago inicial exige login o ya incluye invitado.
3. Politica de vencimiento de orden pendiente.
4. Politica de reintentos maximos por orden.
5. Mensajeria exacta de estados para cliente.

## Criterios de aceptacion del MVP

El MVP se considera listo cuando:

1. Se puede completar al menos una compra real aprobada en produccion.
2. La orden cambia de estado automaticamente por webhook.
3. El cliente ve resultado claro sin refrescos manuales extremos.
4. Soporte puede auditar el evento completo con `order_id`.
5. No hay pagos duplicados en pruebas de doble envio.

## Nota final

Construir Bricks bien implica tratar pagos como sistema critico.

La prioridad no debe ser solo "que cobre", sino:

- cobrar correctamente
- registrar correctamente
- recuperar correctamente ante fallos
- dar visibilidad operativa al equipo

Con ese enfoque, el flujo queda profesional desde el dia 1 y escalable para crecimiento.
