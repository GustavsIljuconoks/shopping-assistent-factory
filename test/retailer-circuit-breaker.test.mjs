import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import assert from "node:assert/strict";

import {
  createRetailerCircuitBreakerState,
  getRetailerCircuitBreakerStatus,
  isRetailerDiscoveryOnly,
  readRetailerCircuitBreakerState,
  recordRetailerManualStagingSuccess,
  recordRetailerStagingFailure,
  writeRetailerCircuitBreakerState,
} from "../src/retailer-circuit-breaker.mjs";

test("increments retailer failures and enters discovery-only after 3 failures in 24 hours", () => {
  const feedItems = [];
  let state = createRetailerCircuitBreakerState();

  state = recordRetailerStagingFailure(state, "Asket", {
    now: new Date("2026-05-09T10:00:00.000Z"),
  }).state;
  state = recordRetailerStagingFailure(state, "Asket", {
    now: new Date("2026-05-09T11:00:00.000Z"),
  }).state;
  const result = recordRetailerStagingFailure(state, "Asket", {
    emitFeedItem(item) {
      feedItems.push(item);
    },
    now: new Date("2026-05-09T12:00:00.000Z"),
  });

  assert.equal(result.status.discoveryOnly, true);
  assert.equal(result.status.failureCount, 3);
  assert.equal(result.status.lockedUntil, "2026-05-10T10:00:00.000Z");
  assert.equal(isRetailerDiscoveryOnly(result.state, "Asket", {
    now: new Date("2026-05-09T12:30:00.000Z"),
  }), true);
  assert.equal(feedItems.length, 1);
  assert.equal(feedItems[0].type, "shopping_retailer_discovery_only");
  assert.equal(feedItems[0].retailer, "Asket");
  assert.equal(result.feedItem, feedItems[0]);
});

test("keeps retailer counters independent and resets after 24 hours", () => {
  let state = createRetailerCircuitBreakerState();
  state = recordRetailerStagingFailure(state, "Asket", {
    now: new Date("2026-05-09T10:00:00.000Z"),
  }).state;
  state = recordRetailerStagingFailure(state, "ASOS", {
    now: new Date("2026-05-09T10:05:00.000Z"),
  }).state;

  assert.equal(getRetailerCircuitBreakerStatus(state, "Asket", {
    now: new Date("2026-05-09T12:00:00.000Z"),
  }).failureCount, 1);
  assert.equal(getRetailerCircuitBreakerStatus(state, "ASOS", {
    now: new Date("2026-05-09T12:00:00.000Z"),
  }).failureCount, 1);
  assert.deepEqual(
    getRetailerCircuitBreakerStatus(state, "Asket", {
      now: new Date("2026-05-10T10:00:00.000Z"),
    }),
    {
      discoveryOnly: false,
      failureCount: 0,
      mode: "staging",
      retailer: "Asket",
      windowStartedAt: "2026-05-10T10:00:00.000Z",
    },
  );
});

test("resets a retailer after a successful manual staging test", () => {
  let state = createRetailerCircuitBreakerState();
  state = recordRetailerStagingFailure(state, "Asket", {
    now: new Date("2026-05-09T10:00:00.000Z"),
  }).state;
  state = recordRetailerStagingFailure(state, "Asket", {
    now: new Date("2026-05-09T11:00:00.000Z"),
  }).state;
  state = recordRetailerManualStagingSuccess(state, "Asket", {
    now: new Date("2026-05-09T12:00:00.000Z"),
  }).state;

  assert.equal(getRetailerCircuitBreakerStatus(state, "Asket", {
    now: new Date("2026-05-09T12:30:00.000Z"),
  }).failureCount, 0);
});

test("persists retailer circuit breaker state", async () => {
  const dir = await mkdtemp(join(tmpdir(), "retailer-circuit-breaker-"));
  const path = join(dir, "state.json");

  try {
    const state = recordRetailerStagingFailure(
      createRetailerCircuitBreakerState(),
      "About You",
      { now: new Date("2026-05-09T10:00:00.000Z") },
    ).state;

    await writeRetailerCircuitBreakerState(state, path);
    const reloaded = await readRetailerCircuitBreakerState(path);

    assert.equal(reloaded.retailers["About You"].failureCount, 1);
    assert.deepEqual(await readRetailerCircuitBreakerState(join(dir, "missing.json")), {
      schemaVersion: 1,
      retailers: {},
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

