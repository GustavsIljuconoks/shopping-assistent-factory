import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export const SHOPPING_PROFILE_SCHEMA_VERSION = 1;
export const DEFAULT_SHOPPING_PROFILE_PATH = "data/shopping-profile.json";
export const SHOPPING_MEMORY_TAG = "Shopping";
export const SHOPPING_MEMORY_SENTIMENTS = Object.freeze(["positive", "negative", "neutral"]);

export function createDefaultShoppingProfile(overrides = {}) {
  return normalizeShoppingProfile({
    country: "LV",
    currency: "EUR",
    sizes: {},
    budgetAnchors: {},
    hardExclusions: [],
    perItemPriceCeiling: { amount: 0, currency: "EUR" },
    enabledRetailers: [],
    memories: [],
    ...overrides,
  });
}

export async function readShoppingProfile(filePath = DEFAULT_SHOPPING_PROFILE_PATH) {
  try {
    const raw = await readFile(resolve(filePath), "utf8");
    return normalizeShoppingProfile(JSON.parse(raw));
  } catch (err) {
    if (err.code === "ENOENT") {
      return createDefaultShoppingProfile();
    }
    throw err;
  }
}

export async function writeShoppingProfile(profile, filePath = DEFAULT_SHOPPING_PROFILE_PATH) {
  const normalized = normalizeShoppingProfile(profile);
  const target = resolve(filePath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  return normalized;
}

export async function updateShoppingProfile(patch, filePath = DEFAULT_SHOPPING_PROFILE_PATH) {
  const current = await readShoppingProfile(filePath);
  const next = normalizeShoppingProfile({
    ...current,
    ...patch,
    sizes: patch.sizes ? { ...current.sizes, ...patch.sizes } : current.sizes,
    budgetAnchors: patch.budgetAnchors
      ? { ...current.budgetAnchors, ...patch.budgetAnchors }
      : current.budgetAnchors,
  });
  return writeShoppingProfile(next, filePath);
}

export function normalizeShoppingProfile(profile) {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
    throw new TypeError("Shopping profile must be an object.");
  }

  const country = normalizeCode(profile.country, "country", 2);
  const currency = normalizeCode(profile.currency, "currency", 3);
  const perItemPriceCeiling = normalizeMoney(
    profile.perItemPriceCeiling,
    "perItemPriceCeiling",
    currency,
  );

  return {
    schemaVersion: SHOPPING_PROFILE_SCHEMA_VERSION,
    country,
    currency,
    sizes: normalizeRecord(profile.sizes, "sizes", normalizeSize),
    budgetAnchors: normalizeRecord(profile.budgetAnchors, "budgetAnchors", (value, key) =>
      normalizeBudgetAnchor(value, key, currency),
    ),
    hardExclusions: normalizeUniqueStringArray(profile.hardExclusions, "hardExclusions"),
    perItemPriceCeiling,
    enabledRetailers: normalizeUniqueStringArray(profile.enabledRetailers, "enabledRetailers"),
    memories: normalizeMemories(profile.memories ?? []),
  };
}

export function createShoppingMemory(memory, now = new Date()) {
  const normalized = normalizeMemory(
    {
      ...memory,
      tags: ensureShoppingTag(memory?.tags),
      type: memory?.type ?? "shopping_outcome",
      timestamp: memory?.timestamp ?? now,
    },
    "memory",
  );

  return {
    ...normalized,
    tags: ensureShoppingTag(normalized.tags),
  };
}

export async function addShoppingMemory(
  memory,
  filePath = DEFAULT_SHOPPING_PROFILE_PATH,
  options = {},
) {
  const current = await readShoppingProfile(filePath);
  const nextMemory = createShoppingMemory(memory, options.now);
  const next = normalizeShoppingProfile({
    ...current,
    memories: [...current.memories, nextMemory],
  });
  await writeShoppingProfile(next, filePath);
  return nextMemory;
}

export async function updateShoppingMemory(
  memoryId,
  patch,
  filePath = DEFAULT_SHOPPING_PROFILE_PATH,
) {
  const id = normalizeNonEmptyString(memoryId, "memoryId");
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    throw new TypeError("memory patch must be an object.");
  }

  const current = await readShoppingProfile(filePath);
  const nextMemories = current.memories.map((memory) => {
    if (memory.id !== id) {
      return memory;
    }
    return normalizeMemory(
      {
        ...memory,
        ...patch,
        id: memory.id,
        tags: isShoppingMemory(memory)
          ? ensureShoppingTag(patch.tags ?? memory.tags)
          : (patch.tags ?? memory.tags),
        timestamp: patch.timestamp ?? memory.timestamp,
      },
      "memory",
    );
  });
  const next = normalizeShoppingProfile({ ...current, memories: nextMemories });
  await writeShoppingProfile(next, filePath);
  return next.memories.find((memory) => memory.id === id);
}

export async function pinShoppingMemory(
  memoryId,
  pinned,
  filePath = DEFAULT_SHOPPING_PROFILE_PATH,
) {
  return updateShoppingMemory(memoryId, { pinned: Boolean(pinned) }, filePath);
}

export async function wipeShoppingMemory(memoryId, filePath = DEFAULT_SHOPPING_PROFILE_PATH) {
  const id = normalizeNonEmptyString(memoryId, "memoryId");
  const current = await readShoppingProfile(filePath);
  const next = normalizeShoppingProfile({
    ...current,
    memories: current.memories.filter((memory) => memory.id !== id),
  });
  await writeShoppingProfile(next, filePath);
  return next.memories;
}

export async function clearShoppingMemories(filePath = DEFAULT_SHOPPING_PROFILE_PATH) {
  const current = await readShoppingProfile(filePath);
  const next = normalizeShoppingProfile({
    ...current,
    memories: current.memories.filter((memory) => !isShoppingMemory(memory)),
  });
  await writeShoppingProfile(next, filePath);
  return next.memories;
}

export async function recordShoppingOutcomeMemory(
  {
    candidate,
    feedback,
    outcome,
    sentiment,
    source = "staging_feedback",
  } = {},
  filePath = DEFAULT_SHOPPING_PROFILE_PATH,
  options = {},
) {
  const normalizedFeedback = normalizeNonEmptyString(feedback, "feedback");
  const normalizedOutcome =
    outcome === undefined ? "feedback" : normalizeNonEmptyString(outcome, "outcome");
  const normalizedCandidate =
    candidate === undefined ? undefined : normalizeMemorySubject(candidate, "candidate");
  const resolvedSentiment = sentiment ?? inferOutcomeSentiment(normalizedOutcome, normalizedFeedback);

  return addShoppingMemory(
    {
      content: normalizedFeedback,
      sentiment: resolvedSentiment,
      source,
      subject: normalizedCandidate,
      outcome: normalizedOutcome,
    },
    filePath,
    options,
  );
}

export function isShoppingMemory(memory) {
  return Array.isArray(memory?.tags) && memory.tags.includes(SHOPPING_MEMORY_TAG);
}

function normalizeCode(value, field, length) {
  if (typeof value !== "string") {
    throw new TypeError(`${field} must be a string.`);
  }
  const normalized = value.trim().toUpperCase();
  if (!new RegExp(`^[A-Z]{${length}}$`).test(normalized)) {
    throw new TypeError(`${field} must be a ${length}-letter uppercase code.`);
  }
  return normalized;
}

function normalizeRecord(value, field, normalizeValue) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${field} must be an object.`);
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => {
      const normalizedKey = String(key).trim();
      if (!normalizedKey) {
        throw new TypeError(`${field} keys must be non-empty strings.`);
      }
      return [normalizedKey, normalizeValue(item, normalizedKey)];
    }),
  );
}

function normalizeSize(value, key) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`sizes.${key} must be an object.`);
  }
  if (typeof value.value !== "string" || !value.value.trim()) {
    throw new TypeError(`sizes.${key}.value must be a non-empty string.`);
  }

  const normalized = { value: value.value.trim() };
  if (value.system !== undefined) {
    if (typeof value.system !== "string" || !value.system.trim()) {
      throw new TypeError(`sizes.${key}.system must be a non-empty string.`);
    }
    normalized.system = value.system.trim();
  }
  if (value.notes !== undefined) {
    if (typeof value.notes !== "string") {
      throw new TypeError(`sizes.${key}.notes must be a string.`);
    }
    normalized.notes = value.notes.trim();
  }
  return normalized;
}

function normalizeMoney(value, field, defaultCurrency) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${field} must be an object.`);
  }
  if (typeof value.amount !== "number" || !Number.isFinite(value.amount) || value.amount < 0) {
    throw new TypeError(`${field}.amount must be a non-negative finite number.`);
  }

  return {
    amount: value.amount,
    currency:
      value.currency === undefined
        ? defaultCurrency
        : normalizeCode(value.currency, `${field}.currency`, 3),
  };
}

function normalizeBudgetAnchor(value, key, defaultCurrency) {
  const field = `budgetAnchors.${key}`;
  const normalized = normalizeMoney(value, field, defaultCurrency);

  if (value.cadence !== undefined) {
    if (!["per_item", "monthly", "seasonal", "annual"].includes(value.cadence)) {
      throw new TypeError(`${field}.cadence must be per_item, monthly, seasonal, or annual.`);
    }
    normalized.cadence = value.cadence;
  }
  if (value.notes !== undefined) {
    if (typeof value.notes !== "string") {
      throw new TypeError(`${field}.notes must be a string.`);
    }
    normalized.notes = value.notes.trim();
  }

  return normalized;
}

function normalizeUniqueStringArray(value, field) {
  if (!Array.isArray(value)) {
    throw new TypeError(`${field} must be an array.`);
  }

  return [...new Set(value.map((item) => {
    if (typeof item !== "string" || !item.trim()) {
      throw new TypeError(`${field} entries must be non-empty strings.`);
    }
    return item.trim();
  }))];
}

function normalizeMemories(value) {
  if (!Array.isArray(value)) {
    throw new TypeError("memories must be an array.");
  }
  return value.map((memory, index) => normalizeMemory(memory, `memories[${index}]`));
}

function normalizeMemory(memory, field) {
  if (!memory || typeof memory !== "object" || Array.isArray(memory)) {
    throw new TypeError(`${field} must be an object.`);
  }

  const normalized = {
    id: normalizeMemoryId(memory.id),
    content: normalizeNonEmptyString(memory.content ?? memory.text, `${field}.content`),
    pinned: Boolean(memory.pinned),
    sentiment: normalizeEnum(
      memory.sentiment ?? "neutral",
      `${field}.sentiment`,
      SHOPPING_MEMORY_SENTIMENTS,
    ),
    tags: normalizeUniqueStringArray(memory.tags ?? [], `${field}.tags`),
    timestamp: normalizeTimestamp(memory.timestamp ?? new Date()),
    type: normalizeNonEmptyString(memory.type ?? "note", `${field}.type`),
  };

  if (memory.source !== undefined) {
    normalized.source = normalizeNonEmptyString(memory.source, `${field}.source`);
  }
  if (memory.outcome !== undefined) {
    normalized.outcome = normalizeNonEmptyString(memory.outcome, `${field}.outcome`);
  }
  if (memory.subject !== undefined) {
    normalized.subject = normalizeMemorySubject(memory.subject, `${field}.subject`);
  }

  return normalized;
}

function normalizeMemorySubject(subject, field) {
  if (!subject || typeof subject !== "object" || Array.isArray(subject)) {
    throw new TypeError(`${field} must be an object.`);
  }

  const normalized = {};
  for (const key of ["brand", "title", "color", "size", "productUrl", "retailer", "category"]) {
    if (subject[key] !== undefined) {
      normalized[key] = normalizeNonEmptyString(subject[key], `${field}.${key}`);
    }
  }
  if (Array.isArray(subject.tags)) {
    normalized.tags = normalizeUniqueStringArray(subject.tags, `${field}.tags`);
  }
  if (Object.keys(normalized).length === 0) {
    throw new TypeError(`${field} must include at least one searchable field.`);
  }
  return normalized;
}

function normalizeMemoryId(value) {
  if (value !== undefined) {
    return normalizeNonEmptyString(value, "memory id");
  }
  return `mem-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeNonEmptyString(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${field} must be a non-empty string.`);
  }
  return value.trim();
}

function normalizeEnum(value, field, allowedValues) {
  if (!allowedValues.includes(value)) {
    throw new TypeError(`${field} must be one of: ${allowedValues.join(", ")}.`);
  }
  return value;
}

function normalizeTimestamp(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError("timestamp must be a valid date or ISO timestamp.");
  }
  return date.toISOString();
}

function ensureShoppingTag(tags = []) {
  return normalizeUniqueStringArray([...tags, SHOPPING_MEMORY_TAG], "memory.tags");
}

function inferOutcomeSentiment(outcome, feedback) {
  const text = `${outcome} ${feedback}`.toLowerCase();
  if (/\b(dislike|bad|wrong|returned|return|reject|rejected|avoid|scratchy|poor|failed)\b/.test(text)) {
    return "negative";
  }
  if (/\b(like|liked|good|great|kept|keeper|success|worked|love)\b/.test(text)) {
    return "positive";
  }
  return "neutral";
}
