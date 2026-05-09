import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export const SHOPPING_AUDIT_LOG_SCHEMA_VERSION = 1;
export const DEFAULT_SHOPPING_AUDIT_LOG_PATH = "data/shopping-audit-log.jsonl";
export const SHOPPING_AUDIT_ACTION_TYPES = Object.freeze([
  "search",
  "page_read",
  "cart_add",
  "cart_peek",
]);
export const SHOPPING_AUDIT_STATUSES = Object.freeze(["started", "succeeded", "failed"]);

let auditWriteQueue = Promise.resolve();

export function createShoppingAuditEntry(entry, now = new Date()) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new TypeError("Shopping audit entry must be an object.");
  }

  const normalized = {
    schemaVersion: SHOPPING_AUDIT_LOG_SCHEMA_VERSION,
    actionType: normalizeEnum(entry.actionType, "actionType", SHOPPING_AUDIT_ACTION_TYPES),
    retailer: normalizeString(entry.retailer, "retailer"),
    timestamp: normalizeTimestamp(entry.timestamp ?? now),
    status: normalizeEnum(entry.status, "status", SHOPPING_AUDIT_STATUSES),
  };

  if (entry.screenshotPath !== undefined) {
    normalized.screenshotPath = normalizeString(entry.screenshotPath, "screenshotPath");
  }

  return normalized;
}

export function appendShoppingAuditEntry(
  entry,
  filePath = DEFAULT_SHOPPING_AUDIT_LOG_PATH,
  options = {},
) {
  const normalized = createShoppingAuditEntry(entry, options.now);
  const target = resolve(filePath);

  auditWriteQueue = auditWriteQueue
    .catch(() => undefined)
    .then(async () => {
      await mkdir(dirname(target), { recursive: true });
      await appendFile(target, `${JSON.stringify(normalized)}\n`, "utf8");
    })
    .catch((err) => {
      if (typeof options.onError === "function") {
        options.onError(err);
      }
    });

  return normalized;
}

export async function flushShoppingAuditLog() {
  await auditWriteQueue;
}

export async function readShoppingAuditLog(filePath = DEFAULT_SHOPPING_AUDIT_LOG_PATH) {
  try {
    const raw = await readFile(resolve(filePath), "utf8");
    return raw
      .split("\n")
      .filter(Boolean)
      .map((line) => createShoppingAuditEntry(JSON.parse(line)));
  } catch (err) {
    if (err.code === "ENOENT") {
      return [];
    }
    throw err;
  }
}

function normalizeEnum(value, field, allowedValues) {
  if (!allowedValues.includes(value)) {
    throw new TypeError(`${field} must be one of: ${allowedValues.join(", ")}.`);
  }
  return value;
}

function normalizeString(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${field} must be a non-empty string.`);
  }
  return value.trim();
}

function normalizeTimestamp(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError("timestamp must be a valid date or ISO timestamp.");
  }
  return date.toISOString();
}
