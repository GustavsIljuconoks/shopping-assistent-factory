import { mkdtemp, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import assert from "node:assert/strict";

import {
  ZALANDO_RETAILER_IDENTIFIER,
  searchZalandoProducts,
} from "../src/zalando-product-search.mjs";

const SHIRT_INTENT = {
  garmentClass: "shirt",
  size: "M",
  colorKeywords: ["white", "off white"],
  priceCeiling: { amount: 120, currency: "EUR" },
};

test("returns up to 3 ranked Zalando.lv product candidates for a structured intent", async () => {
  const results = await searchZalandoProducts({
    intent: SHIRT_INTENT,
    products: [
      product({ title: "Oxford Shirt", price: { amount: 95, currency: "EUR" }, sizes: ["S", "M"] }),
      product({ title: "Relaxed Overshirt", color: "Off White", price: { amount: 115, currency: "EUR" }, sizes: ["M"] }),
      product({ title: "Linen Shirt", price: { amount: 105, currency: "EUR" }, sizes: ["M"] }),
      product({ title: "Pique Shirt", price: { amount: 88, currency: "EUR" }, sizes: ["M"] }),
    ],
  });

  assert.equal(results.length, 3);
  assert.deepEqual(
    results.map((result) => result.title),
    ["Relaxed Overshirt", "Pique Shirt", "Oxford Shirt"],
  );
  assert.equal(results[0].brand, "Zalando.lv");
  assert.equal(results[0].size, "M");
  assert.match(results[0].reasoning, /Matches shirt, white\/off white, size M under EUR 120\./);
});

test("filters Zalando.lv candidates above the price ceiling and mismatched size or color", async () => {
  const results = await searchZalandoProducts({
    intent: SHIRT_INTENT,
    products: [
      product({ title: "Oxford Shirt", price: { amount: 121, currency: "EUR" }, sizes: ["M"] }),
      product({ title: "Linen Shirt", color: "Blue", price: { amount: 95, currency: "EUR" }, sizes: ["M"] }),
      product({ title: "Pique Shirt", price: { amount: 95, currency: "EUR" }, sizes: ["L"] }),
      product({ title: "Denim Shirt", price: { amount: 95, currency: "EUR" }, sizes: ["M"] }),
    ],
  });

  assert.deepEqual(
    results.map((result) => result.title),
    ["Denim Shirt"],
  );
});

test("parses Zalando.lv price text during candidate extraction", async () => {
  const results = await searchZalandoProducts({
    intent: SHIRT_INTENT,
    products: [
      product({
        title: "Text Price Shirt",
        price: undefined,
        priceText: "€ 79,95",
        sizes: ["M"],
      }),
    ],
  });

  assert.equal(results.length, 1);
  assert.deepEqual(results[0].price, { amount: 79.95, currency: "EUR" });
});

test("de-prioritizes Zalando.lv candidates that match negative Shopping memories", async () => {
  const results = await searchZalandoProducts({
    intent: SHIRT_INTENT,
    memories: [
      {
        content: "Returned the Oxford shirt because the collar was scratchy.",
        sentiment: "negative",
        tags: ["Shopping"],
        subject: {
          brand: "Zalando.lv",
          title: "Oxford Shirt",
          color: "White",
          size: "M",
        },
      },
    ],
    products: [
      product({ title: "Oxford Shirt", price: { amount: 95, currency: "EUR" }, sizes: ["M"] }),
      product({ title: "Pique Shirt", price: { amount: 95, currency: "EUR" }, sizes: ["M"] }),
    ],
  });

  assert.deepEqual(
    results.map((result) => result.title),
    ["Pique Shirt", "Oxford Shirt"],
  );
  assert.match(results[1].reasoning, /De-prioritized by Shopping memory\./);
});

test("uses a search adapter with Zalando.lv search URL and normalized intent", async () => {
  const calls = [];

  const results = await searchZalandoProducts({
    intent: {
      garmentClass: "  shirt ",
      size: " m ",
      colors: [" white ", "white"],
      priceCeiling: 100,
    },
    searchProducts: async (payload) => {
      calls.push(payload);
      return [product({ title: "Oxford Shirt", price: { amount: 95, currency: "EUR" }, sizes: ["M"] })];
    },
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].retailerIdentifier, ZALANDO_RETAILER_IDENTIFIER);
  assert.deepEqual(calls[0].intent, {
    garmentClass: "shirt",
    size: "m",
    colorKeywords: ["white"],
    priceCeiling: { amount: 100, currency: "EUR" },
  });
  assert.equal(calls[0].searchUrl, "https://www.zalando.lv/catalogs/?q=shirt+white");
  assert.equal(results.length, 1);
});

test("launches the visible browser with Zalando.lv's persistent profile when a launcher is provided", async () => {
  const profilesRoot = await mkProfileRoot();
  const events = [];
  const session = {
    async setWindowTitle(title) {
      events.push(["title", title]);
    },
    async foreground() {
      events.push(["foreground"]);
    },
    async goto(url) {
      events.push(["goto", url]);
    },
    async background() {
      events.push(["background"]);
    },
  };
  const launcher = {
    async launch(options) {
      events.push(["launch", options]);
      await stat(options.userDataDir);
      return session;
    },
  };

  try {
    const results = await searchZalandoProducts({
      intent: SHIRT_INTENT,
      launcher,
      profilesRoot,
      searchProducts: async ({ session: callbackSession, searchUrl }) => {
        assert.equal(callbackSession, session);
        assert.equal(searchUrl, "https://www.zalando.lv/catalogs/?q=shirt+white+off+white");
        return [product({ title: "Oxford Shirt", price: { amount: 95, currency: "EUR" }, sizes: ["M"] })];
      },
    });

    assert.equal(results.length, 1);
    assert.deepEqual(
      events.map((event) => event[0]),
      ["launch", "title", "foreground", "goto", "background"],
    );
    assert.equal(events[0][1].retailer, "Zalando.lv");
    assert.equal(events[0][1].startUrl, "https://www.zalando.lv/catalogs/?q=shirt+white+off+white");
    assert.equal(events[0][1].headless, false);
  } finally {
    await rm(profilesRoot, { recursive: true, force: true });
  }
});

test("extracts Zalando.lv candidates from the browser session when no adapter is provided", async () => {
  const profilesRoot = await mkProfileRoot();
  const session = {
    async setWindowTitle() {},
    async foreground() {},
    async goto() {},
    async background() {},
    async extractProducts({ retailerIdentifier }) {
      assert.equal(retailerIdentifier, ZALANDO_RETAILER_IDENTIFIER);
      return [
        product({
          title: "Browser Extracted Shirt",
          priceText: "€ 89,95",
          price: undefined,
          sizes: ["M"],
        }),
      ];
    },
  };
  const launcher = {
    async launch() {
      return session;
    },
  };

  try {
    const results = await searchZalandoProducts({
      intent: SHIRT_INTENT,
      launcher,
      profilesRoot,
    });

    assert.deepEqual(
      results.map((result) => [result.title, result.price]),
      [["Browser Extracted Shirt", { amount: 89.95, currency: "EUR" }]],
    );
  } finally {
    await rm(profilesRoot, { recursive: true, force: true });
  }
});

function product(overrides = {}) {
  return {
    productUrl: "https://www.zalando.lv/selected-femme-oxford-shirt-white-se521e1ab-a11.html",
    imageUrl: "https://img01.ztat.net/article/selected-femme-oxford-shirt-white.jpg",
    title: "Oxford Shirt",
    color: "White",
    price: { amount: 95, currency: "EUR" },
    ...overrides,
  };
}

async function mkProfileRoot() {
  return mkdtemp(join(tmpdir(), "zalando-product-search-"));
}
