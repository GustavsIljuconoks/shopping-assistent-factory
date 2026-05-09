import test from "node:test";
import assert from "node:assert/strict";

import {
  SHOP_INBOX_TRIAGE_ACTION_ID,
  SHOP_INBOX_TRIAGE_POSITION,
  SHOP_INBOX_TRIAGE_SHORTCUT,
  acceptInboxShopTriage,
  createInboxTriageActions,
  resolveInboxTriageShortcut,
} from "../src/inbox-triage-actions.mjs";

test("adds Shop as the fifth Inbox triage action when shopping intent is detected", () => {
  const actions = createInboxTriageActions({
    captureText: "Need black jeans under 100 euros",
    existingActions: createBaseInboxActions(),
  });

  assert.equal(actions.length, 5);
  assert.deepEqual(actions.slice(0, 4), createBaseInboxActions());

  const shopAction = actions[4];
  assert.equal(shopAction.id, SHOP_INBOX_TRIAGE_ACTION_ID);
  assert.equal(shopAction.label, "Shop");
  assert.equal(shopAction.position, SHOP_INBOX_TRIAGE_POSITION);
  assert.equal(shopAction.shortcut, SHOP_INBOX_TRIAGE_SHORTCUT);
  assert.deepEqual(shopAction.payload, {
    captureText: "Need black jeans under 100 euros",
    shoppingIntent: {
      detected: true,
      garmentClass: "bottoms",
    },
  });
});

test("does not add Shop when shopping intent is not detected", () => {
  const baseActions = createBaseInboxActions();
  const actions = createInboxTriageActions({
    captureText: "Remember to call the plumber tomorrow",
    existingActions: baseActions,
  });

  assert.deepEqual(actions, baseActions);
});

test("keyboard shortcut 4 resolves the Shop triage action", () => {
  const actions = createInboxTriageActions({
    captureText: "Find a linen shirt size M",
    existingActions: createBaseInboxActions(),
  });

  const action = resolveInboxTriageShortcut({ actions, key: "4" });

  assert.equal(action.id, SHOP_INBOX_TRIAGE_ACTION_ID);
  assert.equal(action.label, "Shop");
});

test("accepting Shop opens a new chat pre-seeded with the capture text", async () => {
  const [shopAction] = createInboxTriageActions({
    captureText: "Buy office sneakers EU 42 under 120 euros",
    existingActions: [],
  });
  const openedChats = [];

  const result = await acceptInboxShopTriage({
    action: shopAction,
    async openNewChat(payload) {
      openedChats.push(payload);
      return { id: "chat-1", ...payload };
    },
  });

  assert.deepEqual(openedChats, [
    {
      initialMessage: "Buy office sneakers EU 42 under 120 euros",
      source: "inbox",
      triageAction: SHOP_INBOX_TRIAGE_ACTION_ID,
    },
  ]);
  assert.equal(result.action, "shop_triage_accepted");
  assert.equal(result.initialMessage, "Buy office sneakers EU 42 under 120 euros");
  assert.deepEqual(result.chat, {
    id: "chat-1",
    initialMessage: "Buy office sneakers EU 42 under 120 euros",
    source: "inbox",
    triageAction: SHOP_INBOX_TRIAGE_ACTION_ID,
  });
});

test("accepting Shop can use capture text directly", async () => {
  const openedChats = [];

  const result = await acceptInboxShopTriage({
    captureText: "Shop for a navy coat under 200 euros",
    async openNewChat(payload) {
      openedChats.push(payload);
      return { id: "chat-2" };
    },
  });

  assert.deepEqual(openedChats, [
    {
      initialMessage: "Shop for a navy coat under 200 euros",
      source: "inbox",
      triageAction: SHOP_INBOX_TRIAGE_ACTION_ID,
    },
  ]);
  assert.equal(result.triageAction.id, SHOP_INBOX_TRIAGE_ACTION_ID);
  assert.equal(result.triageAction.shortcut, SHOP_INBOX_TRIAGE_SHORTCUT);
});

function createBaseInboxActions() {
  return [
    { id: "archive", label: "Archive", shortcut: "0" },
    { id: "later", label: "Later", shortcut: "1" },
    { id: "task", label: "Task", shortcut: "2" },
    { id: "note", label: "Note", shortcut: "3" },
  ];
}
