import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { createActiveCartsState } from "../src/shopping-active-carts-strip.mjs";
import {
  appendShoppingAuditEntry,
  flushShoppingAuditLog,
  readShoppingAuditLog,
} from "../src/shopping-audit-log.mjs";
import { ensureRetailerBrowserProfile } from "../src/shopping-browser-profiles.mjs";
import {
  createDefaultShoppingProfile,
  readShoppingProfile,
  writeShoppingProfile,
} from "../src/shopping-profile.mjs";
import {
  CONNECTED_RETAILERS_EMPTY_STATE,
  SHOPPING_ACTIVITY_EMPTY_STATE,
  renderSettingsPrivacyPane,
  renderSettingsShoppingPane,
} from "../src/settings-shopping-pane.mjs";
import {
  wipeShoppingConversationContext,
  wipeShoppingData,
} from "../src/shopping-data-wipe.mjs";

test("wipes shopping data while preserving non-shopping memories", async () => {
  const dir = await mkdtemp(join(tmpdir(), "shopping-data-wipe-"));
  const profilePath = join(dir, "shopping-profile.json");
  const auditLogPath = join(dir, "shopping-audit.jsonl");
  const browserProfilesRoot = join(dir, "browser-profiles");
  const activeCarts = createActiveCartsState();
  const conversationContext = new Map([
    ["shoppingConversationContext", { lastMessage: "find shoes" }],
    ["pendingStageConfirmation", { retailer: "Asket" }],
    ["calendarContext", { timezone: "Europe/Riga" }],
  ]);

  try {
    await writeShoppingProfile(
      createDefaultShoppingProfile({
        country: "DE",
        currency: "EUR",
        sizes: { tops: { value: "L" } },
        budgetAnchors: { tops: { amount: 90 } },
        hardExclusions: ["leather"],
        enabledRetailers: ["Asket"],
        memories: [
          {
            id: "shopping-1",
            content: "Avoid scratchy collars.",
            sentiment: "negative",
            tags: ["Shopping"],
            timestamp: "2026-05-09T12:00:00.000Z",
          },
          {
            id: "general-1",
            content: "Do not erase non-shopping notes.",
            sentiment: "neutral",
            tags: ["General"],
            timestamp: "2026-05-09T12:01:00.000Z",
            type: "note",
          },
        ],
      }),
      profilePath,
    );
    appendShoppingAuditEntry(
      {
        actionType: "cart_add",
        retailer: "Asket",
        status: "succeeded",
      },
      auditLogPath,
      { now: new Date("2026-05-09T13:00:00.000Z") },
    );
    await flushShoppingAuditLog();
    const retailerProfile = await ensureRetailerBrowserProfile("Asket", browserProfilesRoot);
    await writeFile(join(retailerProfile.profileDirectory, "Cookies"), "retailer-session\n", "utf8");
    activeCarts.recordStagedItem({ retailer: "Asket" });

    const result = await wipeShoppingData({
      activeCarts,
      auditLogPath,
      browserProfilesRoot,
      conversationContext,
      profilePath,
    });

    const wipedProfile = await readShoppingProfile(profilePath);
    assert.equal(result.profile.country, "LV");
    assert.equal(wipedProfile.country, "LV");
    assert.deepEqual(wipedProfile.sizes, {});
    assert.deepEqual(wipedProfile.budgetAnchors, {});
    assert.deepEqual(wipedProfile.hardExclusions, []);
    assert.deepEqual(wipedProfile.enabledRetailers, []);
    assert.deepEqual(wipedProfile.memories.map((memory) => memory.id), ["general-1"]);
    assert.deepEqual(await readShoppingAuditLog(auditLogPath), []);
    await assert.rejects(stat(browserProfilesRoot), { code: "ENOENT" });
    assert.deepEqual(activeCarts.getRows(), []);
    assert.equal(conversationContext.has("shoppingConversationContext"), false);
    assert.equal(conversationContext.has("pendingStageConfirmation"), false);
    assert.deepEqual(conversationContext.get("calendarContext"), { timezone: "Europe/Riga" });

    const shoppingHtml = renderSettingsShoppingPane({
      connectedRetailers: [],
      profile: wipedProfile,
    });
    const privacyHtml = renderSettingsPrivacyPane({ auditEntries: await readShoppingAuditLog(auditLogPath) });

    assert.match(shoppingHtml, new RegExp(CONNECTED_RETAILERS_EMPTY_STATE));
    assert.doesNotMatch(shoppingHtml, /name="enabledRetailers"[^>]+checked/);
    assert.match(privacyHtml, new RegExp(SHOPPING_ACTIVITY_EMPTY_STATE));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("clears object, Map, Set, and array shopping conversation contexts", () => {
  const objectContext = {
    pendingProfileField: { field: "country" },
    nonShopping: true,
  };
  const setContext = new Set(["pendingProfileField"]);
  const arrayContext = ["pendingProfileField"];
  let customCleared = false;

  wipeShoppingConversationContext(objectContext);
  wipeShoppingConversationContext(setContext);
  wipeShoppingConversationContext(arrayContext);
  wipeShoppingConversationContext({
    clearShoppingConversationContext() {
      customCleared = true;
    },
  });

  assert.deepEqual(objectContext, { nonShopping: true });
  assert.equal(setContext.size, 0);
  assert.deepEqual(arrayContext, []);
  assert.equal(customCleared, true);
});
