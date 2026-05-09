import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export const DEFAULT_PROFILE = Object.freeze({
  country: null,
  currency: null,
  sizes: Object.freeze({}),
  budgetAnchors: Object.freeze({}),
  exclusions: Object.freeze([]),
  ceiling: null,
  retailers: Object.freeze([]),
});

const PROFILE_FIELDS = new Set(Object.keys(DEFAULT_PROFILE));

export function normalizeProfile(value = {}) {
  const input = isObject(value) ? value : {};
  return {
    country: stringOrNull(input.country),
    currency: stringOrNull(input.currency),
    sizes: objectOrEmpty(input.sizes),
    budgetAnchors: objectOrEmpty(input.budgetAnchors),
    exclusions: stringArray(input.exclusions),
    ceiling: numberOrNull(input.ceiling),
    retailers: stringArray(input.retailers ?? input.retailerList),
  };
}

export function createShoppingProfileStore(options = {}) {
  const filePath = options.filePath ?? "data/shopping/profile.json";

  async function readProfile() {
    try {
      const raw = await readFile(filePath, "utf8");
      return normalizeProfile(JSON.parse(raw));
    } catch (error) {
      if (error.code === "ENOENT") return normalizeProfile();
      throw error;
    }
  }

  async function writeProfile(profile) {
    const normalized = normalizeProfile(profile);
    await mkdir(dirname(filePath), { recursive: true });
    const tmpPath = `${filePath}.tmp`;
    await writeFile(tmpPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
    await rename(tmpPath, filePath);
    return normalized;
  }

  async function updateProfile(patch) {
    const current = await readProfile();
    return writeProfile({ ...current, ...(isObject(patch) ? patch : {}) });
  }

  async function getField(field) {
    assertProfileField(field);
    const profile = await readProfile();
    return profile[field];
  }

  async function setField(field, value) {
    assertProfileField(field);
    return updateProfile({ [field]: value });
  }

  return {
    filePath,
    readProfile,
    writeProfile,
    updateProfile,
    getField,
    setField,
  };
}

function assertProfileField(field) {
  if (!PROFILE_FIELDS.has(field)) {
    throw new Error(`Unknown shopping profile field: ${field}`);
  }
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringOrNull(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function stringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function objectOrEmpty(value) {
  if (!isObject(value)) return {};
  return structuredClone(value);
}
