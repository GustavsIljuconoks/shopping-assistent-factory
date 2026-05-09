export const AUTOMATION_BROWSER_DEFAULT_CHALLENGE_TIMEOUT_MS = 5 * 60 * 1000;
export const AUTOMATION_BROWSER_WAITING_MESSAGE = "Waiting…";
export const AUTOMATION_BROWSER_TITLE_PREFIX = "Bestfriend";

export function createAutomationBrowserTitle(retailer) {
  return `${AUTOMATION_BROWSER_TITLE_PREFIX} · ${normalizeRetailer(retailer)}`;
}

export function createAutomationBrowserWaitingMessage(retailer) {
  return `Waiting for you to confirm in ${normalizeRetailer(retailer)} window…`;
}

export class VisibleAutomationBrowserRun {
  constructor({ launcher, windowManager = {}, chat = {} } = {}) {
    if (!launcher || typeof launcher.launch !== "function") {
      throw new TypeError("launcher.launch must be a function.");
    }

    this.launcher = launcher;
    this.windowManager = windowManager;
    this.chat = chat;
    this.current = undefined;
  }

  async startStagingRun({ retailer, headless = false, ...launchOptions } = {}) {
    if (this.current) {
      throw new Error("An automation browser run is already active.");
    }

    const normalizedRetailer = normalizeRetailer(retailer);
    const normalizedHeadless = normalizeBoolean(headless, "headless");
    const title = createAutomationBrowserTitle(normalizedRetailer);
    const session = await this.launcher.launch({
      ...launchOptions,
      retailer: normalizedRetailer,
      title,
      headless: normalizedHeadless,
    });

    this.current = {
      headless: normalizedHeadless,
      retailer: normalizedRetailer,
      session,
      title,
      userActionNeeded: false,
    };

    await setBrowserTitle({ session, windowManager: this.windowManager, title });

    if (!normalizedHeadless) {
      await foregroundBrowser({ session, windowManager: this.windowManager });
    }

    return {
      headless: normalizedHeadless,
      retailer: normalizedRetailer,
      title,
    };
  }

  async waitForUserAction({
    hasUserReturnedFocus,
    isResolved,
    pollIntervalMs = 1000,
    reason = "challenge",
    timeoutMs = AUTOMATION_BROWSER_DEFAULT_CHALLENGE_TIMEOUT_MS,
  } = {}) {
    const run = this.requireCurrentRun();
    run.userActionNeeded = true;
    const message = createAutomationBrowserWaitingMessage(run.retailer);

    await publishWaiting(this.chat, {
      message,
      reason,
      retailer: run.retailer,
      session: run.session,
    });

    if (typeof isResolved !== "function") {
      return {
        message,
        reason,
        status: "waiting",
      };
    }

    await waitForUserActionResolution({
      hasUserReturnedFocus,
      isResolved,
      pollIntervalMs,
      reason,
      retailer: run.retailer,
      session: run.session,
      timeoutMs,
      windowManager: this.windowManager,
    });

    run.userActionNeeded = false;
    return {
      message,
      reason,
      status: "resumed",
    };
  }

  async foregroundCurrentPage() {
    const run = this.requireCurrentRun();

    if (!run.headless) {
      await foregroundBrowser({ session: run.session, windowManager: this.windowManager });
    }

    return {
      status: "foregrounded",
    };
  }

  async completeSuccessfully() {
    const run = this.requireCurrentRun();

    if (run.userActionNeeded) {
      return {
        message: createAutomationBrowserWaitingMessage(run.retailer),
        status: "waiting",
      };
    }

    if (!run.headless) {
      await backgroundBrowser({ session: run.session, windowManager: this.windowManager });
    }

    this.current = undefined;

    return {
      status: "succeeded",
    };
  }

  get isActive() {
    return Boolean(this.current);
  }

  requireCurrentRun() {
    if (!this.current) {
      throw new Error("No automation browser run is active.");
    }
    return this.current;
  }
}

async function setBrowserTitle({ session, windowManager, title }) {
  if (session && typeof session.setWindowTitle === "function") {
    await session.setWindowTitle(title);
    return;
  }
  if (typeof windowManager.setTitle === "function") {
    await windowManager.setTitle(session, title);
  }
}

async function foregroundBrowser({ session, windowManager }) {
  if (session && typeof session.foreground === "function") {
    await session.foreground();
    return;
  }
  if (typeof windowManager.foreground === "function") {
    await windowManager.foreground(session);
  }
}

async function backgroundBrowser({ session, windowManager }) {
  if (session && typeof session.background === "function") {
    await session.background();
    return;
  }
  if (typeof windowManager.background === "function") {
    await windowManager.background(session);
  }
}

async function publishWaiting(chat, payload) {
  if (typeof chat.showWaiting === "function") {
    await chat.showWaiting(payload.message, payload);
    return;
  }
  if (typeof chat.setStatus === "function") {
    await chat.setStatus(payload.message, payload);
    return;
  }
  if (typeof chat === "function") {
    await chat(payload.message, payload);
  }
}

export async function notifyIfBrowserChallengeVisible({
  browserRun,
  session,
  pollIntervalMs,
  reason = "cloudflare",
  timeoutMs,
} = {}) {
  if (!browserRun || typeof browserRun.waitForUserAction !== "function") {
    return false;
  }
  if (!(await detectBrowserChallengeInSession(session))) {
    return false;
  }
  await browserRun.waitForUserAction({
    isResolved: async () => !(await detectBrowserChallengeInSession(session)),
    pollIntervalMs,
    reason,
    timeoutMs,
  });
  return true;
}

async function detectBrowserChallengeInSession(session) {
  if (!session || typeof session.evaluate !== "function") {
    return false;
  }

  try {
    return await session.evaluate(() => {
      const title = (document.title || "").toLowerCase();
      if (title.includes("just a moment") || title.includes("attention required")) {
        return true;
      }
      if (
        document.querySelector(
          "#challenge-running, #cf-challenge-running, .cf-browser-verification, #challenge-body-text",
        )
      ) {
        return true;
      }
      const host = (window.location?.hostname || "").toLowerCase();
      return host.includes("challenges.cloudflare.com");
    });
  } catch {
    return false;
  }
}

async function waitForUserActionResolution({
  hasUserReturnedFocus,
  isResolved,
  pollIntervalMs,
  reason,
  retailer,
  session,
  timeoutMs,
  windowManager,
}) {
  const startedAt = Date.now();
  const normalizedTimeoutMs = normalizeNonNegativeNumber(timeoutMs, "timeoutMs");
  const normalizedPollIntervalMs = normalizeNonNegativeNumber(pollIntervalMs, "pollIntervalMs");

  while (Date.now() - startedAt <= normalizedTimeoutMs) {
    if ((await isResolved()) && (await userReturnedFocus({ hasUserReturnedFocus, session, windowManager }))) {
      return;
    }
    await sleep(normalizedPollIntervalMs);
  }

  throw new Error(
    `Timed out waiting for ${normalizeRetailer(retailer)} ${reason} challenge to be resolved.`,
  );
}

async function userReturnedFocus({ hasUserReturnedFocus, session, windowManager }) {
  if (typeof hasUserReturnedFocus === "function") {
    return Boolean(await hasUserReturnedFocus());
  }
  if (session && typeof session.hasFocus === "function") {
    return Boolean(await session.hasFocus());
  }
  if (session && typeof session.isFocused === "function") {
    return Boolean(await session.isFocused());
  }
  if (typeof windowManager.hasFocus === "function") {
    return Boolean(await windowManager.hasFocus(session));
  }
  if (typeof windowManager.isFocused === "function") {
    return Boolean(await windowManager.isFocused(session));
  }
  return true;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeRetailer(retailer) {
  if (typeof retailer !== "string" || !retailer.trim()) {
    throw new TypeError("retailer must be a non-empty string.");
  }
  return retailer.trim();
}

function normalizeBoolean(value, field) {
  if (typeof value !== "boolean") {
    throw new TypeError(`${field} must be a boolean.`);
  }
  return value;
}

function normalizeNonNegativeNumber(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new TypeError(`${field} must be a non-negative finite number.`);
  }
  return number;
}
