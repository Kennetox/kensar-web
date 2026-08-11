import assert from "node:assert/strict";
import test from "node:test";

import { getKoraActionDisplayPolicy } from "../app/lib/kora/chat-action-policy";

test("support answers show at most two API actions and no suggestion buttons", () => {
  assert.deepEqual(getKoraActionDisplayPolicy("warranty", 2), {
    api_action_limit: 2,
    suggestion_limit: 0,
    total_limit: 2,
  });
});

test("suggestions are used only when the answer has no explicit actions", () => {
  assert.deepEqual(getKoraActionDisplayPolicy("products", 0), {
    api_action_limit: 0,
    suggestion_limit: 2,
    total_limit: 2,
  });
});

test("the explicit menu can retain its navigation choices", () => {
  assert.deepEqual(getKoraActionDisplayPolicy("menu", 5), {
    api_action_limit: 5,
    suggestion_limit: 0,
    total_limit: 5,
  });
});
