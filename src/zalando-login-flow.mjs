import {
  RETAILER_SESSION_CONNECTED_STATUS,
  readRetailerSessionStatus,
  writeRetailerSessionStatus,
} from "./asket-login-flow.mjs";
import { VisibleAutomationBrowserRun } from "./automation-browser.mjs";
import {
  ensureRetailerBrowserProfile,
  getRetailerBrowserProfileDirectory,
} from "./shopping-browser-profiles.mjs";

export const ZALANDO_RETAILER_IDENTIFIER = "Zalando.lv";
export const ZALANDO_LOGIN_URL = "https://www.zalando.lv/login";

export async function startZalandoLoginFlow({
  browserRun,
  launcher,
  windowManager,
  chat,
  profilesRoot,
  loginUrl = ZALANDO_LOGIN_URL,
  waitForAuthenticated,
  now = new Date(),
} = {}) {
  const profile = await ensureRetailerBrowserProfile(ZALANDO_RETAILER_IDENTIFIER, profilesRoot);
  const run =
    browserRun ??
    new VisibleAutomationBrowserRun({
      launcher,
      windowManager,
      chat,
    });

  await run.startStagingRun({
    retailer: ZALANDO_RETAILER_IDENTIFIER,
    loginUrl,
    startUrl: loginUrl,
    userDataDir: profile.userDataDir,
  });

  const session = run.requireCurrentRun().session;
  await openLoginPage(session, loginUrl);
  const authenticated = await waitForZalandoAuthentication(
    session,
    waitForAuthenticated,
    loginUrl,
  );

  if (!authenticated) {
    throw new Error("Zalando.lv authentication did not complete.");
  }

  const sessionStatus = await writeRetailerSessionStatus(
    {
      retailerIdentifier: ZALANDO_RETAILER_IDENTIFIER,
      status: RETAILER_SESSION_CONNECTED_STATUS,
      connectedAt: now,
    },
    profile.profileDirectory,
  );
  await run.completeSuccessfully();

  return {
    loginUrl,
    profile,
    retailerIdentifier: ZALANDO_RETAILER_IDENTIFIER,
    sessionStatus,
    status: RETAILER_SESSION_CONNECTED_STATUS,
  };
}

export async function readZalandoConnectionStatus(profilesRoot) {
  const profileDirectory = getRetailerBrowserProfileDirectory(
    ZALANDO_RETAILER_IDENTIFIER,
    profilesRoot,
  );
  return readRetailerSessionStatus(profileDirectory);
}

export async function readZalandoConnectedRetailers(profilesRoot) {
  const status = await readZalandoConnectionStatus(profilesRoot);
  if (status?.status !== RETAILER_SESSION_CONNECTED_STATUS) {
    return [];
  }

  return [
    {
      retailerIdentifier: ZALANDO_RETAILER_IDENTIFIER,
      status: "Connected",
    },
  ];
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

async function waitForZalandoAuthentication(session, waitForAuthenticated, loginUrl) {
  if (typeof waitForAuthenticated === "function") {
    return Boolean(
      await waitForAuthenticated({
        loginUrl,
        retailerIdentifier: ZALANDO_RETAILER_IDENTIFIER,
        session,
      }),
    );
  }
  if (session && typeof session.waitForAuthenticated === "function") {
    return Boolean(
      await session.waitForAuthenticated({
        loginUrl,
        retailerIdentifier: ZALANDO_RETAILER_IDENTIFIER,
      }),
    );
  }
  throw new TypeError("waitForAuthenticated must be a function.");
}
