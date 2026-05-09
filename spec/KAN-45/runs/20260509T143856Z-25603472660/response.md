Implemented lazy profile bootstrap in the shopping chat flow.

What changed:
- Shopping chats with a profile now ask for the first missing bootstrap field only: country, top size, EU shoe size, then rough per-item budget.
- Pending bootstrap answers produce a one-tap profile confirmation card instead of being saved immediately.
- Confirmed profile cards persist the field through the shopping profile updater.
- Existing known fields are skipped, and dress requests now ask only for dress size once the base profile is already known.

Verification:
- `node --check src/shopping-chat-flow.mjs`
- `node --check test/shopping-chat-flow.test.mjs`
- `node --test test/shopping-chat-flow.test.mjs`
- `node --test test/*.test.mjs`
- `git diff --check`

Risk:
- The chat UI still needs to pass the returned `profileField`/confirmation card payload back on tap; the flow accepts either shape.
