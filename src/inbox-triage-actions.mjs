import { detectShoppingIntent } from "./shopping-chat-flow.mjs";

export const SHOP_INBOX_TRIAGE_ACTION_ID = "shop";
export const SHOP_INBOX_TRIAGE_SHORTCUT = "4";
export const SHOP_INBOX_TRIAGE_POSITION = 5;

export function createInboxTriageActions({
  captureText,
  existingActions = [],
  detectIntent = detectShoppingIntent,
} = {}) {
  const actions = normalizeExistingActions(existingActions);
  const text = normalizeCaptureText(captureText);

  if (!text) {
    return actions;
  }
  if (actions.some((action) => action.id === SHOP_INBOX_TRIAGE_ACTION_ID)) {
    return actions;
  }
  if (typeof detectIntent !== "function") {
    throw new TypeError("detectIntent must be a function.");
  }

  const shoppingIntent = detectIntent(text);
  if (!shoppingIntent?.detected) {
    return actions;
  }

  return [
    ...actions,
    createShopInboxTriageAction({
      captureText: text,
      shoppingIntent,
    }),
  ];
}

export function createShopInboxTriageAction({ captureText, shoppingIntent } = {}) {
  const text = normalizeNonEmptyString(captureText, "captureText");

  return {
    id: SHOP_INBOX_TRIAGE_ACTION_ID,
    intent: "shopping",
    label: "Shop",
    position: SHOP_INBOX_TRIAGE_POSITION,
    shortcut: SHOP_INBOX_TRIAGE_SHORTCUT,
    type: "inbox_triage_action",
    payload: {
      captureText: text,
      shoppingIntent: shoppingIntent ?? detectShoppingIntent(text),
    },
  };
}

export function resolveInboxTriageShortcut({ key, actions } = {}) {
  const normalizedKey = String(key ?? "").trim();
  if (!normalizedKey) {
    return undefined;
  }

  return normalizeExistingActions(actions).find((action) => action.shortcut === normalizedKey);
}

export async function acceptInboxShopTriage({
  action,
  captureText,
  openNewChat,
} = {}) {
  const actionPayload =
    action === undefined
      ? createShopInboxTriageAction({ captureText })
      : normalizeShopInboxTriageAction(action);
  const text = normalizeNonEmptyString(
    captureText ?? actionPayload.payload.captureText,
    "captureText",
  );

  if (typeof openNewChat !== "function") {
    throw new TypeError("openNewChat must be a function.");
  }

  const chat = await openNewChat({
    initialMessage: text,
    source: "inbox",
    triageAction: SHOP_INBOX_TRIAGE_ACTION_ID,
  });

  return {
    action: "shop_triage_accepted",
    chat,
    initialMessage: text,
    triageAction: actionPayload,
  };
}

function normalizeShopInboxTriageAction(action) {
  if (!action || typeof action !== "object" || Array.isArray(action)) {
    throw new TypeError("Shop triage action is required.");
  }
  if (action.id !== SHOP_INBOX_TRIAGE_ACTION_ID) {
    throw new TypeError("Expected a Shop triage action.");
  }
  if (!action.payload || typeof action.payload !== "object" || Array.isArray(action.payload)) {
    throw new TypeError("Shop triage action payload is required.");
  }
  return action;
}

function normalizeExistingActions(actions) {
  if (actions === undefined) {
    return [];
  }
  if (!Array.isArray(actions)) {
    throw new TypeError("existingActions/actions must be an array.");
  }
  return actions.map((action) => {
    if (!action || typeof action !== "object" || Array.isArray(action)) {
      throw new TypeError("Inbox triage actions must be objects.");
    }
    return action;
  });
}

function normalizeCaptureText(value) {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value).trim();
}

function normalizeNonEmptyString(value, name) {
  const text = normalizeCaptureText(value);
  if (!text) {
    throw new TypeError(`${name} must be a non-empty string.`);
  }
  return text;
}
