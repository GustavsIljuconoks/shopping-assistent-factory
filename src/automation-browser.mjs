export const AUTOMATION_BROWSER_WAITING_MESSAGE = "Waiting…";
export const AUTOMATION_BROWSER_TITLE_PREFIX = "Bestfriend";

export function createAutomationBrowserTitle(retailer) {
  return `${AUTOMATION_BROWSER_TITLE_PREFIX} · ${normalizeRetailer(retailer)}`;
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

  async waitForUserAction({ reason = "challenge" } = {}) {
    const run = this.requireCurrentRun();
    run.userActionNeeded = true;

    await publishWaiting(this.chat, {
      message: AUTOMATION_BROWSER_WAITING_MESSAGE,
      reason,
      retailer: run.retailer,
      session: run.session,
    });

    return {
      message: AUTOMATION_BROWSER_WAITING_MESSAGE,
      reason,
      status: "waiting",
    };
  }

  async completeSuccessfully() {
    const run = this.requireCurrentRun();

    if (run.userActionNeeded) {
      return {
        message: AUTOMATION_BROWSER_WAITING_MESSAGE,
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
  reason = "cloudflare",
} = {}) {
  if (!browserRun || typeof browserRun.waitForUserAction !== "function") {
    return false;
  }
  if (!(await detectBrowserChallengeInSession(session))) {
    return false;
  }
  await browserRun.waitForUserAction({ reason });
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
