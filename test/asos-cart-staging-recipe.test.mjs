import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import assert from "node:assert/strict";

import {
  createAsosCartStagingSelectors,
  createAsosProductUrl,
  stageAsosCartItem,
} from "../src/asos-cart-staging-recipe.mjs";
import { readShoppingAuditLog } from "../src/shopping-audit-log.mjs";

test("creates a ASOS product URL from a product id path", () => {
  assert.equal(
    createAsosProductUrl("selected-femme-oxford-shirt-white-se521e1ab-a11.html"),
    "https://www.asos.com/selected-femme-oxford-shirt-white-se521e1ab-a11.html",
  );
});

test("navigates, selects the requested size, adds to cart, and audits each step", async () => {
  const dir = await mkdtemp(join(tmpdir(), "asos-cart-staging-"));
  const auditPath = join(dir, "audit.jsonl");
  const activeCarts = new Map();
  const selectors = createAsosCartStagingSelectors("M");
  const page = new FakePage({
    locators: {
      [selectors.size[0]]: { visible: true },
      [selectors.addToCart[0]]: { visible: true },
    },
  });

  try {
    const result = await stageAsosCartItem({
      activeCarts,
      auditLogPath: auditPath,
      now: () => new Date("2026-05-09T13:05:00.000Z"),
      page,
      productUrl: "https://www.asos.com/product.html",
      selectors,
      size: "M",
    });
    const auditEntries = await readShoppingAuditLog(auditPath);

    assert.equal(result.status, "success");
    assert.deepEqual(result.activeCartRow, {
      cartUrl: "https://www.asos.com/basket/",
      itemCount: 1,
      lastStagedAt: "2026-05-09T13:05:00.000Z",
      retailer: "ASOS",
    });
    assert.deepEqual(page.events, [
      ["goto", "https://www.asos.com/product.html"],
      ["click", selectors.size[0]],
      ["click", selectors.addToCart[0]],
    ]);
    assert.deepEqual(
      auditEntries.map((entry) => [entry.actionType, entry.status, entry.retailer]),
      [
        ["page_read", "started", "ASOS"],
        ["page_read", "succeeded", "ASOS"],
        ["size_select", "started", "ASOS"],
        ["size_select", "succeeded", "ASOS"],
        ["cart_add", "started", "ASOS"],
        ["cart_add", "succeeded", "ASOS"],
      ],
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("opens the ASOS size menu when the size option is not initially visible", async () => {
  const selectors = createAsosCartStagingSelectors("XL");
  const page = new FakePage({
    locators: {
      [selectors.sizeMenu[0]]: { visible: true },
      [selectors.size[0]]: { visibleAfterClicks: 1 },
      [selectors.addToCart[0]]: { visible: true },
    },
  });

  const result = await stageAsosCartItem({
    audit: captureAudit(),
    flushAudit: undefined,
    page,
    productId: "product.html",
    selectors,
    size: "XL",
  });

  assert.equal(result.status, "success");
  assert.deepEqual(page.events, [
    ["goto", "https://www.asos.com/product.html"],
    ["click", selectors.sizeMenu[0]],
    ["click", selectors.size[0]],
    ["click", selectors.addToCart[0]],
  ]);
});

test("returns out_of_stock when the selected ASOS size cannot be added", async () => {
  const selectors = createAsosCartStagingSelectors("XL");
  const page = new FakePage({
    locators: {
      [selectors.size[0]]: { visible: true },
      [selectors.outOfStock[0]]: { visible: true },
      [selectors.addToCart[0]]: { visible: true },
    },
  });

  const result = await stageAsosCartItem({
    audit: captureAudit(),
    flushAudit: undefined,
    page,
    productId: "product.html",
    selectors,
    size: "XL",
  });

  assert.equal(result.status, "out_of_stock");
  assert.equal(result.productUrl, "https://www.asos.com/product.html");
  assert.deepEqual(page.events, [
    ["goto", "https://www.asos.com/product.html"],
    ["click", selectors.size[0]],
  ]);
});

test("returns login_expired before size selection when ASOS redirects to login", async () => {
  const selectors = createAsosCartStagingSelectors("S");
  const page = new FakePage({
    locators: {
      [selectors.loginExpired[0]]: { visible: true },
      [selectors.size[0]]: { visible: true },
    },
  });
  const audits = [];

  const result = await stageAsosCartItem({
    audit: captureAudit(audits),
    flushAudit: undefined,
    page,
    productUrl: "https://www.asos.com/product.html",
    selectors,
    size: "S",
  });

  assert.equal(result.status, "login_expired");
  assert.deepEqual(page.events, [["goto", "https://www.asos.com/product.html"]]);
  assert.deepEqual(
    audits.map((entry) => [entry.actionType, entry.status]),
    [
      ["page_read", "started"],
      ["page_read", "failed"],
    ],
  );
});

test("pauses for an ASOS anti-bot handoff and returns an error when it times out", async () => {
  const selectors = createAsosCartStagingSelectors("M");
  const page = new FakePage({
    evaluateResult: true,
    locators: {
      [selectors.size[0]]: { visible: true },
      [selectors.addToCart[0]]: { visible: true },
    },
  });
  const handoffs = [];

  const result = await stageAsosCartItem({
    audit: captureAudit(),
    browserRun: {
      async waitForUserAction(payload) {
        handoffs.push(payload.reason);
        throw new Error("Timed out waiting for ASOS cloudflare challenge to be resolved.");
      },
    },
    flushAudit: undefined,
    page,
    productUrl: "https://www.asos.com/product.html",
    selectors,
    size: "M",
  });

  assert.equal(result.status, "error");
  assert.match(result.error, /Timed out waiting for ASOS cloudflare challenge/);
  assert.deepEqual(handoffs, ["cloudflare"]);
  assert.deepEqual(page.events, [["goto", "https://www.asos.com/product.html"], ["evaluate"]]);
});

test("returns error when the requested ASOS size control is missing", async () => {
  const selectors = createAsosCartStagingSelectors("XS");
  const page = new FakePage();
  const audits = [];

  const result = await stageAsosCartItem({
    audit: captureAudit(audits),
    flushAudit: undefined,
    page,
    productUrl: "https://www.asos.com/product.html",
    selectors,
    size: "XS",
  });

  assert.equal(result.status, "error");
  assert.match(result.error, /size XS/);
  assert.deepEqual(audits.at(-1), {
    actionType: "size_select",
    retailer: "ASOS",
    status: "failed",
  });
});

function captureAudit(target = []) {
  return (entry) => {
    target.push(entry);
  };
}

class FakePage {
  constructor({ evaluateResult, locators = {} } = {}) {
    this.events = [];
    this.locators = locators;
    if (evaluateResult !== undefined) {
      this.evaluate = async () => {
        this.events.push(["evaluate"]);
        return evaluateResult;
      };
    }
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
  return mkdtemp(join(tmpdir(), "asos-cart-staging-"));
}
