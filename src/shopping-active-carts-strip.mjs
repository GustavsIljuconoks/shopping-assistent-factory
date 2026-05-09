import { spawn } from "node:child_process";

export const ACTIVE_CARTS_STRIP_EMPTY_HTML = "";

export const RETAILER_CART_URLS = Object.freeze({
  Asket: "https://www.asket.com/en-dk/cart",
});

export function createActiveCartsState({ entries = [], now = () => new Date() } = {}) {
  const activeCarts = new Map();

  for (const entry of entries) {
    if (entry?.itemCount !== undefined || entry?.lastStagedAt !== undefined) {
      const row = normalizeRow(entry);
      activeCarts.set(row.retailer, row);
    } else {
      recordStagedCartItem(activeCarts, entry);
    }
  }

  return {
    clearAll() {
      activeCarts.clear();
    },
    clearRetailer(retailer) {
      activeCarts.delete(normalizeString(retailer, "retailer"));
    },
    getRows(options = {}) {
      return getActiveCartRows(activeCarts, options);
    },
    recordStagedItem(entry = {}) {
      return recordStagedCartItem(activeCarts, {
        stagedAt: now(),
        ...entry,
      });
    },
    snapshot() {
      return getActiveCartRows(activeCarts).map((row) => ({ ...row }));
    },
  };
}

export function recordStagedCartItem(activeCarts, entry = {}) {
  if (!(activeCarts instanceof Map)) {
    throw new TypeError("activeCarts must be a Map.");
  }

  const retailer = normalizeString(entry.retailer, "retailer");
  const cartUrl = normalizeCartUrl(entry.cartUrl ?? RETAILER_CART_URLS[retailer], retailer);
  const stagedAt = normalizeTimestamp(entry.stagedAt ?? new Date(), "stagedAt");
  const current = activeCarts.get(retailer);

  const row = {
    cartUrl,
    itemCount: (current?.itemCount ?? 0) + 1,
    lastStagedAt: stagedAt,
    retailer,
  };
  activeCarts.set(retailer, row);
  return { ...row };
}

export function clearStagedCartItems(activeCarts, retailer) {
  if (!(activeCarts instanceof Map)) {
    throw new TypeError("activeCarts must be a Map.");
  }
  if (retailer === undefined) {
    activeCarts.clear();
    return;
  }
  activeCarts.delete(normalizeString(retailer, "retailer"));
}

export function getActiveCartRows(activeCarts, { sort = true } = {}) {
  const rows = normalizeRows(activeCarts);
  if (!sort) {
    return rows;
  }
  return rows.sort((left, right) => left.retailer.localeCompare(right.retailer));
}

export function renderActiveCartsStrip(activeCarts, { formatTime = formatLastStagedTime } = {}) {
  const rows = normalizeRows(activeCarts);
  if (rows.length === 0) {
    return ACTIVE_CARTS_STRIP_EMPTY_HTML;
  }

  return [
    '<section class="active-carts-strip" data-sticky="top" aria-label="Active carts">',
    ...rows
      .sort((left, right) => left.retailer.localeCompare(right.retailer))
      .map((row) => renderActiveCartRow(row, formatTime)),
    "</section>",
  ].join("");
}

export async function publishActiveCartsStrip(chat, activeCarts, options = {}) {
  if (!chat) {
    return;
  }

  const rows = getActiveCartRows(activeCarts);
  const html = renderActiveCartsStrip(rows, options);
  const payload = {
    html,
    rows,
    visible: rows.length > 0,
  };

  if (typeof chat.showActiveCartsStrip === "function" && rows.length > 0) {
    await chat.showActiveCartsStrip(payload);
    return;
  }
  if (typeof chat.clearActiveCartsStrip === "function" && rows.length === 0) {
    await chat.clearActiveCartsStrip(payload);
    return;
  }
  if (typeof chat.setActiveCartsStrip === "function") {
    await chat.setActiveCartsStrip(payload);
  }
}

export async function openCartInDefaultBrowser({ cartUrl, opener = openUrlInDefaultBrowser } = {}) {
  const normalizedCartUrl = normalizeCartUrl(cartUrl, "cartUrl");
  if (typeof opener !== "function") {
    throw new TypeError("opener must be a function.");
  }
  await opener(normalizedCartUrl);
  return normalizedCartUrl;
}

export function openUrlInDefaultBrowser(url) {
  const normalizedUrl = normalizeCartUrl(url, "url");
  const command =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", normalizedUrl] : [normalizedUrl];

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      detached: true,
      stdio: "ignore",
    });
    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}

export function formatLastStagedTime(value, now = new Date()) {
  const date = new Date(normalizeTimestamp(value, "lastStagedAt"));
  const reference = now instanceof Date ? now : new Date(now);
  const elapsedMs = Math.max(0, reference.getTime() - date.getTime());
  const elapsedMinutes = Math.floor(elapsedMs / 60000);

  if (elapsedMinutes < 1) {
    return "just now";
  }
  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}m ago`;
  }

  return date.toLocaleString("en-US", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  });
}

function renderActiveCartRow(row, formatTime) {
  const itemLabel = row.itemCount === 1 ? "1 item" : `${row.itemCount} items`;
  return [
    '<div class="active-carts-strip-row">',
    `  <span class="active-carts-strip-retailer">${escapeHtml(row.retailer)}</span>`,
    `  <span class="active-carts-strip-count">${escapeHtml(itemLabel)}</span>`,
    `  <time class="active-carts-strip-last-staged" datetime="${escapeHtml(row.lastStagedAt)}">${escapeHtml(formatTime(row.lastStagedAt))}</time>`,
    `  <a class="active-carts-strip-open" href="${escapeHtml(row.cartUrl)}" target="_blank" rel="noopener noreferrer" data-open-with="default-browser">Open cart</a>`,
    "</div>",
  ].join("");
}

function normalizeRows(activeCarts) {
  if (activeCarts instanceof Map) {
    return [...activeCarts.values()].map(normalizeRow);
  }
  if (Array.isArray(activeCarts)) {
    return activeCarts.map(normalizeRow);
  }
  throw new TypeError("activeCarts must be a Map or an array.");
}

function normalizeRow(row) {
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    throw new TypeError("active cart rows must be objects.");
  }
  return {
    cartUrl: normalizeCartUrl(row.cartUrl, row.retailer ?? "cartUrl"),
    itemCount: normalizeItemCount(row.itemCount),
    lastStagedAt: normalizeTimestamp(row.lastStagedAt, "lastStagedAt"),
    retailer: normalizeString(row.retailer, "retailer"),
  };
}

function normalizeCartUrl(value, field) {
  const normalized = normalizeString(value, `${field} cart URL`);
  try {
    return new URL(normalized).toString();
  } catch {
    throw new TypeError(`${field} cart URL must be a valid URL.`);
  }
}

function normalizeItemCount(value) {
  if (!Number.isInteger(value) || value < 1) {
    throw new TypeError("itemCount must be a positive integer.");
  }
  return value;
}

function normalizeTimestamp(value, field) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`${field} must be a valid date or ISO timestamp.`);
  }
  return date.toISOString();
}

function normalizeString(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${field} must be a non-empty string.`);
  }
  return value.trim();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
