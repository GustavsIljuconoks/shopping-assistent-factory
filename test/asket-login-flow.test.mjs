import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import assert from "node:assert/strict";

import {
  ASKET_LOGIN_URL,
  ASKET_RETAILER_IDENTIFIER,
  RETAILER_SESSION_CONNECTED_STATUS,
  RETAILER_SESSION_STATUS_FILE,
  readAsketConnectedRetailers,
  readAsketConnectionStatus,
  startAsketLoginFlow,
} from "../src/asket-login-flow.mjs";

test("opens Asket login in a visible persistent profile and records connected status", async () => {
  const profilesRoot = await mkProfileRoot();
  const events = [];
  const session = {
    async setWindowTitle(title) {
      events.push(["title", title]);
    },
    async foreground() {
      events.push(["foreground"]);
    },
    async goto(url) {
      events.push(["goto", url]);
    },
    async background() {
      events.push(["background"]);
    },
  };
  const launcher = {
    async launch(options) {
      events.push(["launch", options]);
      await stat(options.userDataDir);
      return session;
    },
  };

  try {
    const result = await startAsketLoginFlow({
      launcher,
      profilesRoot,
      now: new Date("2026-05-09T12:00:00.000Z"),
      waitForAuthenticated: async ({ loginUrl, retailerIdentifier, session: callbackSession }) => {
        assert.equal(loginUrl, ASKET_LOGIN_URL);
        assert.equal(retailerIdentifier, ASKET_RETAILER_IDENTIFIER);
        assert.equal(callbackSession, session);
        events.push(["authenticated"]);
        return true;
      },
    });

    assert.equal(result.retailerIdentifier, ASKET_RETAILER_IDENTIFIER);
    assert.equal(result.status, RETAILER_SESSION_CONNECTED_STATUS);
    assert.equal(result.sessionStatus.connectedAt, "2026-05-09T12:00:00.000Z");
    assert.equal(result.profile.userDataDir, result.profile.profileDirectory);

    assert.deepEqual(
      events.map((event) => event[0]),
      ["launch", "title", "foreground", "goto", "authenticated", "background"],
    );
    assert.equal(events[0][1].retailer, ASKET_RETAILER_IDENTIFIER);
    assert.equal(events[0][1].headless, false);
    assert.equal(events[0][1].loginUrl, ASKET_LOGIN_URL);
    assert.equal(events[0][1].startUrl, ASKET_LOGIN_URL);
    assert.equal(events[0][1].userDataDir, result.profile.profileDirectory);

    const stored = JSON.parse(
      await readFile(join(result.profile.profileDirectory, RETAILER_SESSION_STATUS_FILE), "utf8"),
    );
    assert.deepEqual(stored, {
      schemaVersion: 1,
      retailerIdentifier: ASKET_RETAILER_IDENTIFIER,
      status: RETAILER_SESSION_CONNECTED_STATUS,
      connectedAt: "2026-05-09T12:00:00.000Z",
    });
  } finally {
    await rm(profilesRoot, { recursive: true, force: true });
  }
});

test("connection status survives a later read from the same browser profile root", async () => {
  const profilesRoot = await mkProfileRoot();
  const launcher = {
    async launch() {
      return {
        async navigate() {},
      };
    },
  };

  try {
    await startAsketLoginFlow({
      launcher,
      profilesRoot,
      now: new Date("2026-05-09T13:00:00.000Z"),
      waitForAuthenticated: async () => true,
    });

    const reloaded = await readAsketConnectionStatus(profilesRoot);
    const connectedRetailers = await readAsketConnectedRetailers(profilesRoot);

    assert.deepEqual(reloaded, {
      schemaVersion: 1,
      retailerIdentifier: ASKET_RETAILER_IDENTIFIER,
      status: RETAILER_SESSION_CONNECTED_STATUS,
      connectedAt: "2026-05-09T13:00:00.000Z",
    });
    assert.deepEqual(connectedRetailers, [
      {
        retailerIdentifier: ASKET_RETAILER_IDENTIFIER,
        status: "Connected",
      },
    ]);
  } finally {
    await rm(profilesRoot, { recursive: true, force: true });
  }
});

test("does not mark Asket connected when authentication does not complete", async () => {
  const profilesRoot = await mkProfileRoot();
  const launcher = {
    async launch() {
      return {
        async open() {},
      };
    },
  };

  try {
    await assert.rejects(
      () =>
        startAsketLoginFlow({
          launcher,
          profilesRoot,
          waitForAuthenticated: async () => false,
        }),
      /Asket authentication did not complete/,
    );

    assert.equal(await readAsketConnectionStatus(profilesRoot), undefined);
    assert.deepEqual(await readAsketConnectedRetailers(profilesRoot), []);
  } finally {
    await rm(profilesRoot, { recursive: true, force: true });
  }
});

async function mkProfileRoot() {
  return mkdtemp(join(tmpdir(), "asket-login-flow-"));
}
