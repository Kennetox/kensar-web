import assert from "node:assert/strict";
import test from "node:test";

import { canShowKoraFollowup, resolveKoraFollowupNudge } from "../app/lib/kora/followup-nudges";

test("does not follow up before the visitor has participated", () => {
  assert.equal(resolveKoraFollowupNudge({ hasConversation: false }), null);
});

test("prioritizes an incomplete sales qualification", () => {
  assert.deepEqual(
    resolveKoraFollowupNudge({
      hasConversation: true,
      memory: { last_recommendation_type: "qualification" },
      cartItemsCount: 2,
    }),
    { id: "qualification", text: "¿Seguimos? Me falta conocer tu presupuesto" }
  );
});

test("offers a comparison when the visitor views a product after recommendations", () => {
  assert.deepEqual(
    resolveKoraFollowupNudge({
      hasConversation: true,
      memory: { last_recommended_products: [{ slug: "consola-10", name: "Consola 10" }] },
      pageContext: { pageType: "product", productName: "Consola 16" },
      currentProductSlug: "consola-16",
    }),
    { id: "product_comparison", text: "¿Comparo este con los que vimos?" }
  );
});

test("offers cart assistance when there is no unfinished qualification", () => {
  assert.deepEqual(
    resolveKoraFollowupNudge({ hasConversation: true, cartItemsCount: 1 }),
    { id: "cart", text: "¿Revisamos que no te falte nada?" }
  );
});

test("uses the last support topic for a useful continuation", () => {
  assert.deepEqual(
    resolveKoraFollowupNudge({
      hasConversation: true,
      memory: { last_support_topic: "warranty" },
    }),
    { id: "support", text: "¿Te quedó alguna duda de la garantía?" }
  );
});

test("courtesy policy allows at most one follow-up per page and two per session", () => {
  const now = 1_000_000;
  assert.equal(
    canShowKoraFollowup({
      state: { shownCount: 0, lastShownAt: 0, shownPaths: [] },
      pathname: "/catalogo",
      now,
    }),
    true
  );
  assert.equal(
    canShowKoraFollowup({
      state: { shownCount: 1, lastShownAt: 0, shownPaths: ["/catalogo"] },
      pathname: "/catalogo",
      now,
    }),
    false
  );
  assert.equal(
    canShowKoraFollowup({
      state: { shownCount: 2, lastShownAt: 0, shownPaths: [] },
      pathname: "/",
      now,
    }),
    false
  );
});

test("courtesy policy enforces a ten-minute cooldown", () => {
  assert.equal(
    canShowKoraFollowup({
      state: { shownCount: 1, lastShownAt: 900_000, shownPaths: ["/catalogo"] },
      pathname: "/catalogo/consola-10",
      now: 1_000_000,
    }),
    false
  );
});
