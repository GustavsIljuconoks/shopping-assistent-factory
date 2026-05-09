import {
  appendShoppingAuditEntry,
  flushShoppingAuditLog,
} from "./shopping-audit-log.mjs";
import { recordStagedCartItem } from "./shopping-active-carts-strip.mjs";

export const ASKET_RETAILER = "Asket";
export const ASKET_BASE_PRODUCT_URL = "https://www.asket.com/products";
export const ASKET_CART_URL = "https://www.asket.com/en-dk/cart";
export const ASKET_CART_STAGING_STATUSES = Object.freeze([
  "success",
  "out_of_stock",
  "login_expired",
  "error",
]);

export function createAsketProductUrl(productId, baseProductUrl = ASKET_BASE_PRODUCT_URL) {
  const normalizedProductId = normalizeNonEmptyString(productId, "productId");
  return `${baseProductUrl.replace(/\/+$/, "")}/${encodeURIComponent(normalizedProductId)}`;
}

export function createAsketCartStagingSelectors(size) {
  const normalizedSize = normalizeNonEmptyString(size, "size");
  const quotedSize = JSON.stringify(normalizedSize);

  return {
    loginExpired: [
      "form[action*='login']",
      "form[action*='account']",
      "text=/log in/i",
      "text=/sign in/i",
      "text=/session expired/i",
    ],
    outOfStock: [
      "text=/out of stock/i",
      "text=/sold out/i",
      "button:has-text(\"Sold out\")",
      "button:has-text(\"Out of stock\")",
    ],
    size: [
      `button:has-text(${quotedSize})`,
      `[data-testid*="size"] button:has-text(${quotedSize})`,
      `[aria-label=${quotedSize}]`,
      `input[name="size"][value=${quotedSize}]`,
    ],
    addToCart: [
      "button:has-text(\"Add to bag\")",
      "button:has-text(\"Add to cart\")",
      "button:has-text(\"Add\")",
      "[data-testid*='add-to-cart']",
      "[data-testid*='add-to-bag']",
    ],
  };
}

export async function stageAsketCartItem({
  page,
  productUrl,
  productId,
  size,
  auditLogPath,
  audit = appendShoppingAuditEntry,
  flushAudit = flushShoppingAuditLog,
  selectors = createAsketCartStagingSelectors(size),
  navigationWaitUntil = "domcontentloaded",
  activeCarts,
  now = () => new Date(),
} = {}) {
  validatePage(page);
  const normalizedSize = normalizeNonEmptyString(size, "size");
  const resolvedProductUrl =
    productUrl === undefined
      ? createAsketProductUrl(productId)
      : normalizeUrl(productUrl, "productUrl");

  const resultBase = {
    productUrl: resolvedProductUrl,
    retailer: ASKET_RETAILER,
    size: normalizedSize,
  };

  if (productId !== undefined) {
    resultBase.productId = normalizeNonEmptyString(productId, "productId");
  }

  let activeActionType = "cart_add";

  try {
    activeActionType = "page_read";
    auditStep(audit, auditLogPath, "page_read", "started");
    await page.goto(resolvedProductUrl, { waitUntil: navigationWaitUntil });

    if (await hasVisibleLocator(page, selectors.loginExpired)) {
      auditStep(audit, auditLogPath, "page_read", "failed");
      return {
        ...resultBase,
        reason: "Asket login session appears to be expired.",
        status: "login_expired",
      };
    }

    auditStep(audit, auditLogPath, "page_read", "succeeded");

    activeActionType = "size_select";
    auditStep(audit, auditLogPath, "size_select", "started");
    await clickFirstAvailableLocator(page, selectors.size, `size ${normalizedSize}`);
    auditStep(audit, auditLogPath, "size_select", "succeeded");

    activeActionType = "cart_add";
    auditStep(audit, auditLogPath, "cart_add", "started");
    if (await hasVisibleLocator(page, selectors.outOfStock)) {
      auditStep(audit, auditLogPath, "cart_add", "failed");
      return {
        ...resultBase,
        reason: "Selected Asket size is out of stock.",
        status: "out_of_stock",
      };
    }

    const addToCartLocator = await findFirstVisibleLocator(page, selectors.addToCart);
    if (!addToCartLocator) {
      throw new Error("Could not find an Asket add-to-cart button.");
    }
    if (!(await locatorIsEnabled(addToCartLocator))) {
      auditStep(audit, auditLogPath, "cart_add", "failed");
      return {
        ...resultBase,
        reason: "Selected Asket size is out of stock.",
        status: "out_of_stock",
      };
    }

    await addToCartLocator.click();

    if (await hasVisibleLocator(page, selectors.loginExpired)) {
      auditStep(audit, auditLogPath, "cart_add", "failed");
      return {
        ...resultBase,
        reason: "Asket login session expired before cart add completed.",
        status: "login_expired",
      };
    }

    auditStep(audit, auditLogPath, "cart_add", "succeeded");
    const activeCartRow = activeCarts
      ? recordStagedCartItem(activeCarts, {
          cartUrl: ASKET_CART_URL,
          retailer: ASKET_RETAILER,
          stagedAt: now(),
        })
      : undefined;
    return {
      ...resultBase,
      ...(activeCartRow ? { activeCartRow } : {}),
      status: "success",
    };
  } catch (err) {
    auditStep(audit, auditLogPath, activeActionType, "failed");
    return {
      ...resultBase,
      error: err instanceof Error ? err.message : String(err),
      status: "error",
    };
  } finally {
    if (typeof flushAudit === "function") {
      await flushAudit();
    }
  }
}

function auditStep(audit, auditLogPath, actionType, status) {
  if (typeof audit !== "function") {
    return;
  }

  audit(
    {
      actionType,
      retailer: ASKET_RETAILER,
      status,
    },
    auditLogPath,
  );
}

async function clickFirstAvailableLocator(page, selectors, description) {
  for (const selector of normalizeSelectors(selectors)) {
    const locator = firstLocator(page, selector);
    if ((await locatorHasMatches(locator)) && (await locatorIsVisible(locator))) {
      if (!(await locatorIsEnabled(locator))) {
        continue;
      }
      await locator.click();
      return selector;
    }
  }

  throw new Error(`Could not find an enabled Asket ${description}.`);
}

async function hasVisibleLocator(page, selectors) {
  return Boolean(await findFirstVisibleLocator(page, selectors));
}

async function findFirstVisibleLocator(page, selectors) {
  for (const selector of normalizeSelectors(selectors)) {
    const locator = firstLocator(page, selector);
    if ((await locatorHasMatches(locator)) && (await locatorIsVisible(locator))) {
      return locator;
    }
  }
  return undefined;
}

function firstLocator(page, selector) {
  const locator = page.locator(selector);
  return locator.first?.() ?? locator;
}

async function locatorHasMatches(locator) {
  if (typeof locator.count === "function") {
    return (await locator.count()) > 0;
  }
  return true;
}

async function locatorIsVisible(locator) {
  if (typeof locator.isVisible === "function") {
    return locator.isVisible();
  }
  return true;
}

async function locatorIsEnabled(locator) {
  if (typeof locator.isEnabled === "function") {
    return locator.isEnabled();
  }
  return true;
}

function validatePage(page) {
  if (!page || typeof page.goto !== "function" || typeof page.locator !== "function") {
    throw new TypeError("page must provide Playwright-compatible goto and locator methods.");
  }
}

function normalizeSelectors(selectors) {
  if (!Array.isArray(selectors) || selectors.length === 0) {
    throw new TypeError("selectors must be a non-empty array.");
  }
  return selectors.map((selector) => normalizeNonEmptyString(selector, "selector"));
}

function normalizeNonEmptyString(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${field} must be a non-empty string.`);
  }
  return value.trim();
}

function normalizeUrl(value, field) {
  const normalized = normalizeNonEmptyString(value, field);
  try {
    return new URL(normalized).toString();
  } catch {
    throw new TypeError(`${field} must be a valid URL.`);
  }
}
