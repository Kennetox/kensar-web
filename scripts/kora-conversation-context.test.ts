import assert from "node:assert/strict";
import test from "node:test";

import {
  buildKoraContextTransitionNotice,
  hasKoraUserEngaged,
  reconcileUntouchedKoraConversation,
  referencesCurrentPageProduct,
} from "../app/lib/kora/conversation-context-policy";

test("replaces an untouched contextual introduction after navigation", () => {
  const messages = [{ id: "intro", role: "bot" as const, text: "Veo que miras televisores" }];
  const next = reconcileUntouchedKoraConversation({
    messages,
    greeting: { message: "Hola, soy KORA", contextKey: "home" },
    createId: () => "new",
  });
  assert.deepEqual(next, [{ id: "intro", role: "bot", text: "Hola, soy KORA", kind: "contextual_intro", contextKey: "home" }]);
});

test("preserves a conversation once the customer has participated", () => {
  const messages = [
    { id: "intro", role: "bot" as const, text: "Veo que miras televisores" },
    { id: "user", role: "user" as const, text: "Busco uno para la sala" },
  ];
  assert.equal(hasKoraUserEngaged(messages), true);
  assert.equal(
    reconcileUntouchedKoraConversation({
      messages,
      greeting: { message: "Hola, soy KORA", contextKey: "home" },
      createId: () => "new",
    }),
    messages
  );
});

test("builds a subtle notice for the new visible context", () => {
  assert.match(
    buildKoraContextTransitionNotice({ pageType: "product", productName: "Guitarra Yamaha C40" }) || "",
    /ahora estás viendo guitarra yamaha c40/i
  );
  assert.match(buildKoraContextTransitionNotice({ pageType: "home" }) || "", /conversación anterior/i);
});

test("recognizes references to the product currently visible", () => {
  assert.equal(referencesCurrentPageProduct("¿Y este qué tal?"), true);
  assert.equal(referencesCurrentPageProduct("¿El que estoy viendo me sirve?"), true);
  assert.equal(referencesCurrentPageProduct("Muéstrame otras guitarras"), false);
});
