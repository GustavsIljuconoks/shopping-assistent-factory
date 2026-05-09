# Implementation Plan

## Scope
- Add a failure-card state for retailer proposal cards when staging fails.
- Return plain-English failure result cards from Asket/ASOS staging flows.
- Foreground the retailer page/session when staging returns a failure.
- Cover the behavior with focused unit tests.

## Status
- [x] Read ticket, repository conventions, and continuation context.
- [x] Locate proposal card rendering and staging flow code.
- [x] Implement failure card rendering and staging failure helpers.
- [x] Add/update tests.
- [x] Run targeted validation.
- [x] Write Jira-facing response.

## Validation
- `node --test test/shopping-chat-flow.test.mjs`
- `node --test test/settings-shopping-pane.test.mjs`
- `node --test test/automation-browser.test.mjs`
- `node --test test/*.test.mjs`
