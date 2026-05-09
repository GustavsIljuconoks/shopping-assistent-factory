import test from "node:test";
import assert from "node:assert/strict";

import {
  SHOP_TRIAGE_ACTION,
  classifyInboxQuickCapture,
  suggestInboxTriageAction,
} from "../src/inbox-triage-classifier.mjs";

test("suggests Shop for buying-intent quick captures", () => {
  assert.equal(suggestInboxTriageAction("buy black trousers under 80 euros"), SHOP_TRIAGE_ACTION);
  assert.equal(suggestInboxTriageAction("I need a new blazer for work"), SHOP_TRIAGE_ACTION);
  assert.equal(suggestInboxTriageAction("find me a linen shirt size M"), SHOP_TRIAGE_ACTION);
});

test("handles typical EU clothing vocabulary", () => {
  const result = classifyInboxQuickCapture({
    text: "Need new trainers EU 42 and a jumper under 120 EUR",
  });

  assert.equal(result.suggestedAction, SHOP_TRIAGE_ACTION);
  assert.equal(result.shoppingIntent.detected, true);
  assert.equal(result.shoppingIntent.garmentClass, "shoes");
});

test("does not suggest Shop for non-shopping captures", () => {
  assert.equal(suggestInboxTriageAction("I need to call the bank tomorrow"), undefined);
  assert.equal(suggestInboxTriageAction("find the quarterly report"), undefined);
  assert.equal(suggestInboxTriageAction("buy milk after work"), undefined);
});
