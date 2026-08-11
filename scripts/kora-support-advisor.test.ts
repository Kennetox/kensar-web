import assert from "node:assert/strict";
import test from "node:test";

import { getKoraBusinessKnowledge } from "../app/lib/kora/business-knowledge";
import { resolveKoraSupportAnswer } from "../app/lib/kora/support-advisor";

const knowledge = getKoraBusinessKnowledge();

function answer(query: string, memoryTopic?: string) {
  return resolveKoraSupportAnswer({ query, memoryTopic, knowledge });
}

test("answers warranty coverage directly before offering two relevant actions", () => {
  const result = answer("¿Qué garantía tienen?");
  assert.equal(result?.topic, "warranty");
  assert.match(result?.answer || "", /revisión técnica/i);
  assert.match(result?.answer || "", /mal uso/i);
  assert.doesNotMatch(result?.answer || "", /está publicada en nuestro sitio/i);
  assert.equal(result?.actions.length, 2);
});

test("explains the warranty claim process from the published policy", () => {
  const result = answer("¿Cómo inicio un reclamo de garantía?");
  assert.match(result?.answer || "", /número de pedido o evidencia de compra/i);
  assert.match(result?.answer || "", /soporte fotográfico/i);
  assert.equal(result?.actions[0].type, "whatsapp");
});

test("explains concrete shipping thresholds and times", () => {
  const generic = answer("¿Cómo funcionan los envíos?");
  assert.match(generic?.answer || "", /\$100\.000 COP/i);
  assert.match(generic?.answer || "", /2 y 5 días hábiles/i);
  assert.equal(generic?.actions.length, 2);

  const cali = answer("¿Cuánto tarda para Cali?");
  assert.match(cali?.answer || "", /1 y 2 días hábiles/i);
});

test("lists only payment methods verified on the checkout", () => {
  const result = answer("¿Cómo puedo pagar?");
  assert.match(result?.answer || "", /Mercado Pago/i);
  assert.match(result?.answer || "", /PSE/i);
  assert.match(result?.answer || "", /Nequi/i);
  assert.match(result?.answer || "", /Efecty/i);
  assert.doesNotMatch(result?.answer || "", /Addi|Sistecrédito/i);
  assert.equal(result?.actions.length, 1);
});

test("does not invent a published financing option", () => {
  const result = answer("¿Manejan cuotas o Addi?");
  assert.match(result?.answer || "", /no aparece como una opción general publicada/i);
  assert.equal(result?.actions[0].type, "whatsapp");
});

test("explains returns and keeps support context for short follow-ups", () => {
  const returns = answer("Quiero devolver un producto");
  assert.match(returns?.answer || "", /estado del producto/i);
  assert.match(returns?.answer || "", /accesorios/i);

  const followup = answer("¿y cuánto tarda?", "warranty");
  assert.equal(followup?.topic, "warranty");
  assert.match(followup?.answer || "", /producto, los repuestos/i);
});
