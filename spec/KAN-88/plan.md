# KAN-88 Implementation Plan

## Scope

- Add an Inbox triage adapter for shopping captures.
- Show `Shop` as the fifth triage action only when shopping intent is detected.
- Bind keyboard shortcut `4` to the Shop triage action.
- Accepting Shop opens a new chat pre-seeded with the capture text so the normal shopping chat flow can continue.

## Progress

- [x] Read repository conventions and KAN-88 ticket snapshot.
- [x] Confirm there is no concrete Inbox UI/runtime module in this repo.
- [x] Implement the Shop triage action boundary.
- [x] Add focused tests for intent gating, shortcut handling, and accept behavior.
- [x] Run syntax checks and relevant tests.
- [x] Write Jira-facing response.

## Notes

- The repository currently exposes shopping behavior through adapter/helper contracts rather than a full app UI. This ticket will add the Inbox-facing contract that the eventual Inbox runtime can call.
- Added `src/inbox-triage-actions.mjs` as the Inbox-facing adapter because no concrete Inbox UI/runtime module exists yet.
- `node --test test/*.test.mjs` is currently blocked by unrelated pre-existing failures in `test/settings-shopping-pane.test.mjs` and `test/shopping-chat-flow.test.mjs` on this checkout; the KAN-88 focused checks pass.

## Verification

- `node --check src/inbox-triage-actions.mjs`
- `node --check test/inbox-triage-actions.test.mjs`
- `node --test test/inbox-triage-actions.test.mjs`
