import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import assert from "node:assert/strict";

import {
  BROWSER_PROFILE_METADATA_FILE,
  disconnectRetailerBrowserProfile,
  ensureEnabledRetailerBrowserProfiles,
  ensureRetailerBrowserProfile,
  getRetailerBrowserProfileDirectory,
} from "../src/shopping-browser-profiles.mjs";

test("assigns each retailer identifier a unique profile directory", async () => {
  const dir = await mkProfileRoot();

  try {
    const zalando = getRetailerBrowserProfileDirectory("Zalando", dir);
    const aboutYou = getRetailerBrowserProfileDirectory("About You", dir);
    const suspicious = getRetailerBrowserProfileDirectory("../Zalando", dir);

    assert.notEqual(zalando, aboutYou);
    assert.notEqual(zalando, suspicious);
    assert.equal(isInside(dir, zalando), true);
    assert.equal(isInside(dir, suspicious), true);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("creates persistent browser profile directories for enabled retailers", async () => {
  const dir = await mkProfileRoot();

  try {
    const profiles = await ensureEnabledRetailerBrowserProfiles(["Zalando", "ASOS", "Zalando"], dir);

    assert.equal(profiles.length, 2);
    assert.deepEqual(
      profiles.map((profile) => profile.retailerIdentifier),
      ["Zalando", "ASOS"],
    );

    for (const profile of profiles) {
      assert.equal(profile.userDataDir, profile.profileDirectory);
      const metadata = JSON.parse(
        await readFile(join(profile.profileDirectory, BROWSER_PROFILE_METADATA_FILE), "utf8"),
      );
      assert.equal(metadata.retailerIdentifier, profile.retailerIdentifier);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("keeps existing session data when the profile is ensured again after restart", async () => {
  const dir = await mkProfileRoot();

  try {
    const profile = await ensureRetailerBrowserProfile("About You", dir);
    await writeFile(join(profile.profileDirectory, "Cookies"), "session=retained\n", "utf8");

    const reloaded = await ensureRetailerBrowserProfile("About You", dir);
    const cookieData = await readFile(join(reloaded.profileDirectory, "Cookies"), "utf8");

    assert.equal(reloaded.profileDirectory, profile.profileDirectory);
    assert.equal(cookieData, "session=retained\n");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("disconnect removes only the selected retailer profile", async () => {
  const dir = await mkProfileRoot();

  try {
    const zalando = await ensureRetailerBrowserProfile("Zalando", dir);
    const asos = await ensureRetailerBrowserProfile("ASOS", dir);
    await writeFile(join(zalando.profileDirectory, "Cookies"), "zalando-session\n", "utf8");
    await writeFile(join(asos.profileDirectory, "Cookies"), "asos-session\n", "utf8");

    const disconnected = await disconnectRetailerBrowserProfile("Zalando", dir);

    assert.equal(disconnected.profileDirectory, zalando.profileDirectory);
    await assert.rejects(stat(zalando.profileDirectory), { code: "ENOENT" });
    assert.equal(await readFile(join(asos.profileDirectory, "Cookies"), "utf8"), "asos-session\n");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("rejects blank retailer identifiers", async () => {
  const dir = await mkProfileRoot();

  try {
    await assert.rejects(
      ensureRetailerBrowserProfile(" ", dir),
      /retailerIdentifier must be a non-empty string/,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

async function mkProfileRoot() {
  return mkdtemp(join(tmpdir(), "shopping-browser-profiles-"));
}

function isInside(root, target) {
  const path = relative(root, target);
  return path !== "" && !path.startsWith("..") && !path.includes(`..${sep}`);
}
