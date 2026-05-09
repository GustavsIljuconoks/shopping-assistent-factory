import test from "node:test";
import assert from "node:assert/strict";

import {
  AUTOMATION_BROWSER_WAITING_MESSAGE,
  VisibleAutomationBrowserRun,
  createAutomationBrowserTitle,
} from "../src/automation-browser.mjs";

test("creates the distinct Bestfriend browser title for a retailer", () => {
  assert.equal(createAutomationBrowserTitle("  Asket  "), "Bestfriend · Asket");
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
    message: AUTOMATION_BROWSER_WAITING_MESSAGE,
    reason: "captcha",
    status: "waiting",
  });
  assert.deepEqual(completed, {
    message: AUTOMATION_BROWSER_WAITING_MESSAGE,
    status: "waiting",
  });
  assert.deepEqual(events, [
    ["title", "Bestfriend · Zalando"],
    ["foreground"],
    ["chat", AUTOMATION_BROWSER_WAITING_MESSAGE, "captcha", "Zalando"],
  ]);
  assert.equal(browserRun.isActive, true);
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
