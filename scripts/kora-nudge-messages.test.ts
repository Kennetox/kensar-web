import assert from "node:assert/strict";
import test from "node:test";

import { getKoraNudgeMessages } from "../app/lib/kora/nudge-messages";

test("general nudges invite the visitor to start a buying conversation", () => {
  const messages = getKoraNudgeMessages({ pageType: "home" });

  assert.equal(messages.length, 4);
  assert.ok(messages.some((message) => /elegir|producto/i.test(message)));
  assert.ok(messages.every((message) => message.length <= 40));
});

test("product nudges encourage advice and comparison", () => {
  const messages = getKoraNudgeMessages({ pageType: "product", productName: "Consola profesional" });

  assert.ok(messages.some((message) => /para ti/i.test(message)));
  assert.ok(messages.some((message) => /compararlo/i.test(message)));
});

test("category nudges use the category without allowing an oversized bubble", () => {
  const messages = getKoraNudgeMessages({
    pageType: "category",
    categoryName: "Una categoría con un nombre exageradamente largo para la interfaz",
  });

  assert.match(messages[0], /^Te ayudo a elegir en /);
  assert.ok(messages[0].length <= 50);
  assert.ok(messages.some((message) => /presupuesto/i.test(message)));
});
