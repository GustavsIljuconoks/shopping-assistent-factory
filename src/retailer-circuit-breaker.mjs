import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export const DEFAULT_RETAILER_CIRCUIT_BREAKER_PATH = "data/retailer-circuit-breakers.json";
export const RETAILER_CIRCUIT_BREAKER_SCHEMA_VERSION = 1;
export const RETAILER_CIRCUIT_BREAKER_FAILURE_THRESHOLD = 3;
export const RETAILER_CIRCUIT_BREAKER_WINDOW_MS = 24 * 60 * 60 * 1000;

export function createRetailerCircuitBreakerState(overrides = {}) {
  return normalizeRetailerCircuitBreakerState({
    schemaVersion: RETAILER_CIRCUIT_BREAKER_SCHEMA_VERSION,
    retailers: {},
    ...overrides,
  });
}

export async function readRetailerCircuitBreakerState(
  filePath = DEFAULT_RETAILER_CIRCUIT_BREAKER_PATH,
) {
  try {
    const raw = await readFile(resolve(filePath), "utf8");
    return normalizeRetailerCircuitBreakerState(JSON.parse(raw));
  } catch (err) {
    if (err.code === "ENOENT") {
      return createRetailerCircuitBreakerState();
    }
    throw err;
  }
}

export async function writeRetailerCircuitBreakerState(
  state,
  filePath = DEFAULT_RETAILER_CIRCUIT_BREAKER_PATH,
) {
  const normalized = normalizeRetailerCircuitBreakerState(state);
  const target = resolve(filePath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  return normalized;
}

export function getRetailerCircuitBreakerStatus(state, retailer, { now = new Date() } = {}) {
  const normalizedState = normalizeRetailerCircuitBreakerState(state);
  const normalizedRetailer = normalizeString(retailer, "retailer");
  const entry = normalizeRetailerEntry(
    normalizedState.retailers[normalizedRetailer],
    normalizedRetailer,
    now,
  );

  return createRetailerStatus(normalizedRetailer, entry, now);
}

export function isRetailerDiscoveryOnly(state, retailer, options = {}) {
  return getRetailerCircuitBreakerStatus(state, retailer, options).discoveryOnly;
}

export function recordRetailerStagingFailure(
  state,
  retailer,
  { now = new Date(), emitFeedItem } = {},
) {
  const normalizedState = cloneState(state);
  const normalizedRetailer = normalizeString(retailer, "retailer");
  const currentEntry = normalizeRetailerEntry(
    normalizedState.retailers[normalizedRetailer],
    normalizedRetailer,
    now,
  );
  const currentStatus = createRetailerStatus(normalizedRetailer, currentEntry, now);
  const current = currentStatus.failureCount === 0
    ? {
        failureCount: 0,
        windowStartedAt: normalizeTimestamp(now, "now"),
      }
    : currentEntry;
  const wasDiscoveryOnly = createRetailerStatus(normalizedRetailer, current, now).discoveryOnly;
  const timestamp = normalizeTimestamp(now, "now");
  const windowStartedAt =
    current.failureCount > 0 ? current.windowStartedAt : timestamp;
  const failureCount = current.failureCount + 1;
  const entry = {
    failureCount,
    windowStartedAt,
    ...(failureCount >= RETAILER_CIRCUIT_BREAKER_FAILURE_THRESHOLD
      ? {
          discoveryOnlySince: current.discoveryOnlySince ?? timestamp,
          lockedUntil: addWindow(windowStartedAt),
        }
      : {}),
  };

  normalizedState.retailers[normalizedRetailer] = entry;
  const status = createRetailerStatus(normalizedRetailer, entry, now);
  const feedItem = !wasDiscoveryOnly && status.discoveryOnly
    ? createDiscoveryOnlyFeedItem(status, now)
    : undefined;

  if (feedItem && typeof emitFeedItem === "function") {
    emitFeedItem(feedItem);
  }

  return {
    feedItem,
    state: normalizedState,
    status,
  };
}

export function recordRetailerManualStagingSuccess(state, retailer, { now = new Date() } = {}) {
  const normalizedState = cloneState(state);
  const normalizedRetailer = normalizeString(retailer, "retailer");
  normalizedState.retailers[normalizedRetailer] = {
    failureCount: 0,
    windowStartedAt: normalizeTimestamp(now, "now"),
  };
  return {
    state: normalizedState,
    status: getRetailerCircuitBreakerStatus(normalizedState, normalizedRetailer, { now }),
  };
}

export function createDiscoveryOnlyFeedItem(status, now = new Date()) {
  const normalizedStatus = normalizeRetailerStatus(status);
  return {
    type: "shopping_retailer_discovery_only",
    title: `${normalizedStatus.retailer} switched to discovery-only mode`,
    body: `${normalizedStatus.retailer} failed staging ${normalizedStatus.failureCount} times in 24 hours. Items can still be discovered and opened manually.`,
    retailer: normalizedStatus.retailer,
    timestamp: normalizeTimestamp(now, "now"),
    metadata: {
      discoveryOnly: true,
      failureCount: normalizedStatus.failureCount,
      lockedUntil: normalizedStatus.lockedUntil,
      windowStartedAt: normalizedStatus.windowStartedAt,
    },
  };
}

export function normalizeRetailerCircuitBreakerState(state) {
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new TypeError("retailer circuit breaker state must be an object.");
  }
  const retailers = state.retailers ?? {};
  if (!retailers || typeof retailers !== "object" || Array.isArray(retailers)) {
    throw new TypeError("retailer circuit breaker retailers must be an object.");
  }

  const normalizedRetailers = {};
  for (const [retailer, entry] of Object.entries(retailers)) {
    const normalizedRetailer = normalizeString(retailer, "retailer");
    normalizedRetailers[normalizedRetailer] = normalizeRetailerEntry(
      entry,
      normalizedRetailer,
      new Date(),
    );
  }

  return {
    schemaVersion: RETAILER_CIRCUIT_BREAKER_SCHEMA_VERSION,
    retailers: normalizedRetailers,
  };
}

function cloneState(state) {
  return normalizeRetailerCircuitBreakerState({
    ...state,
    retailers: { ...(state?.retailers ?? {}) },
  });
}

function normalizeRetailerEntry(entry, retailer, now) {
  if (entry === undefined) {
    return {
      failureCount: 0,
      windowStartedAt: normalizeTimestamp(now, "now"),
    };
  }
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new TypeError(`${retailer} circuit breaker entry must be an object.`);
  }

  const windowStartedAt = normalizeTimestamp(entry.windowStartedAt ?? now, "windowStartedAt");
  const lockedUntil = entry.lockedUntil === undefined
    ? undefined
    : normalizeTimestamp(entry.lockedUntil, "lockedUntil");

  return {
    failureCount: normalizeFailureCount(entry.failureCount ?? 0),
    windowStartedAt,
    ...(entry.discoveryOnlySince === undefined
      ? {}
      : { discoveryOnlySince: normalizeTimestamp(entry.discoveryOnlySince, "discoveryOnlySince") }),
    ...(lockedUntil === undefined ? {} : { lockedUntil }),
  };
}

function createRetailerStatus(retailer, entry, now) {
  const nowMs = new Date(normalizeTimestamp(now, "now")).getTime();
  const windowStartedMs = new Date(entry.windowStartedAt).getTime();
  const windowExpired = nowMs - windowStartedMs >= RETAILER_CIRCUIT_BREAKER_WINDOW_MS;

  if (windowExpired) {
    return {
      discoveryOnly: false,
      failureCount: 0,
      mode: "staging",
      retailer,
      windowStartedAt: normalizeTimestamp(now, "now"),
    };
  }

  const lockedUntil = entry.lockedUntil ?? addWindow(entry.windowStartedAt);
  const discoveryOnly =
    entry.failureCount >= RETAILER_CIRCUIT_BREAKER_FAILURE_THRESHOLD &&
    nowMs < new Date(lockedUntil).getTime();

  return {
    discoveryOnly,
    failureCount: entry.failureCount,
    lockedUntil,
    mode: discoveryOnly ? "discovery_only" : "staging",
    retailer,
    windowStartedAt: entry.windowStartedAt,
    ...(entry.discoveryOnlySince === undefined ? {} : { discoveryOnlySince: entry.discoveryOnlySince }),
  };
}

function normalizeRetailerStatus(status) {
  if (!status || typeof status !== "object" || Array.isArray(status)) {
    throw new TypeError("retailer status must be an object.");
  }
  return {
    discoveryOnly: Boolean(status.discoveryOnly),
    failureCount: normalizeFailureCount(status.failureCount),
    lockedUntil: normalizeTimestamp(status.lockedUntil, "lockedUntil"),
    retailer: normalizeString(status.retailer, "retailer"),
    windowStartedAt: normalizeTimestamp(status.windowStartedAt, "windowStartedAt"),
  };
}

function addWindow(timestamp) {
  return new Date(
    new Date(normalizeTimestamp(timestamp, "timestamp")).getTime() +
      RETAILER_CIRCUIT_BREAKER_WINDOW_MS,
  ).toISOString();
}

function normalizeFailureCount(value) {
  if (!Number.isInteger(value) || value < 0) {
    throw new TypeError("failureCount must be a non-negative integer.");
  }
  return value;
}

function normalizeString(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${field} must be a non-empty string.`);
  }
  return value.trim();
}

function normalizeTimestamp(value, field) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`${field} must be a valid date or ISO timestamp.`);
  }
  return date.toISOString();
}
