import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { VisibleAutomationBrowserRun } from "./automation-browser.mjs";
import {
  ensureRetailerBrowserProfile,
  getRetailerBrowserProfileDirectory,
} from "./shopping-browser-profiles.mjs";

export const ASKET_RETAILER_IDENTIFIER = "Asket";
export const ASKET_LOGIN_URL = "https://www.asket.com/en-dk/account";
export const RETAILER_SESSION_STATUS_FILE = "retailer-session.json";
export const RETAILER_SESSION_SCHEMA_VERSION = 1;
export const RETAILER_SESSION_CONNECTED_STATUS = "connected";

export async function startAsketLoginFlow({
  browserRun,
  launcher,
  windowManager,
  chat,
  profilesRoot,
  loginUrl = ASKET_LOGIN_URL,
  waitForAuthenticated,
  now = new Date(),
} = {}) {
  const profile = await ensureRetailerBrowserProfile(ASKET_RETAILER_IDENTIFIER, profilesRoot);
  const run =
    browserRun ??
    new VisibleAutomationBrowserRun({
      launcher,
      windowManager,
      chat,
    });

  await run.startStagingRun({
    retailer: ASKET_RETAILER_IDENTIFIER,
    loginUrl,
    startUrl: loginUrl,
    userDataDir: profile.userDataDir,
  });

  const session = run.requireCurrentRun().session;
  await openLoginPage(session, loginUrl);
  const authenticated = await waitForAsketAuthentication(session, waitForAuthenticated, loginUrl);

  if (!authenticated) {
    throw new Error("Asket authentication did not complete.");
  }

  const sessionStatus = await writeRetailerSessionStatus(
    {
      retailerIdentifier: ASKET_RETAILER_IDENTIFIER,
      status: RETAILER_SESSION_CONNECTED_STATUS,
      connectedAt: now,
    },
    profile.profileDirectory,
  );
  await run.completeSuccessfully();

  return {
    loginUrl,
    profile,
    retailerIdentifier: ASKET_RETAILER_IDENTIFIER,
    sessionStatus,
    status: RETAILER_SESSION_CONNECTED_STATUS,
  };
}

export async function readAsketConnectionStatus(profilesRoot) {
  const profileDirectory = getRetailerBrowserProfileDirectory(
    ASKET_RETAILER_IDENTIFIER,
    profilesRoot,
  );
  return readRetailerSessionStatus(profileDirectory);
}

export async function readAsketConnectedRetailers(profilesRoot) {
  const status = await readAsketConnectionStatus(profilesRoot);
  if (status?.status !== RETAILER_SESSION_CONNECTED_STATUS) {
    return [];
  }

  return [
    {
      retailerIdentifier: ASKET_RETAILER_IDENTIFIER,
      status: "Connected",
    },
  ];
}

export async function writeRetailerSessionStatus(status, profileDirectory) {
  const normalized = normalizeRetailerSessionStatus(status);
  await writeFile(
    join(profileDirectory, RETAILER_SESSION_STATUS_FILE),
    `${JSON.stringify(normalized, null, 2)}\n`,
    "utf8",
  );
  return normalized;
}

export async function readRetailerSessionStatus(profileDirectory) {
  try {
    const raw = await readFile(join(profileDirectory, RETAILER_SESSION_STATUS_FILE), "utf8");
    return normalizeRetailerSessionStatus(JSON.parse(raw));
  } catch (err) {
    if (err.code === "ENOENT") {
      return undefined;
    }
    throw err;
  }
}

function normalizeRetailerSessionStatus(status) {
  if (!status || typeof status !== "object" || Array.isArray(status)) {
    throw new TypeError("Retailer session status must be an object.");
  }

  const retailerIdentifier = normalizeString(status.retailerIdentifier, "retailerIdentifier");
  const normalizedStatus = normalizeString(status.status, "status");
  if (normalizedStatus !== RETAILER_SESSION_CONNECTED_STATUS) {
    throw new TypeError(`status must be ${RETAILER_SESSION_CONNECTED_STATUS}.`);
  }

  return {
    schemaVersion: RETAILER_SESSION_SCHEMA_VERSION,
    retailerIdentifier,
    status: normalizedStatus,
    connectedAt: normalizeTimestamp(status.connectedAt),
  };
}

async function openLoginPage(session, loginUrl) {
  if (session && typeof session.goto === "function") {
    await session.goto(loginUrl);
    return;
  }
  if (session && typeof session.navigate === "function") {
    await session.navigate(loginUrl);
    return;
  }
  if (session && typeof session.open === "function") {
    await session.open(loginUrl);
  }
}

async function waitForAsketAuthentication(session, waitForAuthenticated, loginUrl) {
  if (typeof waitForAuthenticated === "function") {
    return Boolean(
      await waitForAuthenticated({
        loginUrl,
        retailerIdentifier: ASKET_RETAILER_IDENTIFIER,
        session,
      }),
    );
  }
  if (session && typeof session.waitForAuthenticated === "function") {
    return Boolean(
      await session.waitForAuthenticated({
        loginUrl,
        retailerIdentifier: ASKET_RETAILER_IDENTIFIER,
      }),
    );
  }
  throw new TypeError("waitForAuthenticated must be a function.");
}

function normalizeString(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${field} must be a non-empty string.`);
  }
  return value.trim();
}

function normalizeTimestamp(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError("connectedAt must be a valid date or ISO timestamp.");
  }
  return date.toISOString();
}
