import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import assert from "node:assert/strict";

import {
  appendShoppingAuditEntry,
  createShoppingAuditEntry,
  flushShoppingAuditLog,
  readShoppingAuditLog,
} from "../src/shopping-audit-log.mjs";

test("creates normalized audit entries with optional screenshot paths", () => {
  const entry = createShoppingAuditEntry({
    actionType: "page_read",
    retailer: "  Zalando  ",
    timestamp: "2026-05-09T13:00:00.000Z",
    status: "succeeded",
    screenshotPath: " screenshots/page.png ",
  });

  assert.deepEqual(entry, {
    schemaVersion: 1,
    actionType: "page_read",
    retailer: "Zalando",
    timestamp: "2026-05-09T13:00:00.000Z",
    status: "succeeded",
    screenshotPath: "screenshots/page.png",
  });
});

test("appends audit entries asynchronously and preserves them across reads", async () => {
  const dir = await mkdtemp(join(tmpdir(), "shopping-audit-log-"));
  const path = join(dir, "audit.jsonl");

  try {
    const first = appendShoppingAuditEntry(
      {
        actionType: "search",
        retailer: "About You",
        status: "started",
      },
      path,
      { now: new Date("2026-05-09T13:01:00.000Z") },
    );
    const second = appendShoppingAuditEntry(
      {
        actionType: "cart_add",
        retailer: "About You",
        status: "succeeded",
      },
      path,
      { now: new Date("2026-05-09T13:02:00.000Z") },
    );

    assert.equal(first.actionType, "search");
    assert.equal(second.actionType, "cart_add");

    await flushShoppingAuditLog();
    const reloaded = await readShoppingAuditLog(path);

    assert.deepEqual(
      reloaded.map((entry) => [entry.actionType, entry.retailer, entry.timestamp, entry.status]),
      [
        ["search", "About You", "2026-05-09T13:01:00.000Z", "started"],
        ["cart_add", "About You", "2026-05-09T13:02:00.000Z", "succeeded"],
      ],
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("stores one JSON object per line for durable append-only persistence", async () => {
  const dir = await mkdtemp(join(tmpdir(), "shopping-audit-log-"));
  const path = join(dir, "audit.jsonl");

  try {
    appendShoppingAuditEntry(
      {
        actionType: "cart_peek",
        retailer: "ASOS",
        status: "failed",
        screenshotPath: "debug/asos-cart.png",
      },
      path,
      { now: new Date("2026-05-09T13:03:00.000Z") },
    );

    await flushShoppingAuditLog();
    const raw = await readFile(path, "utf8");
    const lines = raw.trim().split("\n");

    assert.equal(lines.length, 1);
    assert.equal(JSON.parse(lines[0]).screenshotPath, "debug/asos-cart.png");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("returns an empty audit log when no persisted log exists yet", async () => {
  const dir = await mkdtemp(join(tmpdir(), "shopping-audit-log-"));
  const path = join(dir, "missing.jsonl");

  try {
    assert.deepEqual(await readShoppingAuditLog(path), []);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("rejects invalid audit entry values", () => {
  assert.throws(
    () => createShoppingAuditEntry({ actionType: "login", retailer: "ASOS", status: "started" }),
    /actionType must be one of/,
  );
  assert.throws(
    () => createShoppingAuditEntry({ actionType: "search", retailer: "", status: "started" }),
    /retailer must be a non-empty string/,
  );
  assert.throws(
    () => createShoppingAuditEntry({ actionType: "search", retailer: "ASOS", status: "done" }),
    /status must be one of/,
  );
});
