import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import assert from "node:assert/strict";

import {
  createHmCartStagingSelectors,
  createHmProductUrl,
  stageHmCartItem,
} from "../src/hm-cart-staging-recipe.mjs";
import { readShoppingAuditLog } from "../src/shopping-audit-log.mjs";

test("creates a H&M.lv product URL from a product id path", () => {
  assert.equal(
    createHmProductUrl("selected-femme-oxford-shirt-white-se521e1ab-a11.html"),
    "https://www2.hm.com/lv_lv/selected-femme-oxford-shirt-white-se521e1ab-a11.html",
  );
});

test("navigates, selects the requested size, adds to cart, and audits each step", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hm-cart-staging-"));
  const auditPath = join(dir, "audit.jsonl");
  const activeCarts = new Map();
  const selectors = createHmCartStagingSelectors("M");
  const page = new FakePage({
    locators: {
      [selectors.size[0]]: { visible: true },
      [selectors.addToCart[0]]: { visible: true },
    },
  });

  try {
    const result = await stageHmCartItem({
      activeCarts,
      auditLogPath: auditPath,
      now: () => new Date("2026-05-09T13:05:00.000Z"),
      page,
      productUrl: "https://www2.hm.com/lv_lv/product.html",
      selectors,
      size: "M",
    });
    const auditEntries = await readShoppingAuditLog(auditPath);

    assert.equal(result.status, "success");
    assert.deepEqual(result.activeCartRow, {
      cartUrl: "https://www2.hm.com/lv_lv/cart",
      itemCount: 1,
      lastStagedAt: "2026-05-09T13:05:00.000Z",
      retailer: "H&M.lv",
    });
    assert.deepEqual(page.events, [
      ["goto", "https://www2.hm.com/lv_lv/product.html"],
      ["click", selectors.size[0]],
      ["click", selectors.addToCart[0]],
    ]);
    assert.deepEqual(
      auditEntries.map((entry) => [entry.actionType, entry.status, entry.retailer]),
      [
        ["page_read", "started", "H&M.lv"],
        ["page_read", "succeeded", "H&M.lv"],
        ["size_select", "started", "H&M.lv"],
        ["size_select", "succeeded", "H&M.lv"],
        ["cart_add", "started", "H&M.lv"],
        ["cart_add", "succeeded", "H&M.lv"],
      ],
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("opens the H&M.lv size menu when the size option is not initially visible", async () => {
  const selectors = createHmCartStagingSelectors("XL");
  const page = new FakePage({
    locators: {
      [selectors.sizeMenu[0]]: { visible: true },
      [selectors.size[0]]: { visibleAfterClicks: 1 },
      [selectors.addToCart[0]]: { visible: true },
    },
  });

  const result = await stageHmCartItem({
    audit: captureAudit(),
    flushAudit: undefined,
    page,
    productId: "product.html",
    selectors,
    size: "XL",
  });

  assert.equal(result.status, "success");
  assert.deepEqual(page.events, [
    ["goto", "https://www2.hm.com/lv_lv/product.html"],
    ["click", selectors.sizeMenu[0]],
    ["click", selectors.size[0]],
    ["click", selectors.addToCart[0]],
  ]);
});

test("returns out_of_stock when the selected H&M.lv size cannot be added", async () => {
  const selectors = createHmCartStagingSelectors("XL");
  const page = new FakePage({
    locators: {
      [selectors.size[0]]: { visible: true },
      [selectors.outOfStock[0]]: { visible: true },
      [selectors.addToCart[0]]: { visible: true },
    },
  });

  const result = await stageHmCartItem({
    audit: captureAudit(),
    flushAudit: undefined,
    page,
    productId: "product.html",
    selectors,
    size: "XL",
  });

  assert.equal(result.status, "out_of_stock");
  assert.equal(result.productUrl, "https://www2.hm.com/lv_lv/product.html");
  assert.deepEqual(page.events, [
    ["goto", "https://www2.hm.com/lv_lv/product.html"],
    ["click", selectors.size[0]],
  ]);
});

test("returns login_expired before size selection when H&M.lv redirects to login", async () => {
  const selectors = createHmCartStagingSelectors("S");
  const page = new FakePage({
    locators: {
      [selectors.loginExpired[0]]: { visible: true },
      [selectors.size[0]]: { visible: true },
    },
  });
  const audits = [];

  const result = await stageHmCartItem({
    audit: captureAudit(audits),
    flushAudit: undefined,
    page,
    productUrl: "https://www2.hm.com/lv_lv/product.html",
    selectors,
    size: "S",
  });

  assert.equal(result.status, "login_expired");
  assert.deepEqual(page.events, [["goto", "https://www2.hm.com/lv_lv/product.html"]]);
  assert.deepEqual(
    audits.map((entry) => [entry.actionType, entry.status]),
    [
      ["page_read", "started"],
      ["page_read", "failed"],
    ],
  );
});

test("returns error when the requested H&M.lv size control is missing", async () => {
  const selectors = createHmCartStagingSelectors("XS");
  const page = new FakePage();
  const audits = [];

  const result = await stageHmCartItem({
    audit: captureAudit(audits),
    flushAudit: undefined,
    page,
    productUrl: "https://www2.hm.com/lv_lv/product.html",
    selectors,
    size: "XS",
  });

  assert.equal(result.status, "error");
  assert.match(result.error, /size XS/);
  assert.deepEqual(audits.at(-1), {
    actionType: "size_select",
    retailer: "H&M.lv",
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
    if (!this.state) {
      return false;
    }
    const clicks = this.events.filter((event) => event[0] === "click").length;
    return Boolean(this.state.visible || clicks >= this.state.visibleAfterClicks);
  }

  async isEnabled() {
    return this.state?.enabled !== false;
  }

  async click() {
    this.events.push(["click", this.selector]);
  }
}

async function mkProfileRoot() {
  return mkdtemp(join(tmpdir(), "hm-cart-staging-"));
}
