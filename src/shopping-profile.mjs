import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export const SHOPPING_PROFILE_SCHEMA_VERSION = 1;
export const DEFAULT_SHOPPING_PROFILE_PATH = "data/shopping-profile.json";

export function createDefaultShoppingProfile(overrides = {}) {
  return normalizeShoppingProfile({
    country: "LV",
    currency: "EUR",
    sizes: {},
    budgetAnchors: {},
    hardExclusions: [],
    perItemPriceCeiling: { amount: 0, currency: "EUR" },
    enabledRetailers: [],
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
      normalizeMoney(value, `budgetAnchors.${key}`, currency),
    ),
    hardExclusions: normalizeUniqueStringArray(profile.hardExclusions, "hardExclusions"),
    perItemPriceCeiling,
    enabledRetailers: normalizeUniqueStringArray(profile.enabledRetailers, "enabledRetailers"),
  };
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
