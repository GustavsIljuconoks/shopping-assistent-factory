import {
  RETAILER_SESSION_CONNECTED_STATUS,
  readRetailerSessionStatus,
  writeRetailerSessionStatus,
} from "./asket-login-flow.mjs";
import { VisibleAutomationBrowserRun, notifyIfBrowserChallengeVisible } from "./automation-browser.mjs";
import {
  ensureRetailerBrowserProfile,
  getRetailerBrowserProfileDirectory,
} from "./shopping-browser-profiles.mjs";

export const ASOS_RETAILER_IDENTIFIER = "ASOS";
export const ASOS_LOGIN_URL = "https://www.asos.com/customer/account/login/";

export async function startAsosLoginFlow({
  browserRun,
  launcher,
  windowManager,
  chat,
  profilesRoot,
  loginUrl = ASOS_LOGIN_URL,
  waitForAuthenticated,
  now = new Date(),
} = {}) {
  const profile = await ensureRetailerBrowserProfile(ASOS_RETAILER_IDENTIFIER, profilesRoot);
  const run =
    browserRun ??
    new VisibleAutomationBrowserRun({
      launcher,
      windowManager,
      chat,
    });

  await run.startStagingRun({
    retailer: ASOS_RETAILER_IDENTIFIER,
    loginUrl,
    startUrl: loginUrl,
    userDataDir: profile.userDataDir,
  });

  const session = run.requireCurrentRun().session;
  await openLoginPage(session, loginUrl);
  await notifyIfBrowserChallengeVisible({ browserRun: run, session });

  const authenticated = await waitForAsosAuthentication(session, waitForAuthenticated, loginUrl);

  if (!authenticated) {
    throw new Error("ASOS authentication did not complete.");
  }

  const sessionStatus = await writeRetailerSessionStatus(
    {
      retailerIdentifier: ASOS_RETAILER_IDENTIFIER,
      status: RETAILER_SESSION_CONNECTED_STATUS,
      connectedAt: now,
    },
    profile.profileDirectory,
  );
  await run.completeSuccessfully();

  return {
    loginUrl,
    profile,
    retailerIdentifier: ASOS_RETAILER_IDENTIFIER,
    sessionStatus,
    status: RETAILER_SESSION_CONNECTED_STATUS,
  };
}

export async function readAsosConnectionStatus(profilesRoot) {
  const profileDirectory = getRetailerBrowserProfileDirectory(ASOS_RETAILER_IDENTIFIER, profilesRoot);
  return readRetailerSessionStatus(profileDirectory);
}

export async function readAsosConnectedRetailers(profilesRoot) {
  const status = await readAsosConnectionStatus(profilesRoot);
  if (status?.status !== RETAILER_SESSION_CONNECTED_STATUS) {
    return [];
  }

  return [
    {
      retailerIdentifier: ASOS_RETAILER_IDENTIFIER,
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

async function waitForAsosAuthentication(session, waitForAuthenticated, loginUrl) {
  if (typeof waitForAuthenticated === "function") {
    return Boolean(
      await waitForAuthenticated({
        loginUrl,
        retailerIdentifier: ASOS_RETAILER_IDENTIFIER,
        session,
      }),
    );
  }
  if (session && typeof session.waitForAuthenticated === "function") {
    return Boolean(
      await session.waitForAuthenticated({
        loginUrl,
        retailerIdentifier: ASOS_RETAILER_IDENTIFIER,
      }),
    );
  }
  throw new TypeError("waitForAuthenticated must be a function.");
}
