Implemented the Inbox Shop triage adapter.

What changed:
- Added `src/inbox-triage-actions.mjs` to append `Shop` as the fifth Inbox triage action when `detectShoppingIntent()` identifies shopping intent.
- Bound the Shop action to keyboard shortcut `4`.
- Added `acceptInboxShopTriage()` to open a new chat with the capture text as the seeded initial message, preserving the normal shopping chat flow boundary.
- Added focused tests for intent gating, shortcut resolution, and accepting Shop.

Verification:
- `node --check src/inbox-triage-actions.mjs`
- `node --check test/inbox-triage-actions.test.mjs`
- `node --test test/inbox-triage-actions.test.mjs`

Risk:
- The repo does not currently include a concrete Inbox UI/runtime, so this exposes the adapter contract for that runtime to call.
- Full-suite validation is currently blocked by unrelated existing failures in `test/settings-shopping-pane.test.mjs` and `test/shopping-chat-flow.test.mjs` on this checkout.
