import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";

export function createShoppingAuditLog(options = {}) {
  const filePath = options.filePath ?? "data/shopping/audit-log.jsonl";
  let queue = Promise.resolve();
  let writeError = null;

  function append(entry) {
    const record = normalizeAuditEntry(entry);
    queue = queue
      .then(async () => {
        await mkdir(dirname(filePath), { recursive: true });
        await appendFile(filePath, `${JSON.stringify(record)}\n`, "utf8");
      })
      .catch((error) => {
        writeError = error;
      });
    return record;
  }

  async function flush() {
    await queue;
    if (writeError) throw writeError;
  }

  async function readEntries() {
    try {
      const raw = await readFile(filePath, "utf8");
      return raw
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line));
    } catch (error) {
      if (error.code === "ENOENT") return [];
      throw error;
    }
  }

  return {
    filePath,
    append,
    flush,
    readEntries,
  };
}

export function normalizeAuditEntry(entry = {}) {
  const actionType = requiredString(entry.actionType, "actionType");
  const retailer = requiredString(entry.retailer, "retailer");
  const status = requiredString(entry.status, "status");
  const screenshotPath = optionalString(entry.screenshotPath);
  const timestamp = optionalString(entry.timestamp) ?? new Date().toISOString();

  return screenshotPath
    ? { actionType, retailer, timestamp, status, screenshotPath }
    : { actionType, retailer, timestamp, status };
}

function requiredString(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Shopping audit entry requires ${field}`);
  }
  return value.trim();
}

function optionalString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
