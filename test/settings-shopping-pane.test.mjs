import test from "node:test";
import assert from "node:assert/strict";

import {
  CONNECTED_RETAILERS_EMPTY_STATE,
  SHOPPING_ACTIVITY_EMPTY_STATE,
  SHOPPING_MEMORY_FILTER_LABEL,
  SHOPPING_SETUP_PLACEHOLDER,
  renderRetailerProposalCard,
  renderSettingsApp,
  renderSettingsMemoriesPane,
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

test("renders Settings Memories with a Shopping filter and per-memory controls", () => {
  const html = renderSettingsApp({
    activeSection: "memories",
    memories: [
      createMemory({
        id: "shopping-1",
        content: "Avoid scratchy Oxford collars.",
        pinned: true,
        sentiment: "negative",
        tags: ["Shopping"],
        subject: {
          brand: "Asket",
          title: "The Oxford Shirt",
          color: "White",
          size: "M",
        },
      }),
      createMemory({
        id: "general-1",
        content: "General reminder",
        tags: ["General"],
      }),
    ],
  });

  assert.match(html, /aria-current="page">Memories<\/a>/);
  assert.match(html, new RegExp(SHOPPING_MEMORY_FILTER_LABEL));
  assert.match(html, /aria-label="Shopping memories"/);
  assert.match(html, /overflow-y: auto/);
  assert.match(html, /Avoid scratchy Oxford collars\./);
  assert.match(html, /Asket \/ The Oxford Shirt \/ White \/ M/);
  assert.match(html, /memory-pin-button" aria-pressed="true">Unpin/);
  assert.match(html, /memory-edit-button">Edit/);
  assert.match(html, /memory-wipe-button">Wipe/);
  assert.match(html, /Clear shopping memories/);
  assert.doesNotMatch(html, /General reminder/);
});

test("renders an empty Shopping memory filter state", () => {
  const html = renderSettingsMemoriesPane({ memories: [] });

  assert.match(html, /No Shopping memories yet\./);
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

test("renders per-retailer proposal cards with top candidate pre-selected", () => {
  const html = renderSettingsShoppingPane({
    proposalCards: [
      createProposalCard({
        retailer: "Asket",
        candidates: [
          createCandidate({ brand: "Asket", title: "Merino Tee", reasoning: "Closest size and fabric match." }),
          createCandidate({ brand: "Asket", title: "Pima Tee", reasoning: "Good color match." }),
        ],
      }),
    ],
  });

  assert.match(html, /Retailer proposals/);
  assert.match(html, /aria-label="Asket proposal"/);
  assert.match(html, /1 selected/);
  assert.match(html, /Merino Tee/);
  assert.match(html, /Pima Tee/);
  assert.match(html, /Closest size and fabric match\./);
  assert.match(html, /Open product/);
  assert.match(html, /ETA: 2-4 business days/);
  assert.match(html, /Returns: Free returns within 30 days/);
  assert.match(html, /Stage selected to Asket cart/);
  assert.doesNotMatch(html, /proposal-stage-button" disabled/);
});

test("limits proposal cards to 3 candidates", () => {
  const html = renderRetailerProposalCard(
    createProposalCard({
      candidates: [
        createCandidate({ title: "Candidate 1" }),
        createCandidate({ title: "Candidate 2" }),
        createCandidate({ title: "Candidate 3" }),
        createCandidate({ title: "Candidate 4" }),
      ],
    }),
  );

  assert.match(html, /Candidate 1/);
  assert.match(html, /Candidate 2/);
  assert.match(html, /Candidate 3/);
  assert.doesNotMatch(html, /Candidate 4/);
});

test("disables proposal staging CTA when no candidate can be selected", () => {
  const html = renderRetailerProposalCard(
    createProposalCard({
      candidates: [],
    }),
  );

  assert.match(html, /0 selected/);
  assert.match(html, /No candidates are available/);
  assert.match(html, /<button type="button" class="proposal-stage-button" disabled>/);
});

test("renders staged proposal result with open cart link", () => {
  const html = renderRetailerProposalCard(
    createProposalCard({
      retailer: "Asket",
      stagingStatus: "succeeded",
      stagedCount: 2,
      candidates: [
        createCandidate({ title: "Candidate 1", selected: true }),
        createCandidate({ title: "Candidate 2", selected: true }),
      ],
    }),
  );

  assert.match(html, /proposal-card--staged/);
  assert.match(html, /2 staged/);
  assert.match(html, /Open cart/);
  assert.match(html, /href="https:\/\/asket.example\/cart"/);
  assert.match(html, /Stage selected to Asket cart/);
  assert.match(html, /<button type="button" class="proposal-stage-button" disabled>/);
});

function createProposalCard(overrides = {}) {
  return {
    retailer: "Asket",
    eta: "2-4 business days",
    returnPolicy: "Free returns within 30 days",
    cartUrl: "https://asket.example/cart",
    candidates: [createCandidate()],
    ...overrides,
  };
}

function createCandidate(overrides = {}) {
  return {
    imageUrl: "https://asket.example/product.jpg",
    brand: "Asket",
    title: "Oxford Shirt",
    size: "M",
    color: "White",
    price: "EUR 120",
    reasoning: "Best match for the requested fit and color.",
    productUrl: "https://asket.example/products/oxford-shirt",
    ...overrides,
  };
}

function createMemory(overrides = {}) {
  return {
    id: "memory-1",
    content: "Liked this result.",
    pinned: false,
    sentiment: "positive",
    tags: ["Shopping"],
    timestamp: "2026-05-09T12:00:00.000Z",
    ...overrides,
  };
}
