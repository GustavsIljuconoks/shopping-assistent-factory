import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { createShoppingAuditLog } from "../src/shopping/audit-log.mjs";
import { createShoppingProfileStore, normalizeProfile } from "../src/shopping/profile-store.mjs";

test("profile normalizes all hard-constraint fields", () => {
  assert.deepEqual(
    normalizeProfile({
      country: " LV ",
      currency: " EUR ",
      sizes: { shirt: "M", shoe: 42 },
      budgetAnchors: { jacket: 120 },
      exclusions: [" wool ", "", 123],
      ceiling: "250",
      retailerList: [" Zara ", "Uniqlo"],
    }),
    {
      country: "LV",
      currency: "EUR",
      sizes: { shirt: "M", shoe: 42 },
      budgetAnchors: { jacket: 120 },
      exclusions: ["wool"],
      ceiling: 250,
      retailers: ["Zara", "Uniqlo"],
    },
  );
});

test("profile survives restart and absent data is safe", async () => {
  const dir = await mkdtemp(join(tmpdir(), "shopping-profile-"));
  const filePath = join(dir, "profile.json");

  try {
    const firstStore = createShoppingProfileStore({ filePath });
    assert.deepEqual(await firstStore.readProfile(), {
      country: null,
      currency: null,
      sizes: {},
      budgetAnchors: {},
      exclusions: [],
      ceiling: null,
      retailers: [],
    });

    await firstStore.setField("country", "LV");
    await firstStore.setField("retailers", ["Zara"]);

    const restartedStore = createShoppingProfileStore({ filePath });
    assert.equal(await restartedStore.getField("country"), "LV");
    assert.deepEqual(await restartedStore.getField("retailers"), ["Zara"]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("audit log appends asynchronously and survives restart", async () => {
  const dir = await mkdtemp(join(tmpdir(), "shopping-audit-"));
  const filePath = join(dir, "audit.jsonl");

  try {
    const log = createShoppingAuditLog({ filePath });
    const record = log.append({
      actionType: "search",
      retailer: "Zara",
      status: "ok",
      screenshotPath: "screenshots/zara.png",
      timestamp: "2026-05-09T13:00:00.000Z",
    });

    assert.equal(record.actionType, "search");
    await log.flush();

    const restartedLog = createShoppingAuditLog({ filePath });
    assert.deepEqual(await restartedLog.readEntries(), [
      {
        actionType: "search",
        retailer: "Zara",
        timestamp: "2026-05-09T13:00:00.000Z",
        status: "ok",
        screenshotPath: "screenshots/zara.png",
      },
    ]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
