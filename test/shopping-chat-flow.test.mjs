import test from "node:test";
import assert from "node:assert/strict";

import {
  SHOPPING_CHAT_LOW_CONFIDENCE_MESSAGE,
  createProfileConfirmationCard,
  detectShoppingIntent,
  findMissingBootstrapField,
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
    searchTool: failSearchTool(),
  });

  assert.equal(result.action, "clarify");
  assert.equal(result.field, "size");
  assert.equal(result.context.garmentClass, "tops");
});

test("asks for price ceiling when no explicit or profile budget is known", async () => {
  const result = await handleShoppingChatMessage({
    message: "Find shoes size 42",
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
      country: "LV",
      currency: "EUR",
      sizes: {
        shoes: { value: "42", system: "EU" },
        tops: { value: "M", system: "International" },
      },
      budgetAnchors: {
        default: { amount: 100, currency: "EUR", cadence: "per_item" },
        tops: { amount: 90, currency: "EUR", cadence: "per_item" },
      },
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

test("asks lazy bootstrap questions for the first missing shopping profile field", async () => {
  const events = [];
  const result = await handleShoppingChatMessage({
    chat: {
      async say(message, payload) {
        events.push([message, payload.field, payload.profileField.profileKey]);
      },
    },
    message: "Find me black jeans under 100 euros",
    profile: {
      currency: "EUR",
      sizes: {},
      budgetAnchors: {},
      perItemPriceCeiling: { amount: 0, currency: "EUR" },
    },
    searchTool: failSearchTool(),
  });

  assert.equal(result.action, "clarify");
  assert.equal(result.field, "country");
  assert.deepEqual(events, [
    [
      "Which country should I use for shopping availability and delivery?",
      "country",
      "country",
    ],
  ]);
});

test("skips already-known bootstrap fields and asks for the next missing field", () => {
  assert.deepEqual(
    findMissingBootstrapField({
      country: "LV",
      sizes: {
        tops: { value: "M" },
      },
      budgetAnchors: {},
      perItemPriceCeiling: { amount: 0, currency: "EUR" },
    }),
    {
      field: "shoeSizeEu",
      garmentClass: "shoes",
      label: "EU shoe size",
      profileKey: "sizes.shoes",
    },
  );
});

test("turns a pending bootstrap answer into a one-tap confirmation card", async () => {
  const events = [];
  const result = await handleShoppingChatMessage({
    chat: {
      async showConfirmationCard(card, payload) {
        events.push([card.title, card.body, payload.pendingProfileField.profileKey]);
      },
    },
    message: "EU 43",
    pendingProfileField: {
      field: "shoeSizeEu",
    },
  });

  assert.equal(result.action, "confirmation_card");
  assert.deepEqual(result.confirmationCard, {
    type: "profile_confirmation_card",
    title: "Confirm EU shoe size",
    body: "EU 43",
    confirmLabel: "Confirm",
    value: { system: "EU", value: "43" },
    profileField: {
      field: "shoeSizeEu",
      garmentClass: "shoes",
      label: "EU shoe size",
      profileKey: "sizes.shoes",
      value: { system: "EU", value: "43" },
    },
  });
  assert.deepEqual(events, [["Confirm EU shoe size", "EU 43", "sizes.shoes"]]);
});

test("captures a loose top-size answer for confirmation", async () => {
  const result = await handleShoppingChatMessage({
    message: "m",
    pendingProfileField: {
      field: "topSize",
    },
  });

  assert.equal(result.action, "confirmation_card");
  assert.equal(result.confirmationCard.body, "M");
  assert.deepEqual(result.pendingProfileField.value, { value: "M" });
});

test("persists a confirmed bootstrap field to the shopping profile", async () => {
  const patches = [];
  const result = await handleShoppingChatMessage({
    message: "Confirm",
    confirmedProfileField: createProfileConfirmationCard({
      field: "topSize",
      value: { value: "M", system: "International" },
    }),
    async updateProfile(patch) {
      patches.push(patch);
      return {
        country: "LV",
        currency: "EUR",
        sizes: { tops: patch.sizes.tops },
      };
    },
  });

  assert.equal(result.action, "profile_updated");
  assert.deepEqual(patches, [
    {
      sizes: {
        tops: { system: "International", value: "M" },
      },
    },
  ]);
});

test("asks only for a new garment-specific size after bootstrap basics are known", async () => {
  const result = await handleShoppingChatMessage({
    message: "Find a dress under 120 euros",
    profile: {
      country: "LV",
      currency: "EUR",
      sizes: {
        shoes: { value: "42", system: "EU" },
        tops: { value: "M" },
      },
      budgetAnchors: {
        default: { amount: 120, currency: "EUR", cadence: "per_item" },
      },
      perItemPriceCeiling: { amount: 120, currency: "EUR" },
    },
    searchTool: failSearchTool(),
  });

  assert.equal(result.action, "clarify");
  assert.equal(result.field, "size");
  assert.equal(result.context.garmentClass, "dresses");
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
