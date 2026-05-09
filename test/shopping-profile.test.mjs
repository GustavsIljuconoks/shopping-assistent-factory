import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import assert from "node:assert/strict";

import {
  createDefaultShoppingProfile,
  readShoppingProfile,
  updateShoppingProfile,
  writeShoppingProfile,
} from "../src/shopping-profile.mjs";

test("creates a complete profile shape with required hard constraints", () => {
  const profile = createDefaultShoppingProfile({
    country: "lv",
    currency: "eur",
    sizes: {
      tops: { value: "M", system: "International" },
      shoes: { value: "42", system: "EU" },
    },
    budgetAnchors: {
      jeans: { amount: 80 },
    },
    hardExclusions: ["leather", "leather", "dry clean only"],
    perItemPriceCeiling: { amount: 150 },
    enabledRetailers: ["Zalando", "ASOS", "Zalando"],
  });

  assert.equal(profile.country, "LV");
  assert.equal(profile.currency, "EUR");
  assert.deepEqual(Object.keys(profile.sizes), ["tops", "shoes"]);
  assert.equal(profile.budgetAnchors.jeans.currency, "EUR");
  assert.deepEqual(profile.hardExclusions, ["leather", "dry clean only"]);
  assert.equal(profile.perItemPriceCeiling.currency, "EUR");
  assert.deepEqual(profile.enabledRetailers, ["Zalando", "ASOS"]);
});

test("persists profile data so it can be read by a later process", async () => {
  const dir = await mkdtemp(join(tmpdir(), "shopping-profile-"));
  const path = join(dir, "profile.json");

  try {
    await writeShoppingProfile(
      createDefaultShoppingProfile({
        country: "DE",
        currency: "EUR",
        perItemPriceCeiling: { amount: 200 },
        enabledRetailers: ["About You"],
      }),
      path,
    );

    const reloaded = await readShoppingProfile(path);

    assert.equal(reloaded.country, "DE");
    assert.equal(reloaded.perItemPriceCeiling.amount, 200);
    assert.deepEqual(reloaded.enabledRetailers, ["About You"]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("updates fields programmatically while preserving existing records", async () => {
  const dir = await mkdtemp(join(tmpdir(), "shopping-profile-"));
  const path = join(dir, "profile.json");

  try {
    await writeShoppingProfile(
      createDefaultShoppingProfile({
        sizes: { tops: { value: "L" } },
        budgetAnchors: { coats: { amount: 180 } },
      }),
      path,
    );

    const updated = await updateShoppingProfile(
      {
        sizes: { shoes: { value: "43", system: "EU" } },
        budgetAnchors: { shirts: { amount: 60 } },
        hardExclusions: ["polyester"],
      },
      path,
    );

    assert.deepEqual(Object.keys(updated.sizes), ["tops", "shoes"]);
    assert.deepEqual(Object.keys(updated.budgetAnchors), ["coats", "shirts"]);
    assert.deepEqual(updated.hardExclusions, ["polyester"]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("rejects invalid hard-constraint values", () => {
  assert.throws(
    () => createDefaultShoppingProfile({ country: "Latvia" }),
    /country must be a 2-letter uppercase code/,
  );
  assert.throws(
    () => createDefaultShoppingProfile({ perItemPriceCeiling: { amount: -1 } }),
    /perItemPriceCeiling\.amount must be a non-negative finite number/,
  );
});
