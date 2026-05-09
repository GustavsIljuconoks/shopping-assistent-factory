import { mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export const BROWSER_PROFILE_SCHEMA_VERSION = 1;
export const DEFAULT_BROWSER_PROFILES_ROOT = "data/browser-profiles";
export const BROWSER_PROFILE_METADATA_FILE = "retailer-profile.json";

export function normalizeRetailerIdentifier(retailerIdentifier) {
  if (typeof retailerIdentifier !== "string" || !retailerIdentifier.trim()) {
    throw new TypeError("retailerIdentifier must be a non-empty string.");
  }
  return retailerIdentifier.trim();
}

export function getRetailerBrowserProfileDirectory(
  retailerIdentifier,
  profilesRoot = DEFAULT_BROWSER_PROFILES_ROOT,
) {
  const normalized = normalizeRetailerIdentifier(retailerIdentifier);
  return resolve(profilesRoot, encodeRetailerIdentifier(normalized));
}

export async function ensureRetailerBrowserProfile(
  retailerIdentifier,
  profilesRoot = DEFAULT_BROWSER_PROFILES_ROOT,
) {
  const normalized = normalizeRetailerIdentifier(retailerIdentifier);
  const profileDirectory = getRetailerBrowserProfileDirectory(normalized, profilesRoot);
  const profile = createRetailerBrowserProfileDescriptor(normalized, profileDirectory);

  await mkdir(profileDirectory, { recursive: true });
  await writeFile(
    resolve(profileDirectory, BROWSER_PROFILE_METADATA_FILE),
    `${JSON.stringify(
      {
        schemaVersion: BROWSER_PROFILE_SCHEMA_VERSION,
        retailerIdentifier: normalized,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  return profile;
}

export async function ensureEnabledRetailerBrowserProfiles(
  retailerIdentifiers,
  profilesRoot = DEFAULT_BROWSER_PROFILES_ROOT,
) {
  if (!Array.isArray(retailerIdentifiers)) {
    throw new TypeError("retailerIdentifiers must be an array.");
  }

  const uniqueRetailers = [...new Set(retailerIdentifiers.map(normalizeRetailerIdentifier))];
  return Promise.all(
    uniqueRetailers.map((retailerIdentifier) =>
      ensureRetailerBrowserProfile(retailerIdentifier, profilesRoot),
    ),
  );
}

export async function disconnectRetailerBrowserProfile(
  retailerIdentifier,
  profilesRoot = DEFAULT_BROWSER_PROFILES_ROOT,
) {
  const normalized = normalizeRetailerIdentifier(retailerIdentifier);
  const profileDirectory = getRetailerBrowserProfileDirectory(normalized, profilesRoot);

  await rm(profileDirectory, { recursive: true, force: true });

  return createRetailerBrowserProfileDescriptor(normalized, profileDirectory);
}

function createRetailerBrowserProfileDescriptor(retailerIdentifier, profileDirectory) {
  return {
    retailerIdentifier,
    profileDirectory,
    userDataDir: profileDirectory,
  };
}

function encodeRetailerIdentifier(retailerIdentifier) {
  return `retailer-${Buffer.from(retailerIdentifier, "utf8").toString("hex")}`;
}

