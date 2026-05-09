import { mkdtemp, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import assert from "node:assert/strict";

import {
  ASKET_RETAILER_IDENTIFIER,
  searchAsketProducts,
} from "../src/asket-product-search.mjs";

const SHIRT_INTENT = {
  garmentClass: "shirt",
  size: "M",
  colorKeywords: ["white", "off white"],
  priceCeiling: { amount: 120, currency: "EUR" },
};

test("returns up to 3 ranked Asket product candidates for a structured intent", async () => {
  const results = await searchAsketProducts({
    intent: SHIRT_INTENT,
    products: [
      product({
        title: "The Oxford Shirt",
        color: "White",
        price: { amount: 95, currency: "EUR" },
        sizes: ["S", "M", "L"],
      }),
      product({
        title: "The Overshirt",
        color: "Off White",
        price: { amount: 115, currency: "EUR" },
        sizes: ["M"],
      }),
      product({
        title: "The Linen Shirt",
        color: "White",
        price: { amount: 105, currency: "EUR" },
        sizes: ["M"],
      }),
      product({
        title: "The Pique Shirt",
        color: "White",
        price: { amount: 88, currency: "EUR" },
        sizes: ["M"],
      }),
    ],
  });

  assert.equal(results.length, 3);
  assert.deepEqual(
    results.map((result) => result.title),
    ["The Pique Shirt", "The Oxford Shirt", "The Linen Shirt"],
  );
  assert.deepEqual(Object.keys(results[0]), [
    "productUrl",
    "imageUrl",
    "brand",
    "title",
    "size",
    "color",
    "price",
    "reasoning",
  ]);
  assert.equal(results[0].brand, "Asket");
  assert.equal(results[0].size, "M");
  assert.match(results[0].reasoning, /Matches shirt, white\/off white, size M under EUR 120\./);
});

test("filters candidates above the price ceiling and mismatched size or color", async () => {
  const results = await searchAsketProducts({
    intent: SHIRT_INTENT,
    products: [
      product({
        title: "The Oxford Shirt",
        color: "White",
        price: { amount: 121, currency: "EUR" },
        sizes: ["M"],
      }),
      product({
        title: "The Linen Shirt",
        color: "Blue",
        price: { amount: 95, currency: "EUR" },
        sizes: ["M"],
      }),
      product({
        title: "The Pique Shirt",
        color: "White",
        price: { amount: 95, currency: "EUR" },
        sizes: ["L"],
      }),
      product({
        title: "The Denim Shirt",
        color: "White",
        price: { amount: 95, currency: "EUR" },
        sizes: ["M"],
      }),
    ],
  });

  assert.deepEqual(
    results.map((result) => result.title),
    ["The Denim Shirt"],
  );
});

test("returns an empty list gracefully when no candidates match", async () => {
  const results = await searchAsketProducts({
    intent: SHIRT_INTENT,
    products: [
      product({
        title: "The Chino",
        color: "Black",
        price: { amount: 80, currency: "EUR" },
        sizes: ["M"],
      }),
    ],
  });

  assert.deepEqual(results, []);
});

test("uses a search adapter with Asket search URL and normalized intent", async () => {
  const calls = [];

  const results = await searchAsketProducts({
    intent: {
      garmentClass: "  shirt ",
      size: " m ",
      colors: [" white ", "white"],
      priceCeiling: 100,
    },
    searchProducts: async (payload) => {
      calls.push(payload);
      return [
        product({
          title: "The Oxford Shirt",
          color: "White",
          price: { amount: 95, currency: "EUR" },
          sizes: ["M"],
        }),
      ];
    },
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].retailerIdentifier, ASKET_RETAILER_IDENTIFIER);
  assert.deepEqual(calls[0].intent, {
    garmentClass: "shirt",
    size: "m",
    colorKeywords: ["white"],
    priceCeiling: { amount: 100, currency: "EUR" },
  });
  assert.equal(calls[0].searchUrl, "https://www.asket.com/en-dk/search?q=shirt+white");
  assert.equal(results.length, 1);
});

test("launches the visible browser with Asket's persistent profile when a launcher is provided", async () => {
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
    const results = await searchAsketProducts({
      intent: SHIRT_INTENT,
      launcher,
      profilesRoot,
      searchProducts: async ({ session: callbackSession, searchUrl }) => {
        assert.equal(callbackSession, session);
        assert.equal(searchUrl, "https://www.asket.com/en-dk/search?q=shirt+white+off+white");
        return [
          product({
            title: "The Oxford Shirt",
            color: "White",
            price: { amount: 95, currency: "EUR" },
            sizes: ["M"],
          }),
        ];
      },
    });

    assert.equal(results.length, 1);
    assert.deepEqual(
      events.map((event) => event[0]),
      ["launch", "title", "foreground", "goto", "background"],
    );
    assert.equal(events[0][1].retailer, "Asket");
    assert.equal(events[0][1].startUrl, "https://www.asket.com/en-dk/search?q=shirt+white+off+white");
    assert.equal(events[0][1].headless, false);
  } finally {
    await rm(profilesRoot, { recursive: true, force: true });
  }
});

function product(overrides = {}) {
  return {
    productUrl: "https://www.asket.com/en-dk/mens/shirts/oxford-shirt-white",
    imageUrl: "https://www.asket.com/images/oxford-shirt-white.jpg",
    title: "The Oxford Shirt",
    color: "White",
    price: { amount: 95, currency: "EUR" },
    ...overrides,
  };
}

async function mkProfileRoot() {
  return mkdtemp(join(tmpdir(), "asket-product-search-"));
}
