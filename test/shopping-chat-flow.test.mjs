import test from "node:test";
import assert from "node:assert/strict";

import {
  SHOPPING_CHAT_LOW_CONFIDENCE_MESSAGE,
  detectShoppingIntent,
  handleShoppingChatMessage,
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

function failSearchTool() {
  return {
    async search() {
      throw new Error("search should not be called");
    },
  };
}
