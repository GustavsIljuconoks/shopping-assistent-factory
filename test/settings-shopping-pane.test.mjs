import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  CONNECTED_RETAILERS_EMPTY_STATE,
  DEFAULT_RETAILERS,
  SHOPPING_ACTIVITY_EMPTY_STATE,
  persistSettingsShoppingProfileChange,
  SHOPPING_MEMORY_FILTER_LABEL,
  SHOPPING_SETUP_PLACEHOLDER,
  renderRetailerProposalCard,
  renderSettingsApp,
  renderSettingsMemoriesPane,
  renderSettingsPrivacyPane,
  renderSettingsShoppingPane,
} from "../src/settings-shopping-pane.mjs";
import {
  createDefaultShoppingProfile,
  readShoppingProfile,
  writeShoppingProfile,
} from "../src/shopping-profile.mjs";

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
  assert.match(html, /Shopping region/);
  assert.match(html, /Enabled retailers/);
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
  assert.match(html, /Using default shopping profile values\./);
  assert.match(html, /name="country" type="text" value="LV"/);
  assert.match(html, /name="currency" type="text" value="EUR"/);
  assert.match(html, /name="sizes\.tops\.value"/);
  assert.match(html, /name="budgetAnchors\.tops\.amount"/);
  assert.match(html, /name="perItemPriceCeiling\.amount" type="number"/);
  assert.match(html, /name="hardExclusions"/);
  assert.equal((html.match(/name="enabledRetailers"/g) ?? []).length, DEFAULT_RETAILERS.length);
});

test("renders present shopping profile fields as editable in-place controls", () => {
  const html = renderSettingsShoppingPane({
    profile: {
      country: "LV",
      currency: "EUR",
      sizes: {
        tops: { value: "M", system: "International", notes: "Regular fit" },
      },
      budgetAnchors: {
        tops: { amount: 80, currency: "EUR", cadence: "seasonal", notes: "Prefer sale" },
      },
      hardExclusions: ["leather", "dry clean only"],
      perItemPriceCeiling: { amount: 150, currency: "EUR" },
      enabledRetailers: ["Asket", "ASOS"],
    },
  });

  assert.match(html, /Profile data loaded\./);
  assert.match(html, /value="M"/);
  assert.match(html, /value="International"/);
  assert.match(html, /Regular fit/);
  assert.match(html, /value="80"/);
  assert.match(html, /Prefer sale/);
  assert.match(html, /leather\n?dry clean only/);
  assert.match(html, /value="150"/);
  assert.match(html, /value="Asket"[^>]+checked/);
  assert.match(html, /value="ASOS"[^>]+checked/);
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

test("renders discovery-only status for connected retailers", () => {
  const html = renderSettingsShoppingPane({
    connectedRetailers: [
      {
        retailerIdentifier: "Asket",
        status: "Connected",
        discoveryOnly: true,
      },
    ],
  });

  assert.match(html, /connected-retailer--discovery-only/);
  assert.match(html, /<span class="connected-retailer-status">Discovery-only<\/span>/);
});

test("persists individual Settings Shopping changes immediately", async () => {
  const dir = await mkdtemp(join(tmpdir(), "settings-shopping-pane-"));
  const path = join(dir, "profile.json");

  try {
    await writeShoppingProfile(createDefaultShoppingProfile(), path);

    await persistSettingsShoppingProfileChange({ field: "country", value: "de" }, { profilePath: path });
    await persistSettingsShoppingProfileChange(
      {
        field: "size",
        garmentClass: "tops",
        value: { value: "L", system: "International", notes: "Relaxed fit" },
      },
      { profilePath: path },
    );
    await persistSettingsShoppingProfileChange(
      {
        field: "budgetAnchor",
        garmentClass: "tops",
        value: { amount: "95", currency: "EUR", cadence: "seasonal" },
      },
      { profilePath: path },
    );
    await persistSettingsShoppingProfileChange(
      { field: "hardExclusions", value: "leather\npolyester, dry clean only" },
      { profilePath: path },
    );
    await persistSettingsShoppingProfileChange(
      { field: "perItemPriceCeiling", value: { amount: "180", currency: "EUR" } },
      { profilePath: path },
    );
    await persistSettingsShoppingProfileChange(
      { field: "enabledRetailer", retailer: "Asket", enabled: true },
      { profilePath: path },
    );

    const profile = await readShoppingProfile(path);

    assert.equal(profile.country, "DE");
    assert.deepEqual(profile.sizes.tops, {
      value: "L",
      system: "International",
      notes: "Relaxed fit",
    });
    assert.deepEqual(profile.budgetAnchors.tops, {
      amount: 95,
      currency: "EUR",
      cadence: "seasonal",
    });
    assert.deepEqual(profile.hardExclusions, ["leather", "polyester", "dry clean only"]);
    assert.deepEqual(profile.perItemPriceCeiling, { amount: 180, currency: "EUR" });
    assert.deepEqual(profile.enabledRetailers, ["Asket"]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
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

test("renders discovery-only proposal cards with a manual open link instead of Stage", () => {
  const html = renderRetailerProposalCard(
    createProposalCard({
      retailer: "ASOS",
      discoveryOnly: true,
      candidates: [
        createCandidate({
          brand: "ASOS",
          productUrl: "https://www.asos.com/asos-design/product/prd/123",
          selected: true,
          title: "ASOS Tee",
        }),
      ],
    }),
  );

  assert.match(html, /proposal-card--discovery-only/);
  assert.match(html, /discovery-only/);
  assert.match(html, /Open in ASOS to add manually/);
  assert.match(html, /href="https:\/\/www\.asos\.com\/asos-design\/product\/prd\/123"/);
  assert.doesNotMatch(html, /proposal-stage-button/);
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
