import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import assert from "node:assert/strict";

import {
  createAsketCartStagingSelectors,
  createAsketProductUrl,
  stageAsketCartItem,
} from "../src/asket-cart-staging-recipe.mjs";
import { readShoppingAuditLog } from "../src/shopping-audit-log.mjs";

test("creates an Asket product URL from a product id", () => {
  assert.equal(
    createAsketProductUrl("the-overshirt"),
    "https://www.asket.com/products/the-overshirt",
  );
});

test("navigates, selects the requested size, adds to cart, and audits each step", async () => {
  const dir = await mkdtemp(join(tmpdir(), "asket-cart-staging-"));
  const auditPath = join(dir, "audit.jsonl");
  const activeCarts = new Map();
  const selectors = createAsketCartStagingSelectors("M");
  const page = new FakePage({
    locators: {
      [selectors.size[0]]: { visible: true },
      [selectors.addToCart[0]]: { visible: true },
    },
  });

  try {
    const result = await stageAsketCartItem({
      activeCarts,
      auditLogPath: auditPath,
      now: () => new Date("2026-05-09T13:05:00.000Z"),
      page,
      productUrl: "https://www.asket.com/products/the-t-shirt",
      selectors,
      size: "M",
    });
    const auditEntries = await readShoppingAuditLog(auditPath);

    assert.equal(result.status, "success");
    assert.deepEqual(result.activeCartRow, {
      cartUrl: "https://www.asket.com/en-dk/cart",
      itemCount: 1,
      lastStagedAt: "2026-05-09T13:05:00.000Z",
      retailer: "Asket",
    });
    assert.deepEqual([...activeCarts.values()], [result.activeCartRow]);
    assert.deepEqual(page.events, [
      ["goto", "https://www.asket.com/products/the-t-shirt"],
      ["click", selectors.size[0]],
      ["click", selectors.addToCart[0]],
    ]);
    assert.deepEqual(
      auditEntries.map((entry) => [entry.actionType, entry.status, entry.retailer]),
      [
        ["page_read", "started", "Asket"],
        ["page_read", "succeeded", "Asket"],
        ["size_select", "started", "Asket"],
        ["size_select", "succeeded", "Asket"],
        ["cart_add", "started", "Asket"],
        ["cart_add", "succeeded", "Asket"],
      ],
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("returns out_of_stock when the selected size cannot be added", async () => {
  const selectors = createAsketCartStagingSelectors("XL");
  const page = new FakePage({
    locators: {
      [selectors.size[0]]: { visible: true },
      [selectors.outOfStock[0]]: { visible: true },
      [selectors.addToCart[0]]: { visible: true },
    },
  });

  const result = await stageAsketCartItem({
    audit: captureAudit(),
    flushAudit: undefined,
    page,
    productId: "the-overshirt",
    selectors,
    size: "XL",
  });

  assert.equal(result.status, "out_of_stock");
  assert.equal(result.productUrl, "https://www.asket.com/products/the-overshirt");
  assert.deepEqual(page.events, [
    ["goto", "https://www.asket.com/products/the-overshirt"],
    ["click", selectors.size[0]],
  ]);
});

test("returns out_of_stock when the add-to-cart control is disabled", async () => {
  const selectors = createAsketCartStagingSelectors("L");
  const page = new FakePage({
    locators: {
      [selectors.size[0]]: { visible: true },
      [selectors.addToCart[0]]: { enabled: false, visible: true },
    },
  });

  const result = await stageAsketCartItem({
    audit: captureAudit(),
    flushAudit: undefined,
    page,
    productUrl: "https://www.asket.com/products/the-shirt",
    selectors,
    size: "L",
  });

  assert.equal(result.status, "out_of_stock");
  assert.deepEqual(page.events, [
    ["goto", "https://www.asket.com/products/the-shirt"],
    ["click", selectors.size[0]],
  ]);
});

test("returns login_expired before size selection when Asket redirects to login", async () => {
  const selectors = createAsketCartStagingSelectors("S");
  const page = new FakePage({
    locators: {
      [selectors.loginExpired[0]]: { visible: true },
      [selectors.size[0]]: { visible: true },
    },
  });
  const audits = [];

  const result = await stageAsketCartItem({
    audit: captureAudit(audits),
    flushAudit: undefined,
    page,
    productUrl: "https://www.asket.com/products/the-shirt",
    selectors,
    size: "S",
  });

  assert.equal(result.status, "login_expired");
  assert.deepEqual(page.events, [["goto", "https://www.asket.com/products/the-shirt"]]);
  assert.deepEqual(
    audits.map((entry) => [entry.actionType, entry.status]),
    [
      ["page_read", "started"],
      ["page_read", "failed"],
    ],
  );
});

test("returns error when the requested size control is missing", async () => {
  const selectors = createAsketCartStagingSelectors("XS");
  const page = new FakePage();
  const audits = [];

  const result = await stageAsketCartItem({
    audit: captureAudit(audits),
    flushAudit: undefined,
    page,
    productUrl: "https://www.asket.com/products/the-shirt",
    selectors,
    size: "XS",
  });

  assert.equal(result.status, "error");
  assert.match(result.error, /size XS/);
  assert.deepEqual(audits.at(-1), {
    actionType: "size_select",
    retailer: "Asket",
    status: "failed",
  });
});

function captureAudit(target = []) {
  return (entry) => {
    target.push(entry);
  };
}

class FakePage {
  constructor({ locators = {} } = {}) {
    this.events = [];
    this.locators = locators;
  }

  async goto(url) {
    this.events.push(["goto", url]);
  }

  locator(selector) {
    return new FakeLocator({
      events: this.events,
      selector,
      state: this.locators[selector],
    });
  }
}

class FakeLocator {
  constructor({ events, selector, state }) {
    this.events = events;
    this.selector = selector;
    this.state = state;
  }

  first() {
    return this;
  }

  async count() {
    return this.state ? 1 : 0;
  }

  async isVisible() {
    return Boolean(this.state?.visible);
  }

  async isEnabled() {
    return this.state?.enabled !== false;
  }

  async click() {
    this.events.push(["click", this.selector]);
  }
}
