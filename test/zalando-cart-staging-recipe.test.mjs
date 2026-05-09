import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import assert from "node:assert/strict";

import {
  createZalandoCartStagingSelectors,
  createZalandoProductUrl,
  stageZalandoCartItem,
} from "../src/zalando-cart-staging-recipe.mjs";
import { readShoppingAuditLog } from "../src/shopping-audit-log.mjs";

test("creates a Zalando.lv product URL from a product id path", () => {
  assert.equal(
    createZalandoProductUrl("selected-femme-oxford-shirt-white-se521e1ab-a11.html"),
    "https://www.zalando.lv/selected-femme-oxford-shirt-white-se521e1ab-a11.html",
  );
});

test("navigates, selects the requested size, adds to cart, and audits each step", async () => {
  const dir = await mkdtemp(join(tmpdir(), "zalando-cart-staging-"));
  const auditPath = join(dir, "audit.jsonl");
  const activeCarts = new Map();
  const selectors = createZalandoCartStagingSelectors("M");
  const page = new FakePage({
    locators: {
      [selectors.size[0]]: { visible: true },
      [selectors.addToCart[0]]: { visible: true },
    },
  });

  try {
    const result = await stageZalandoCartItem({
      activeCarts,
      auditLogPath: auditPath,
      now: () => new Date("2026-05-09T13:05:00.000Z"),
      page,
      productUrl: "https://www.zalando.lv/product.html",
      selectors,
      size: "M",
    });
    const auditEntries = await readShoppingAuditLog(auditPath);

    assert.equal(result.status, "success");
    assert.deepEqual(result.activeCartRow, {
      cartUrl: "https://www.zalando.lv/cart/",
      itemCount: 1,
      lastStagedAt: "2026-05-09T13:05:00.000Z",
      retailer: "Zalando.lv",
    });
    assert.deepEqual(page.events, [
      ["goto", "https://www.zalando.lv/product.html"],
      ["click", selectors.size[0]],
      ["click", selectors.addToCart[0]],
    ]);
    assert.deepEqual(
      auditEntries.map((entry) => [entry.actionType, entry.status, entry.retailer]),
      [
        ["page_read", "started", "Zalando.lv"],
        ["page_read", "succeeded", "Zalando.lv"],
        ["size_select", "started", "Zalando.lv"],
        ["size_select", "succeeded", "Zalando.lv"],
        ["cart_add", "started", "Zalando.lv"],
        ["cart_add", "succeeded", "Zalando.lv"],
      ],
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("opens the Zalando.lv size menu when the size option is not initially visible", async () => {
  const selectors = createZalandoCartStagingSelectors("XL");
  const page = new FakePage({
    locators: {
      [selectors.sizeMenu[0]]: { visible: true },
      [selectors.size[0]]: { visibleAfterClicks: 1 },
      [selectors.addToCart[0]]: { visible: true },
    },
  });

  const result = await stageZalandoCartItem({
    audit: captureAudit(),
    flushAudit: undefined,
    page,
    productId: "product.html",
    selectors,
    size: "XL",
  });

  assert.equal(result.status, "success");
  assert.deepEqual(page.events, [
    ["goto", "https://www.zalando.lv/product.html"],
    ["click", selectors.sizeMenu[0]],
    ["click", selectors.size[0]],
    ["click", selectors.addToCart[0]],
  ]);
});

test("returns out_of_stock when the selected Zalando.lv size cannot be added", async () => {
  const selectors = createZalandoCartStagingSelectors("XL");
  const page = new FakePage({
    locators: {
      [selectors.size[0]]: { visible: true },
      [selectors.outOfStock[0]]: { visible: true },
      [selectors.addToCart[0]]: { visible: true },
    },
  });

  const result = await stageZalandoCartItem({
    audit: captureAudit(),
    flushAudit: undefined,
    page,
    productId: "product.html",
    selectors,
    size: "XL",
  });

  assert.equal(result.status, "out_of_stock");
  assert.equal(result.productUrl, "https://www.zalando.lv/product.html");
  assert.deepEqual(page.events, [
    ["goto", "https://www.zalando.lv/product.html"],
    ["click", selectors.size[0]],
  ]);
});

test("returns login_expired before size selection when Zalando.lv redirects to login", async () => {
  const selectors = createZalandoCartStagingSelectors("S");
  const page = new FakePage({
    locators: {
      [selectors.loginExpired[0]]: { visible: true },
      [selectors.size[0]]: { visible: true },
    },
  });
  const audits = [];

  const result = await stageZalandoCartItem({
    audit: captureAudit(audits),
    flushAudit: undefined,
    page,
    productUrl: "https://www.zalando.lv/product.html",
    selectors,
    size: "S",
  });

  assert.equal(result.status, "login_expired");
  assert.deepEqual(page.events, [["goto", "https://www.zalando.lv/product.html"]]);
  assert.deepEqual(
    audits.map((entry) => [entry.actionType, entry.status]),
    [
      ["page_read", "started"],
      ["page_read", "failed"],
    ],
  );
});

test("returns error when the requested Zalando.lv size control is missing", async () => {
  const selectors = createZalandoCartStagingSelectors("XS");
  const page = new FakePage();
  const audits = [];

  const result = await stageZalandoCartItem({
    audit: captureAudit(audits),
    flushAudit: undefined,
    page,
    productUrl: "https://www.zalando.lv/product.html",
    selectors,
    size: "XS",
  });

  assert.equal(result.status, "error");
  assert.match(result.error, /size XS/);
  assert.deepEqual(audits.at(-1), {
    actionType: "size_select",
    retailer: "Zalando.lv",
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
  return mkdtemp(join(tmpdir(), "zalando-cart-staging-"));
}
