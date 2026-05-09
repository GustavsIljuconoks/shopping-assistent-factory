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

export const HM_RETAILER_IDENTIFIER = "H&M.lv";
export const HM_LOGIN_URL = "https://www2.hm.com/lv_lv/login";

export async function startHmLoginFlow({
  browserRun,
  launcher,
  windowManager,
  chat,
  profilesRoot,
  loginUrl = HM_LOGIN_URL,
  waitForAuthenticated,
  now = new Date(),
} = {}) {
  const profile = await ensureRetailerBrowserProfile(HM_RETAILER_IDENTIFIER, profilesRoot);
  const run =
    browserRun ??
    new VisibleAutomationBrowserRun({
      launcher,
      windowManager,
      chat,
    });

  await run.startStagingRun({
    retailer: HM_RETAILER_IDENTIFIER,
    loginUrl,
    startUrl: loginUrl,
    userDataDir: profile.userDataDir,
  });

  const session = run.requireCurrentRun().session;
  await openLoginPage(session, loginUrl);
  const authenticated = await waitForHmAuthentication(
    session,
    waitForAuthenticated,
    loginUrl,
  );

  if (!authenticated) {
    throw new Error("H&M.lv authentication did not complete.");
  }

  const sessionStatus = await writeRetailerSessionStatus(
    {
      retailerIdentifier: HM_RETAILER_IDENTIFIER,
      status: RETAILER_SESSION_CONNECTED_STATUS,
      connectedAt: now,
    },
    profile.profileDirectory,
  );
  await run.completeSuccessfully();

  return {
    loginUrl,
    profile,
    retailerIdentifier: HM_RETAILER_IDENTIFIER,
    sessionStatus,
    status: RETAILER_SESSION_CONNECTED_STATUS,
  };
}

export async function readHmConnectionStatus(profilesRoot) {
  const profileDirectory = getRetailerBrowserProfileDirectory(
    HM_RETAILER_IDENTIFIER,
    profilesRoot,
  );
  return readRetailerSessionStatus(profileDirectory);
}

export async function readHmConnectedRetailers(profilesRoot) {
  const status = await readHmConnectionStatus(profilesRoot);
  if (status?.status !== RETAILER_SESSION_CONNECTED_STATUS) {
    return [];
  }

  return [
    {
      retailerIdentifier: HM_RETAILER_IDENTIFIER,
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

async function waitForHmAuthentication(session, waitForAuthenticated, loginUrl) {
  if (typeof waitForAuthenticated === "function") {
    return Boolean(
      await waitForAuthenticated({
        loginUrl,
        retailerIdentifier: HM_RETAILER_IDENTIFIER,
        session,
      }),
    );
  }
  if (session && typeof session.waitForAuthenticated === "function") {
    return Boolean(
      await session.waitForAuthenticated({
        loginUrl,
        retailerIdentifier: HM_RETAILER_IDENTIFIER,
      }),
    );
  }
  throw new TypeError("waitForAuthenticated must be a function.");
}
