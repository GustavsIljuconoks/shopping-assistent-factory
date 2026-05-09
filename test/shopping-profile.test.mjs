import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import assert from "node:assert/strict";

import {
  SHOPPING_MEMORY_TAG,
  addShoppingMemory,
  clearShoppingMemories,
  createDefaultShoppingProfile,
  pinShoppingMemory,
  readShoppingProfile,
  recordShoppingOutcomeMemory,
  updateShoppingProfile,
  updateShoppingMemory,
  wipeShoppingMemory,
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
      jeans: { amount: 80, cadence: "seasonal", notes: "Wait for sale" },
    },
    hardExclusions: ["leather", "leather", "dry clean only"],
    perItemPriceCeiling: { amount: 150 },
    enabledRetailers: ["Zalando", "ASOS", "Zalando"],
  });

  assert.equal(profile.country, "LV");
  assert.equal(profile.currency, "EUR");
  assert.deepEqual(Object.keys(profile.sizes), ["tops", "shoes"]);
  assert.equal(profile.budgetAnchors.jeans.currency, "EUR");
  assert.equal(profile.budgetAnchors.jeans.cadence, "seasonal");
  assert.equal(profile.budgetAnchors.jeans.notes, "Wait for sale");
  assert.deepEqual(profile.hardExclusions, ["leather", "dry clean only"]);
  assert.equal(profile.perItemPriceCeiling.currency, "EUR");
  assert.deepEqual(profile.enabledRetailers, ["Zalando", "ASOS"]);
  assert.deepEqual(profile.memories, []);
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

test("stores shopping outcome memories with a Shopping tag", async () => {
  const dir = await mkdtemp(join(tmpdir(), "shopping-profile-"));
  const path = join(dir, "profile.json");

  try {
    await writeShoppingProfile(createDefaultShoppingProfile(), path);

    const memory = await recordShoppingOutcomeMemory(
      {
        candidate: {
          brand: "Asket",
          title: "The Oxford Shirt",
          color: "White",
          size: "M",
        },
        feedback: "Returned because the collar felt scratchy.",
        outcome: "returned",
      },
      path,
      { now: new Date("2026-05-09T12:00:00.000Z") },
    );
    const reloaded = await readShoppingProfile(path);

    assert.equal(memory.sentiment, "negative");
    assert.deepEqual(memory.tags, [SHOPPING_MEMORY_TAG]);
    assert.equal(reloaded.memories.length, 1);
    assert.equal(reloaded.memories[0].subject.title, "The Oxford Shirt");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("edits, pins, wipes, and clears only shopping-tagged memories", async () => {
  const dir = await mkdtemp(join(tmpdir(), "shopping-profile-"));
  const path = join(dir, "profile.json");

  try {
    await writeShoppingProfile(
      createDefaultShoppingProfile({
        memories: [
          {
            id: "general-1",
            content: "Remember preferred delivery window.",
            pinned: false,
            sentiment: "neutral",
            tags: ["General"],
            timestamp: "2026-05-09T12:00:00.000Z",
            type: "note",
          },
        ],
      }),
      path,
    );

    const shopping = await addShoppingMemory(
      {
        id: "shopping-1",
        content: "Avoid linen shirts from this result.",
        sentiment: "negative",
      },
      path,
      { now: new Date("2026-05-09T13:00:00.000Z") },
    );
    await updateShoppingMemory(shopping.id, { content: "Avoid rough linen shirts." }, path);
    await pinShoppingMemory(shopping.id, true, path);

    let reloaded = await readShoppingProfile(path);
    assert.equal(reloaded.memories.find((memory) => memory.id === shopping.id).pinned, true);
    assert.equal(
      reloaded.memories.find((memory) => memory.id === shopping.id).content,
      "Avoid rough linen shirts.",
    );

    await wipeShoppingMemory(shopping.id, path);
    reloaded = await readShoppingProfile(path);
    assert.deepEqual(reloaded.memories.map((memory) => memory.id), ["general-1"]);

    await addShoppingMemory({ id: "shopping-2", content: "Avoid boxy tee fits." }, path);
    await clearShoppingMemories(path);
    reloaded = await readShoppingProfile(path);
    assert.deepEqual(reloaded.memories.map((memory) => memory.id), ["general-1"]);
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
