import {
  appendShoppingAuditEntry,
  flushShoppingAuditLog,
} from "./shopping-audit-log.mjs";
import { recordStagedCartItem } from "./shopping-active-carts-strip.mjs";

export const HM_RETAILER = "H&M.lv";
export const HM_BASE_PRODUCT_URL = "https://www2.hm.com/lv_lv";
export const HM_CART_URL = "https://www2.hm.com/lv_lv/cart";
export const HM_CART_STAGING_STATUSES = Object.freeze([
  "success",
  "out_of_stock",
  "login_expired",
  "error",
]);

export function createHmProductUrl(productId, baseProductUrl = HM_BASE_PRODUCT_URL) {
  const normalizedProductId = normalizeNonEmptyString(productId, "productId");
  if (/^https?:\/\//i.test(normalizedProductId)) {
    return normalizeUrl(normalizedProductId, "productId");
  }
  return `${baseProductUrl.replace(/\/+$/, "")}/${normalizedProductId.replace(/^\/+/, "")}`;
}

export function createHmCartStagingSelectors(size) {
  const normalizedSize = normalizeNonEmptyString(size, "size");
  const quotedSize = JSON.stringify(normalizedSize);

  return {
    loginExpired: [
      "form[action*='login']",
      "a[href*='login']",
      "text=/log in/i",
      "text=/sign in/i",
      "text=/piesl[eē]gties/i",
      "text=/session expired/i",
      "text=/session has expired/i",
    ],
    outOfStock: [
      "text=/out of stock/i",
      "text=/sold out/i",
      "text=/izp[aā]rdots/i",
      "text=/nav pieejams/i",
      "button:has-text(\"Sold out\")",
      "button:has-text(\"Out of stock\")",
    ],
    sizeMenu: [
      "button[aria-haspopup='listbox']",
      "button:has-text(\"Select size\")",
      "button:has-text(\"Izvēlieties izmēru\")",
      "button:has-text(\"Izmērs\")",
      "button:has-text(\"Size\")",
      "[data-testid*='size'] button",
      "[class*='size'] button",
    ],
    size: [
      `button:has-text(${quotedSize})`,
      `[role="option"]:has-text(${quotedSize})`,
      `[data-testid*="size"] button:has-text(${quotedSize})`,
      `[aria-label=${quotedSize}]`,
      `input[name="size"][value=${quotedSize}]`,
    ],
    addToCart: [
      "button:has-text(\"Add to bag\")",
      "button:has-text(\"Add to cart\")",
      "button:has-text(\"Add\")",
      "button:has-text(\"Add to shopping bag\")",
      "button:has-text(\"Pievienot grozam\")",
      "button:has-text(\"Pievienot maisam\")",
      "button:has-text(\"Pievienot\")",
      "button:has-text(\"In den Warenkorb\")",
      "[data-testid*='add-to-cart']",
      "[data-testid*='add-to-bag']",
      "[data-testid*='add-to-shopping-bag']",
    ],
  };
}

export async function stageHmCartItem({
  page,
  productUrl,
  productId,
  size,
  auditLogPath,
  audit = appendShoppingAuditEntry,
  flushAudit = flushShoppingAuditLog,
  selectors = createHmCartStagingSelectors(size),
  navigationWaitUntil = "domcontentloaded",
  activeCarts,
  now = () => new Date(),
} = {}) {
  validatePage(page);
  const normalizedSize = normalizeNonEmptyString(size, "size");
  const resolvedProductUrl =
    productUrl === undefined
      ? createHmProductUrl(productId)
      : normalizeUrl(productUrl, "productUrl");

  const resultBase = {
    productUrl: resolvedProductUrl,
    retailer: HM_RETAILER,
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
        reason: "H&M.lv login session appears to be expired.",
        status: "login_expired",
      };
    }

    auditStep(audit, auditLogPath, "page_read", "succeeded");

    activeActionType = "size_select";
    auditStep(audit, auditLogPath, "size_select", "started");
    const selectedSize = await clickFirstAvailableLocator(page, selectors.size, undefined);
    if (!selectedSize && (await clickFirstAvailableLocator(page, selectors.sizeMenu, undefined))) {
      await clickFirstAvailableLocator(page, selectors.size, `size ${normalizedSize}`);
    } else if (!selectedSize) {
      throw new Error(`Could not find an enabled H&M.lv size ${normalizedSize}.`);
    }
    auditStep(audit, auditLogPath, "size_select", "succeeded");

    activeActionType = "cart_add";
    auditStep(audit, auditLogPath, "cart_add", "started");
    if (await hasVisibleLocator(page, selectors.outOfStock)) {
      auditStep(audit, auditLogPath, "cart_add", "failed");
      return {
        ...resultBase,
        reason: "Selected H&M.lv size is out of stock.",
        status: "out_of_stock",
      };
    }

    const addToCartLocator = await findFirstVisibleLocator(page, selectors.addToCart);
    if (!addToCartLocator) {
      throw new Error("Could not find a H&M.lv add-to-cart button.");
    }
    if (!(await locatorIsEnabled(addToCartLocator))) {
      auditStep(audit, auditLogPath, "cart_add", "failed");
      return {
        ...resultBase,
        reason: "Selected H&M.lv size is out of stock.",
        status: "out_of_stock",
      };
    }

    await addToCartLocator.click();

    if (await hasVisibleLocator(page, selectors.loginExpired)) {
      auditStep(audit, auditLogPath, "cart_add", "failed");
      return {
        ...resultBase,
        reason: "H&M.lv login session expired before cart add completed.",
        status: "login_expired",
      };
    }

    auditStep(audit, auditLogPath, "cart_add", "succeeded");
    const activeCartRow = activeCarts
      ? recordStagedCartItem(activeCarts, {
          cartUrl: HM_CART_URL,
          retailer: HM_RETAILER,
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
      retailer: HM_RETAILER,
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

  if (description) {
    throw new Error(`Could not find an enabled H&M.lv ${description}.`);
  }
  return undefined;
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
