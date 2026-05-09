import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import assert from "node:assert/strict";

import {
  RETAILER_SESSION_CONNECTED_STATUS,
  RETAILER_SESSION_STATUS_FILE,
} from "../src/asket-login-flow.mjs";
import {
  HM_LOGIN_URL,
  HM_RETAILER_IDENTIFIER,
  readHmConnectedRetailers,
  readHmConnectionStatus,
  startHmLoginFlow,
} from "../src/hm-login-flow.mjs";

test("opens H&M.lv login in a visible persistent profile and records connected status", async () => {
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
    const result = await startHmLoginFlow({
      launcher,
      profilesRoot,
      now: new Date("2026-05-09T12:00:00.000Z"),
      waitForAuthenticated: async ({ loginUrl, retailerIdentifier, session: callbackSession }) => {
        assert.equal(loginUrl, HM_LOGIN_URL);
        assert.equal(retailerIdentifier, HM_RETAILER_IDENTIFIER);
        assert.equal(callbackSession, session);
        events.push(["authenticated"]);
        return true;
      },
    });

    assert.equal(result.retailerIdentifier, HM_RETAILER_IDENTIFIER);
    assert.equal(result.status, RETAILER_SESSION_CONNECTED_STATUS);
    assert.equal(result.sessionStatus.connectedAt, "2026-05-09T12:00:00.000Z");
    assert.deepEqual(
      events.map((event) => event[0]),
      ["launch", "title", "foreground", "goto", "authenticated", "background"],
    );
    assert.equal(events[0][1].retailer, HM_RETAILER_IDENTIFIER);
    assert.equal(events[0][1].loginUrl, HM_LOGIN_URL);

    const stored = JSON.parse(
      await readFile(join(result.profile.profileDirectory, RETAILER_SESSION_STATUS_FILE), "utf8"),
    );
    assert.deepEqual(stored, {
      schemaVersion: 1,
      retailerIdentifier: HM_RETAILER_IDENTIFIER,
      status: RETAILER_SESSION_CONNECTED_STATUS,
      connectedAt: "2026-05-09T12:00:00.000Z",
    });
  } finally {
    await rm(profilesRoot, { recursive: true, force: true });
  }
});

test("H&M.lv connection status survives a later read", async () => {
  const profilesRoot = await mkProfileRoot();
  const launcher = {
    async launch() {
      return {
        async navigate() {},
      };
    },
  };

  try {
    await startHmLoginFlow({
      launcher,
      profilesRoot,
      now: new Date("2026-05-09T13:00:00.000Z"),
      waitForAuthenticated: async () => true,
    });

    assert.deepEqual(await readHmConnectionStatus(profilesRoot), {
      schemaVersion: 1,
      retailerIdentifier: HM_RETAILER_IDENTIFIER,
      status: RETAILER_SESSION_CONNECTED_STATUS,
      connectedAt: "2026-05-09T13:00:00.000Z",
    });
    assert.deepEqual(await readHmConnectedRetailers(profilesRoot), [
      {
        retailerIdentifier: HM_RETAILER_IDENTIFIER,
        status: "Connected",
      },
    ]);
  } finally {
    await rm(profilesRoot, { recursive: true, force: true });
  }
});

test("does not mark H&M.lv connected when authentication does not complete", async () => {
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
        startHmLoginFlow({
          launcher,
          profilesRoot,
          waitForAuthenticated: async () => false,
        }),
      /H&M\.lv authentication did not complete/,
    );

    assert.equal(await readHmConnectionStatus(profilesRoot), undefined);
    assert.deepEqual(await readHmConnectedRetailers(profilesRoot), []);
  } finally {
    await rm(profilesRoot, { recursive: true, force: true });
  }
});

async function mkProfileRoot() {
  return mkdtemp(join(tmpdir(), "hm-login-flow-"));
}
