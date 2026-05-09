import test from "node:test";
import assert from "node:assert/strict";

import {
  ASKET_CART_URL,
  ASOS_CART_URL,
  SHOPPING_CHAT_LOW_CONFIDENCE_MESSAGE,
  createStagingFailureExplanation,
  createDiscoveryOnlyRetailerFeedItem,
  createProfileConfirmationCard,
  detectShoppingIntent,
  findMissingBootstrapField,
  handleShoppingChatMessage,
  renderAsketStagingResultCard,
  renderAsosStagingResultCard,
  renderRetailerStagingFailureCard,
  stageSelectedAsketCandidates,
  stageSelectedAsosCandidates,
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
      memories: [],
      originalMessage: "Find a crisp shirt for the office",
      priceCeiling: { amount: 90, currency: "EUR" },
      size: { system: "International", value: "M" },
    },
  ]);
  assert.deepEqual(cards, [["asket-shirt-1", "tops"]]);
  assert.deepEqual(result.proposalCard, { type: "proposal_card", itemId: "asket-shirt-1" });
});

test("searches enabled retailers in parallel and assembles sorted non-empty proposal cards", async () => {
  const started = [];
  const incrementalCards = [];
  const gates = new Map([
    ["Slow Retailer", createDeferred()],
    ["Fast Retailer", createDeferred()],
    ["Empty Retailer", createDeferred()],
  ]);

  const pending = handleShoppingChatMessage({
    chat: {
      async showProposalCard(card, payload) {
        incrementalCards.push([card.retailer, payload.retailerResult.candidates.length]);
      },
    },
    message: "Find black shirt",
    profile: {
      country: "LV",
      currency: "EUR",
      enabledRetailers: ["Slow Retailer", "Fast Retailer", "Empty Retailer"],
      sizes: {
        shoes: { value: "42", system: "EU" },
        tops: { value: "M", system: "International" },
      },
      budgetAnchors: {
        default: { amount: 100, currency: "EUR", cadence: "per_item" },
      },
    },
    searchTool: {
      async search(context) {
        started.push(context.retailer);
        return gates.get(context.retailer).promise;
      },
    },
    async renderProposalCard(searchResult) {
      return {
        retailer: searchResult.retailer,
        type: searchResult.type ?? "retailer_proposal_card",
      };
    },
  });

  await Promise.resolve();
  assert.deepEqual(started, ["Slow Retailer", "Fast Retailer", "Empty Retailer"]);

  gates.get("Fast Retailer").resolve({
    retailer: "Fast Retailer",
    confidence: 0.81,
    overallMatchScore: 72,
    candidates: [createSearchCandidate("fast-1")],
  });
  await flushAsyncWork();
  assert.deepEqual(incrementalCards, [["Fast Retailer", 1]]);

  gates.get("Empty Retailer").resolve({
    retailer: "Empty Retailer",
    confidence: 0.95,
    overallMatchScore: 99,
    candidates: [],
  });
  gates.get("Slow Retailer").resolve({
    retailer: "Slow Retailer",
    confidence: 0.9,
    overallMatchScore: 88,
    candidates: [
      createSearchCandidate("slow-1"),
      createSearchCandidate("slow-2"),
      createSearchCandidate("slow-3"),
      createSearchCandidate("slow-4"),
    ],
  });

  const result = await pending;

  assert.equal(result.action, "proposal_card");
  assert.deepEqual(
    result.searchResult.cards.map((card) => [card.retailer, card.candidates.length, card.overallMatchScore]),
    [
      ["Slow Retailer", 3, 88],
      ["Fast Retailer", 1, 72],
    ],
  );
  assert.equal(result.searchResult.confidence, 0.9);
  assert.deepEqual(incrementalCards, [
    ["Fast Retailer", 1],
    ["Slow Retailer", 3],
  ]);
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
  assert.deepEqual(result.feedItems, [
    {
      event: "staging_succeeded",
      retailer: "Asket",
      title: "Staged at Asket",
      type: "shopping_feed_item",
    },
  ]);
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
  const foregroundEvents = [];

  const result = await stageSelectedAsketCandidates({
    page: {
      async bringToFront() {
        foregroundEvents.push("page");
      },
    },
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
  assert.deepEqual(foregroundEvents, ["page"]);
  assert.deepEqual(result.feedItems, [
    {
      event: "staging_succeeded",
      retailer: "Asket",
      title: "Staged at Asket",
      type: "shopping_feed_item",
    },
    {
      event: "staging_failed",
      retailer: "Asket",
      title: "Staging failed at Asket",
      type: "shopping_feed_item",
    },
  ]);
  assert.deepEqual(result.resultCard, {
    explanation: "Item out of stock",
    manualLink: {
      href: "https://www.asket.com/products/the-t-shirt",
      label: "Open in Asket to complete manually",
    },
    retailer: "Asket",
    status: "out_of_stock",
    type: "retailer_staging_failure_card",
  });
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
  assert.deepEqual(result.feedItems, []);
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

test("stages selected ASOS candidates in sequence and refreshes active carts after each success", async () => {
  const calls = [];
  const activeCartUpdates = [];

  const result = await stageSelectedAsosCandidates({
    auditLogPath: "audit.jsonl",
    page: { name: "playwright-page" },
    selectedCandidates: [
      {
        id: "first",
        productUrl: "https://www.asos.com/asos-design/product/prd/123",
        size: "M",
        title: "ASOS Tee",
      },
      {
        id: "second",
        productId: "asos/prd/456",
        size: "L",
        title: "ASOS Shirt",
      },
    ],
    async stageCartItem(payload) {
      calls.push(payload);
      return {
        productUrl:
          payload.productUrl ?? `https://www.asos.com/${payload.productId.replace(/^\/+/, "")}`,
        retailer: "ASOS",
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
      ["https://www.asos.com/asos-design/product/prd/123", undefined, "M", "audit.jsonl"],
      [undefined, "asos/prd/456", "L", "audit.jsonl"],
    ],
  );
  assert.deepEqual(
    activeCartUpdates.map((update) => [update.retailer, update.stagedCount, update.cartUrl]),
    [
      ["ASOS", 1, ASOS_CART_URL],
      ["ASOS", 2, ASOS_CART_URL],
    ],
  );
  assert.equal(result.action, "asos_staging_result");
  assert.equal(result.stagedCount, 2);
  assert.deepEqual(result.feedItems, [
    {
      event: "staging_succeeded",
      retailer: "ASOS",
      title: "Staged at ASOS",
      type: "shopping_feed_item",
    },
  ]);
  assert.deepEqual(result.resultCard, {
    openCartLink: {
      href: ASOS_CART_URL,
      label: "Open cart on ASOS",
    },
    retailer: "ASOS",
    stagedCount: 2,
    totalSelected: 2,
    type: "asos_staging_result_card",
  });
});

test("returns an ASOS result card for zero selected candidates without staging", async () => {
  let touchedCart = false;

  const result = await stageSelectedAsosCandidates({
    selectedCandidates: [],
    async stageCartItem() {
      touchedCart = true;
    },
  });

  assert.equal(touchedCart, false);
  assert.deepEqual(result.feedItems, []);
  assert.deepEqual(renderAsosStagingResultCard({ stagedCount: 0, totalSelected: 0 }), {
    openCartLink: {
      href: ASOS_CART_URL,
      label: "Open cart on ASOS",
    },
    retailer: "ASOS",
    stagedCount: 0,
    totalSelected: 0,
    type: "asos_staging_result_card",
  });
});

test("returns plain-English staging failure cards", () => {
  assert.equal(
    createStagingFailureExplanation({
      error: "Cloudflare challenge blocked automation",
      retailer: "ASOS",
      status: "error",
    }),
    "Staging blocked by ASOS - anti-bot challenge",
  );
  assert.equal(
    createStagingFailureExplanation({ retailer: "Asket", status: "login_expired" }),
    "Login expired",
  );
  assert.deepEqual(
    renderRetailerStagingFailureCard({
      cartUrl: "https://www.asos.com/basket/",
      failure: {
        candidate: { productUrl: "https://www.asos.com/product/123" },
        result: { status: "error", error: "Site returned 500" },
      },
      retailer: "ASOS",
    }),
    {
      explanation: "Site error",
      manualLink: {
        href: "https://www.asos.com/product/123",
        label: "Open in ASOS to complete manually",
      },
      retailer: "ASOS",
      status: "error",
      type: "retailer_staging_failure_card",
    },
  );
});

test("creates a discovery-only Feed item for retailer circuit-breaker mode", () => {
  assert.deepEqual(createDiscoveryOnlyRetailerFeedItem("Zalando.lv"), {
    event: "discovery_only",
    retailer: "Zalando.lv",
    title: "Zalando.lv in discovery-only mode",
    type: "shopping_feed_item",
  });
});

function failSearchTool() {
  return {
    async search() {
      throw new Error("search should not be called");
    },
  };
}

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, reject, resolve };
}

function createSearchCandidate(id) {
  return {
    id,
    title: id,
  };
}

function flushAsyncWork() {
  return new Promise((resolve) => setImmediate(resolve));
}
