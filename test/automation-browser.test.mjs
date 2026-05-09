import test from "node:test";
import assert from "node:assert/strict";

import {
  VisibleAutomationBrowserRun,
  createAutomationBrowserWaitingMessage,
  createAutomationBrowserTitle,
  notifyIfBrowserChallengeVisible,
} from "../src/automation-browser.mjs";

test("creates the distinct Bestfriend browser title for a retailer", () => {
  assert.equal(createAutomationBrowserTitle("  Asket  "), "Bestfriend · Asket");
});

test("creates the retailer-specific user handoff message", () => {
  assert.equal(
    createAutomationBrowserWaitingMessage("  ASOS  "),
    "Waiting for you to confirm in ASOS window…",
  );
});

test("launches a visible staging run, titles it, foregrounds it, then backgrounds on success", async () => {
  const events = [];
  const session = {
    async setWindowTitle(title) {
      events.push(["title", title]);
    },
    async foreground() {
      events.push(["foreground"]);
    },
    async background() {
      events.push(["background"]);
    },
  };
  const launcher = {
    async launch(options) {
      events.push(["launch", options]);
      return session;
    },
  };
  const browserRun = new VisibleAutomationBrowserRun({ launcher });

  const started = await browserRun.startStagingRun({ retailer: "Asket" });
  const completed = await browserRun.completeSuccessfully();

  assert.deepEqual(started, {
    headless: false,
    retailer: "Asket",
    title: "Bestfriend · Asket",
  });
  assert.deepEqual(completed, { status: "succeeded" });
  assert.deepEqual(events, [
    ["launch", { retailer: "Asket", title: "Bestfriend · Asket", headless: false }],
    ["title", "Bestfriend · Asket"],
    ["foreground"],
    ["background"],
  ]);
  assert.equal(browserRun.isActive, false);
});

test("keeps the browser foregrounded and publishes Waiting when a challenge is encountered", async () => {
  const events = [];
  const launcher = {
    async launch() {
      return {
        async setWindowTitle(title) {
          events.push(["title", title]);
        },
        async foreground() {
          events.push(["foreground"]);
        },
        async background() {
          events.push(["background"]);
        },
      };
    },
  };
  const chat = {
    async showWaiting(message, payload) {
      events.push(["chat", message, payload.reason, payload.retailer]);
    },
  };
  const browserRun = new VisibleAutomationBrowserRun({ launcher, chat });

  await browserRun.startStagingRun({ retailer: "Zalando" });
  const waiting = await browserRun.waitForUserAction({ reason: "captcha" });
  const completed = await browserRun.completeSuccessfully();

  assert.deepEqual(waiting, {
    message: "Waiting for you to confirm in Zalando window…",
    reason: "captcha",
    status: "waiting",
  });
  assert.deepEqual(completed, {
    message: "Waiting for you to confirm in Zalando window…",
    status: "waiting",
  });
  assert.deepEqual(events, [
    ["title", "Bestfriend · Zalando"],
    ["foreground"],
    ["chat", "Waiting for you to confirm in Zalando window…", "captcha", "Zalando"],
  ]);
  assert.equal(browserRun.isActive, true);
});

test("can foreground the active browser again after a staging failure", async () => {
  const events = [];
  const launcher = {
    async launch() {
      return {
        async foreground() {
          events.push(["foreground"]);
        },
      };
    },
  };
  const browserRun = new VisibleAutomationBrowserRun({ launcher });

  await browserRun.startStagingRun({ retailer: "Asket" });
  const foregrounded = await browserRun.foregroundCurrentPage();

  assert.deepEqual(foregrounded, { status: "foregrounded" });
  assert.deepEqual(events, [["foreground"], ["foreground"]]);
});

test("publishes Waiting when a Cloudflare-style challenge page is detected", async () => {
  const events = [];
  const challengeStates = [true, false];
  const session = {
    async setWindowTitle(title) {
      events.push(["title", title]);
    },
    async foreground() {
      events.push(["foreground"]);
    },
  };
  const launcher = {
    async launch() {
      return session;
    },
  };
  const browserRun = new VisibleAutomationBrowserRun({
    launcher,
    chat: {
      async showWaiting(message, payload) {
        events.push(["chat", message, payload.reason, payload.retailer]);
      },
    },
  });

  await browserRun.startStagingRun({ retailer: "ASOS" });
  const notified = await notifyIfBrowserChallengeVisible({
    browserRun,
    session: {
      async evaluate() {
        return challengeStates.shift() ?? false;
      },
    },
    reason: "cloudflare",
    pollIntervalMs: 0,
  });

  assert.equal(notified, true);
  assert.deepEqual(events, [
    ["title", "Bestfriend · ASOS"],
    ["foreground"],
    ["chat", "Waiting for you to confirm in ASOS window…", "cloudflare", "ASOS"],
  ]);
  assert.deepEqual(await browserRun.completeSuccessfully(), { status: "succeeded" });
});

test("pauses challenge-aware staging until the challenge clears and focus returns", async () => {
  const events = [];
  const challengeStates = [true, false, false];
  const focusStates = [false, true];
  const session = {
    async evaluate() {
      return challengeStates.shift() ?? false;
    },
    async hasFocus() {
      return focusStates.shift() ?? true;
    },
  };
  const browserRun = new VisibleAutomationBrowserRun({
    launcher: {
      async launch() {
        return session;
      },
    },
    chat: {
      async showWaiting(message, payload) {
        events.push(["chat", message, payload.reason, payload.retailer]);
      },
    },
  });

  await browserRun.startStagingRun({ retailer: "ASOS" });
  const notified = await notifyIfBrowserChallengeVisible({
    browserRun,
    pollIntervalMs: 0,
    reason: "captcha",
    session,
  });

  assert.equal(notified, true);
  assert.deepEqual(events, [["chat", "Waiting for you to confirm in ASOS window…", "captcha", "ASOS"]]);
  assert.deepEqual(await browserRun.completeSuccessfully(), { status: "succeeded" });
});

test("times out unresolved challenges so staging can render a failure card", async () => {
  const browserRun = new VisibleAutomationBrowserRun({
    launcher: {
      async launch() {
        return {};
      },
    },
  });

  await browserRun.startStagingRun({ retailer: "ASOS" });

  await assert.rejects(
    () =>
      browserRun.waitForUserAction({
        isResolved: async () => false,
        pollIntervalMs: 0,
        reason: "captcha",
        timeoutMs: 0,
      }),
    /Timed out waiting for ASOS captcha challenge to be resolved/,
  );
});

test("headless runs suppress foregrounding and backgrounding", async () => {
  const events = [];
  const launcher = {
    async launch(options) {
      events.push(["launch", options.headless]);
      return {};
    },
  };
  const windowManager = {
    async setTitle(_session, title) {
      events.push(["title", title]);
    },
    async foreground() {
      events.push(["foreground"]);
    },
    async background() {
      events.push(["background"]);
    },
  };
  const browserRun = new VisibleAutomationBrowserRun({ launcher, windowManager });

  await browserRun.startStagingRun({ retailer: "ASOS", headless: true });
  await browserRun.completeSuccessfully();

  assert.deepEqual(events, [
    ["launch", true],
    ["title", "Bestfriend · ASOS"],
  ]);
});

test("validates required lifecycle inputs", async () => {
  assert.throws(
    () => new VisibleAutomationBrowserRun(),
    /launcher\.launch must be a function/,
  );

  const browserRun = new VisibleAutomationBrowserRun({
    launcher: {
      async launch() {
        return {};
      },
    },
  });

  await assert.rejects(
    () => browserRun.startStagingRun({ retailer: "" }),
    /retailer must be a non-empty string/,
  );
  await assert.rejects(
    () => browserRun.startStagingRun({ retailer: "Asket", headless: "yes" }),
    /headless must be a boolean/,
  );
});
