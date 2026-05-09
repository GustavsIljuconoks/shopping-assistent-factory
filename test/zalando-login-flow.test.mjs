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
  ZALANDO_LOGIN_URL,
  ZALANDO_RETAILER_IDENTIFIER,
  readZalandoConnectedRetailers,
  readZalandoConnectionStatus,
  startZalandoLoginFlow,
} from "../src/zalando-login-flow.mjs";

test("opens Zalando.lv login in a visible persistent profile and records connected status", async () => {
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
    const result = await startZalandoLoginFlow({
      launcher,
      profilesRoot,
      now: new Date("2026-05-09T12:00:00.000Z"),
      waitForAuthenticated: async ({ loginUrl, retailerIdentifier, session: callbackSession }) => {
        assert.equal(loginUrl, ZALANDO_LOGIN_URL);
        assert.equal(retailerIdentifier, ZALANDO_RETAILER_IDENTIFIER);
        assert.equal(callbackSession, session);
        events.push(["authenticated"]);
        return true;
      },
    });

    assert.equal(result.retailerIdentifier, ZALANDO_RETAILER_IDENTIFIER);
    assert.equal(result.status, RETAILER_SESSION_CONNECTED_STATUS);
    assert.equal(result.sessionStatus.connectedAt, "2026-05-09T12:00:00.000Z");
    assert.deepEqual(
      events.map((event) => event[0]),
      ["launch", "title", "foreground", "goto", "authenticated", "background"],
    );
    assert.equal(events[0][1].retailer, ZALANDO_RETAILER_IDENTIFIER);
    assert.equal(events[0][1].loginUrl, ZALANDO_LOGIN_URL);

    const stored = JSON.parse(
      await readFile(join(result.profile.profileDirectory, RETAILER_SESSION_STATUS_FILE), "utf8"),
    );
    assert.deepEqual(stored, {
      schemaVersion: 1,
      retailerIdentifier: ZALANDO_RETAILER_IDENTIFIER,
      status: RETAILER_SESSION_CONNECTED_STATUS,
      connectedAt: "2026-05-09T12:00:00.000Z",
    });
  } finally {
    await rm(profilesRoot, { recursive: true, force: true });
  }
});

test("Zalando.lv connection status survives a later read", async () => {
  const profilesRoot = await mkProfileRoot();
  const launcher = {
    async launch() {
      return {
        async navigate() {},
      };
    },
  };

  try {
    await startZalandoLoginFlow({
      launcher,
      profilesRoot,
      now: new Date("2026-05-09T13:00:00.000Z"),
      waitForAuthenticated: async () => true,
    });

    assert.deepEqual(await readZalandoConnectionStatus(profilesRoot), {
      schemaVersion: 1,
      retailerIdentifier: ZALANDO_RETAILER_IDENTIFIER,
      status: RETAILER_SESSION_CONNECTED_STATUS,
      connectedAt: "2026-05-09T13:00:00.000Z",
    });
    assert.deepEqual(await readZalandoConnectedRetailers(profilesRoot), [
      {
        retailerIdentifier: ZALANDO_RETAILER_IDENTIFIER,
        status: "Connected",
      },
    ]);
  } finally {
    await rm(profilesRoot, { recursive: true, force: true });
  }
});

test("does not mark Zalando.lv connected when authentication does not complete", async () => {
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
        startZalandoLoginFlow({
          launcher,
          profilesRoot,
          waitForAuthenticated: async () => false,
        }),
      /Zalando\.lv authentication did not complete/,
    );

    assert.equal(await readZalandoConnectionStatus(profilesRoot), undefined);
    assert.deepEqual(await readZalandoConnectedRetailers(profilesRoot), []);
  } finally {
    await rm(profilesRoot, { recursive: true, force: true });
  }
});

async function mkProfileRoot() {
  return mkdtemp(join(tmpdir(), "zalando-login-flow-"));
}
