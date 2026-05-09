Implemented KAN-94.

What changed:
- Kept proposal assembly capped at 3 candidates per retailer through the shared proposal limit constant.
- Added action-cap state for staging: max 6 staging actions per conversation and max 10 staging actions per retailer in a 24-hour window.
- Wired Asket and ASOS staging to block before retailer automation when a cap would be exceeded and return a plain-text explanation for the user.
- Added focused tests for conversation and retailer cap violations, and preserved existing staging Feed/failure behavior.

Verification:
- `node --check src/shopping-chat-flow.mjs`
- `node --check test/shopping-chat-flow.test.mjs`
- `node --test test/shopping-chat-flow.test.mjs` passed.
- All test files except `test/settings-shopping-pane.test.mjs` passed; that excluded file currently has an unrelated EOF syntax error.

Risks:
- Callers need to carry the returned action-cap state across the conversation and persist it for the 24-hour retailer cap to be durable.
