import test from "node:test";
import assert from "node:assert/strict";

import {
  ASKET_CART_URL,
  SHOPPING_CHAT_LOW_CONFIDENCE_MESSAGE,
  detectShoppingIntent,
  handleShoppingChatMessage,
  renderAsketStagingResultCard,
  stageSelectedAsketCandidates,
} from "../src/shopping-chat-flow.mjs";

test("detects shopping intent in a garment request", () => {
  assert.deepEqual(detectShoppingIntent("Find me black jeans under 100 euros"), {
    detected: true,
    garmentClass: "bottoms",
  });
});

test("asks for garment class before searching when the request is underspecified", async () => {
  const events = [];
  const result = await handleShoppingChatMessage({
    chat: {
      async say(message, payload) {
        events.push([message, payload.field]);
      },
    },
    message: "Please find something for work",
    searchTool: failSearchTool(),
  });

  assert.equal(result.action, "clarify");
  assert.equal(result.field, "garmentClass");
  assert.deepEqual(events, [["What kind of garment should I search for?", "garmentClass"]]);
});

test("asks for size before searching when neither text nor profile provides one", async () => {
  const result = await handleShoppingChatMessage({
    message: "Find a shirt under 80 euros",
    profile: { currency: "EUR", sizes: {}, budgetAnchors: {} },
    searchTool: failSearchTool(),
  });

  assert.equal(result.action, "clarify");
  assert.equal(result.field, "size");
  assert.equal(result.context.garmentClass, "tops");
});

test("asks for price ceiling when no explicit or profile budget is known", async () => {
  const result = await handleShoppingChatMessage({
    message: "Find shoes size 42",
    profile: {
      currency: "EUR",
      sizes: {},
      budgetAnchors: {},
      perItemPriceCeiling: { amount: 0, currency: "EUR" },
    },
    searchTool: failSearchTool(),
  });

  assert.equal(result.action, "clarify");
  assert.equal(result.field, "priceCeiling");
  assert.deepEqual(result.context.size, { value: "42" });
});

test("uses profile size and budget before dispatching search and rendering a proposal card", async () => {
  const searches = [];
  const cards = [];

  const result = await handleShoppingChatMessage({
    message: "Find a crisp shirt for the office",
    profile: {
      currency: "EUR",
      sizes: { tops: { value: "M", system: "International" } },
      budgetAnchors: { tops: { amount: 90, currency: "EUR", cadence: "per_item" } },
    },
    searchTool: {
      async search(context) {
        searches.push(context);
        return {
          confidence: 0.86,
          items: [{ id: "asket-shirt-1", title: "Oxford Shirt" }],
        };
      },
    },
    async renderProposalCard(searchResult, context) {
      cards.push([searchResult.items[0].id, context.garmentClass]);
      return { type: "proposal_card", itemId: searchResult.items[0].id };
    },
  });

  assert.equal(result.action, "proposal_card");
  assert.deepEqual(searches, [
    {
      garmentClass: "tops",
      originalMessage: "Find a crisp shirt for the office",
      priceCeiling: { amount: 90, currency: "EUR" },
      size: { system: "International", value: "M" },
    },
  ]);
  assert.deepEqual(cards, [["asket-shirt-1", "tops"]]);
  assert.deepEqual(result.proposalCard, { type: "proposal_card", itemId: "asket-shirt-1" });
});

test("does not render a proposal card for low-confidence search results", async () => {
  const events = [];
  let rendered = false;

  const result = await handleShoppingChatMessage({
    chat: async (message, payload) => {
      events.push([message, payload.reason]);
    },
    message: "Find shoes size EU 42 under EUR 120",
    searchTool: {
      async search() {
        return { confidence: 0.42, items: [{ id: "uncertain" }] };
      },
    },
    async renderProposalCard() {
      rendered = true;
    },
  });

  assert.equal(result.action, "plain_text");
  assert.equal(result.reason, "low_confidence");
  assert.equal(rendered, false);
  assert.deepEqual(events, [[SHOPPING_CHAT_LOW_CONFIDENCE_MESSAGE, "low_confidence"]]);
});

test("stages selected Asket candidates in sequence and refreshes active carts after each success", async () => {
  const calls = [];
  const activeCartUpdates = [];

  const result = await stageSelectedAsketCandidates({
    auditLogPath: "audit.jsonl",
    page: { name: "playwright-page" },
    selectedCandidates: [
      {
        id: "first",
        productUrl: "https://www.asket.com/products/the-t-shirt",
        size: "M",
        title: "The T-Shirt",
      },
      {
        id: "second",
        productId: "the-overshirt",
        size: "L",
        title: "The Overshirt",
      },
    ],
    async stageCartItem(payload) {
      calls.push(payload);
      return {
        productUrl:
          payload.productUrl ?? `https://www.asket.com/products/${payload.productId}`,
        retailer: "Asket",
        size: payload.size,
        status: "success",
      };
    },
    async refreshActiveCarts(payload) {
      activeCartUpdates.push(payload);
      return [{ itemCount: payload.stagedCount, retailer: payload.retailer }];
    },
  });

  assert.deepEqual(
    calls.map((call) => [call.productUrl, call.productId, call.size, call.auditLogPath]),
    [
      ["https://www.asket.com/products/the-t-shirt", undefined, "M", "audit.jsonl"],
      [undefined, "the-overshirt", "L", "audit.jsonl"],
    ],
  );
  assert.deepEqual(
    activeCartUpdates.map((update) => [update.retailer, update.stagedCount, update.cartUrl]),
    [
      ["Asket", 1, ASKET_CART_URL],
      ["Asket", 2, ASKET_CART_URL],
    ],
  );
  assert.equal(result.action, "asket_staging_result");
  assert.equal(result.stagedCount, 2);
  assert.equal(result.totalSelected, 2);
  assert.deepEqual(result.activeCarts, [{ itemCount: 2, retailer: "Asket" }]);
  assert.deepEqual(result.resultCard, {
    openCartLink: {
      href: ASKET_CART_URL,
      label: "Open cart on Asket",
    },
    retailer: "Asket",
    stagedCount: 2,
    totalSelected: 2,
    type: "asket_staging_result_card",
  });
});

test("does not refresh active carts for unsuccessful staging results", async () => {
  const updates = [];

  const result = await stageSelectedAsketCandidates({
    selectedCandidates: [
      {
        productUrl: "https://www.asket.com/products/the-t-shirt",
        size: "M",
      },
      {
        productUrl: "https://www.asket.com/products/the-shirt",
        size: "M",
      },
    ],
    async stageCartItem({ productUrl }) {
      return {
        productUrl,
        retailer: "Asket",
        status: productUrl.endsWith("the-t-shirt") ? "out_of_stock" : "success",
      };
    },
    async refreshActiveCarts(payload) {
      updates.push(payload);
    },
  });

  assert.equal(result.stagedCount, 1);
  assert.deepEqual(
    result.results.map(({ result: stagingResult }) => stagingResult.status),
    ["out_of_stock", "success"],
  );
  assert.deepEqual(
    updates.map((update) => update.stagedCount),
    [1],
  );
});

test("returns an Asket result card for zero selected candidates without staging", async () => {
  let touchedCart = false;

  const result = await stageSelectedAsketCandidates({
    selectedCandidates: [],
    async stageCartItem() {
      touchedCart = true;
    },
  });

  assert.equal(touchedCart, false);
  assert.equal(result.stagedCount, 0);
  assert.deepEqual(renderAsketStagingResultCard({ stagedCount: 0, totalSelected: 0 }), {
    openCartLink: {
      href: ASKET_CART_URL,
      label: "Open cart on Asket",
    },
    retailer: "Asket",
    stagedCount: 0,
    totalSelected: 0,
    type: "asket_staging_result_card",
  });
});

function failSearchTool() {
  return {
    async search() {
      throw new Error("search should not be called");
    },
  };
}
