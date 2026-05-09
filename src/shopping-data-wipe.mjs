import { rm } from "node:fs/promises";
import { resolve } from "node:path";

import { clearStagedCartItems } from "./shopping-active-carts-strip.mjs";
import { DEFAULT_BROWSER_PROFILES_ROOT } from "./shopping-browser-profiles.mjs";
import {
  DEFAULT_SHOPPING_AUDIT_LOG_PATH,
  flushShoppingAuditLog,
} from "./shopping-audit-log.mjs";
import {
  DEFAULT_SHOPPING_PROFILE_PATH,
  createDefaultShoppingProfile,
  isShoppingMemory,
  readShoppingProfile,
  writeShoppingProfile,
} from "./shopping-profile.mjs";

export const DEFAULT_SHOPPING_CONVERSATION_CONTEXT_KEYS = Object.freeze([
  "shopping",
  "shoppingConversation",
  "shoppingConversationContext",
  "pendingProfileField",
  "confirmedProfileField",
  "pendingStageConfirmation",
  "shoppingIntent",
  "shoppingSearchContext",
  "shoppingProposalCards",
]);

export async function wipeShoppingData({
  activeCarts,
  auditLogPath = DEFAULT_SHOPPING_AUDIT_LOG_PATH,
  browserProfilesRoot = DEFAULT_BROWSER_PROFILES_ROOT,
  conversationContext,
  conversationContextKeys = DEFAULT_SHOPPING_CONVERSATION_CONTEXT_KEYS,
  profilePath = DEFAULT_SHOPPING_PROFILE_PATH,
} = {}) {
  const profile = await wipeShoppingProfileData(profilePath);
  await wipeShoppingAuditActivity(auditLogPath);
  await wipeRetailerBrowserProfiles(browserProfilesRoot);
  wipeStagedCartState(activeCarts);
  wipeShoppingConversationContext(conversationContext, conversationContextKeys);

  return {
    auditEntries: [],
    profile,
    stagedCartRows: [],
  };
}

export async function wipeShoppingProfileData(filePath = DEFAULT_SHOPPING_PROFILE_PATH) {
  const current = await readShoppingProfile(filePath);
  const next = createDefaultShoppingProfile({
    memories: current.memories.filter((memory) => !isShoppingMemory(memory)),
  });

  return writeShoppingProfile(next, filePath);
}

export async function wipeShoppingAuditActivity(filePath = DEFAULT_SHOPPING_AUDIT_LOG_PATH) {
  await flushShoppingAuditLog();
  await rm(resolve(filePath), { force: true });
}

export async function wipeRetailerBrowserProfiles(
  profilesRoot = DEFAULT_BROWSER_PROFILES_ROOT,
) {
  await rm(resolve(profilesRoot), { recursive: true, force: true });
}

export function wipeStagedCartState(activeCarts) {
  if (activeCarts === undefined || activeCarts === null) {
    return;
  }

  if (activeCarts instanceof Map) {
    clearStagedCartItems(activeCarts);
    return;
  }

  if (typeof activeCarts.clearAll === "function") {
    activeCarts.clearAll();
    return;
  }

  throw new TypeError("activeCarts must be a Map or active cart state.");
}

export function wipeShoppingConversationContext(
  conversationContext,
  keys = DEFAULT_SHOPPING_CONVERSATION_CONTEXT_KEYS,
) {
  if (conversationContext === undefined || conversationContext === null) {
    return;
  }

  if (typeof conversationContext.clearShoppingConversationContext === "function") {
    conversationContext.clearShoppingConversationContext();
    return;
  }

  if (conversationContext instanceof Map) {
    for (const key of normalizeContextKeys(keys)) {
      conversationContext.delete(key);
    }
    return;
  }

  if (conversationContext instanceof Set || Array.isArray(conversationContext)) {
    conversationContext.clear?.();
    if (Array.isArray(conversationContext)) {
      conversationContext.length = 0;
    }
    return;
  }

  if (typeof conversationContext === "object") {
    for (const key of normalizeContextKeys(keys)) {
      delete conversationContext[key];
    }
    return;
  }

  throw new TypeError("conversationContext must be an object, Map, Set, or array.");
}

function normalizeContextKeys(keys) {
  if (!Array.isArray(keys)) {
    throw new TypeError("conversationContextKeys must be an array.");
  }
  return keys.map((key) => {
    if (typeof key !== "string" || !key.trim()) {
      throw new TypeError("conversationContextKeys entries must be non-empty strings.");
    }
    return key.trim();
  });
}
