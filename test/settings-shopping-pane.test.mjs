import test from "node:test";
import assert from "node:assert/strict";

import {
  CONNECTED_RETAILERS_EMPTY_STATE,
  SHOPPING_ACTIVITY_EMPTY_STATE,
  SHOPPING_SETUP_PLACEHOLDER,
  renderSettingsApp,
  renderSettingsPrivacyPane,
  renderSettingsShoppingPane,
} from "../src/settings-shopping-pane.mjs";

test("renders a navigable Settings Privacy shopping activity section", () => {
  const html = renderSettingsApp();

  assert.match(html, /aria-label="Settings"/);
  assert.match(html, /href="#shopping"/);
  assert.match(html, /href="#privacy"/);
  assert.match(html, /aria-current="page">Privacy<\/a>/);
  assert.match(html, /<section id="privacy"/);
  assert.match(html, /Shopping activity/);
  assert.match(html, new RegExp(SHOPPING_ACTIVITY_EMPTY_STATE));
});

test("renders the Shopping activity pane without audit entries", () => {
  assert.doesNotThrow(() => renderSettingsPrivacyPane());

  const html = renderSettingsPrivacyPane({ auditEntries: [] });

  assert.match(html, /Privacy/);
  assert.match(html, /Shopping activity/);
  assert.match(html, new RegExp(SHOPPING_ACTIVITY_EMPTY_STATE));
});

test("can still render the Settings Shopping section", () => {
  const html = renderSettingsApp({ activeSection: "shopping" });

  assert.match(html, /aria-current="page">Shopping<\/a>/);
  assert.match(html, /<section id="shopping"/);
  assert.match(html, new RegExp(SHOPPING_SETUP_PLACEHOLDER));
  assert.match(html, /Connected retailers/);
  assert.match(html, new RegExp(CONNECTED_RETAILERS_EMPTY_STATE));
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

test("renders connected retailer status in the Shopping pane", () => {
  const html = renderSettingsShoppingPane({
    connectedRetailers: [
      {
        retailerIdentifier: "Asket",
        status: "Connected",
      },
    ],
  });

  assert.match(html, /Connected retailers/);
  assert.match(html, /<span class="connected-retailer-name">Asket<\/span>/);
  assert.match(html, /<span class="connected-retailer-status">Connected<\/span>/);
});
