import test from "node:test";
import assert from "node:assert/strict";

import {
  SHOPPING_SETUP_PLACEHOLDER,
  renderSettingsApp,
  renderSettingsShoppingPane,
} from "../src/settings-shopping-pane.mjs";

test("renders a navigable Settings Shopping section", () => {
  const html = renderSettingsApp();

  assert.match(html, /aria-label="Settings"/);
  assert.match(html, /href="#shopping"/);
  assert.match(html, /aria-current="page">Shopping<\/a>/);
  assert.match(html, /<section id="shopping"/);
  assert.match(html, new RegExp(SHOPPING_SETUP_PLACEHOLDER));
});

test("renders the Shopping pane without profile data", () => {
  assert.doesNotThrow(() => renderSettingsShoppingPane());

  const html = renderSettingsShoppingPane();

  assert.match(html, /Shopping/);
  assert.match(html, /No shopping profile data yet\./);
});

test("accepts present profile data without changing the empty setup shell", () => {
  const html = renderSettingsShoppingPane({
    profile: {
      country: "LV",
      currency: "EUR",
    },
  });

  assert.match(html, /Profile data loaded\./);
  assert.match(html, new RegExp(SHOPPING_SETUP_PLACEHOLDER));
});
