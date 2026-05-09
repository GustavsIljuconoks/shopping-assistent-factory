import test from "node:test";
import assert from "node:assert/strict";

import {
  ACTIVE_CARTS_STRIP_EMPTY_HTML,
  clearStagedCartItems,
  createActiveCartsState,
  formatLastStagedTime,
  openCartInDefaultBrowser,
  publishActiveCartsStrip,
  recordStagedCartItem,
  renderActiveCartsStrip,
} from "../src/shopping-active-carts-strip.mjs";

test("groups staged cart items into one strip row per retailer", () => {
  const activeCarts = new Map();

  recordStagedCartItem(activeCarts, {
    cartUrl: "https://www.asket.com/en-dk/cart",
    retailer: "Asket",
    stagedAt: "2026-05-09T13:00:00.000Z",
  });
  recordStagedCartItem(activeCarts, {
    cartUrl: "https://www.asket.com/en-dk/cart",
    retailer: "Asket",
    stagedAt: "2026-05-09T13:04:00.000Z",
  });
  recordStagedCartItem(activeCarts, {
    cartUrl: "https://example.com/cart",
    retailer: "Example",
    stagedAt: "2026-05-09T13:03:00.000Z",
  });

  assert.deepEqual([...activeCarts.values()], [
    {
      cartUrl: "https://www.asket.com/en-dk/cart",
      itemCount: 2,
      lastStagedAt: "2026-05-09T13:04:00.000Z",
      retailer: "Asket",
    },
    {
      cartUrl: "https://example.com/cart",
      itemCount: 1,
      lastStagedAt: "2026-05-09T13:03:00.000Z",
      retailer: "Example",
    },
  ]);
});

test("renders a sticky active-carts strip with count, time, and default-browser cart links", () => {
  const state = createActiveCartsState({
    now: () => new Date("2026-05-09T13:04:00.000Z"),
    entries: [
      {
        cartUrl: "https://www.asket.com/en-dk/cart",
        retailer: "Asket",
        stagedAt: "2026-05-09T13:03:00.000Z",
      },
      {
        cartUrl: "https://www.asket.com/en-dk/cart",
        retailer: "Asket",
        stagedAt: "2026-05-09T13:04:00.000Z",
      },
    ],
  });

  const html = renderActiveCartsStrip(state.getRows(), {
    formatTime: () => "4m ago",
  });

  assert.match(html, /class="active-carts-strip"/);
  assert.match(html, /data-sticky="top"/);
  assert.match(html, /Asket/);
  assert.match(html, /2 items/);
  assert.match(html, /4m ago/);
  assert.match(html, /href="https:\/\/www\.asket\.com\/en-dk\/cart"/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /data-open-with="default-browser"/);
});

test("uses the default Zalando.lv cart URL when recording staged items", () => {
  const activeCarts = new Map();
  const row = recordStagedCartItem(activeCarts, {
    retailer: "Zalando.lv",
    stagedAt: "2026-05-09T13:10:00.000Z",
  });

  assert.deepEqual(row, {
    cartUrl: "https://www.zalando.lv/cart/",
    itemCount: 1,
    lastStagedAt: "2026-05-09T13:10:00.000Z",
    retailer: "Zalando.lv",
  });
});

test("publishes and clears the chat strip as active carts appear and disappear", async () => {
  const events = [];
  const chat = {
    async clearActiveCartsStrip(payload) {
      events.push(["clear", payload.visible, payload.rows.length]);
    },
    async showActiveCartsStrip(payload) {
      events.push(["show", payload.visible, payload.rows[0].retailer]);
    },
  };
  const activeCarts = new Map();

  await publishActiveCartsStrip(chat, activeCarts);
  recordStagedCartItem(activeCarts, {
    cartUrl: "https://www.asket.com/en-dk/cart",
    retailer: "Asket",
    stagedAt: "2026-05-09T13:00:00.000Z",
  });
  await publishActiveCartsStrip(chat, activeCarts);
  clearStagedCartItems(activeCarts);
  await publishActiveCartsStrip(chat, activeCarts);

  assert.deepEqual(events, [
    ["clear", false, 0],
    ["show", true, "Asket"],
    ["clear", false, 0],
  ]);
  assert.equal(renderActiveCartsStrip(activeCarts), ACTIVE_CARTS_STRIP_EMPTY_HTML);
});

test("opens cart URLs through the default-browser opener boundary", async () => {
  const opened = [];

  const cartUrl = await openCartInDefaultBrowser({
    cartUrl: "https://www.asket.com/en-dk/cart",
    opener: async (url) => {
      opened.push(url);
    },
  });

  assert.equal(cartUrl, "https://www.asket.com/en-dk/cart");
  assert.deepEqual(opened, ["https://www.asket.com/en-dk/cart"]);
});

test("formats recent last-staged times compactly", () => {
  assert.equal(
    formatLastStagedTime("2026-05-09T13:04:30.000Z", new Date("2026-05-09T13:05:00.000Z")),
    "just now",
  );
  assert.equal(
    formatLastStagedTime("2026-05-09T12:55:00.000Z", new Date("2026-05-09T13:05:00.000Z")),
    "10m ago",
  );
});
