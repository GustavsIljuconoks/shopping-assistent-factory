# KAN-92 Implementation Plan

## Scope

- Default the shopping profile per-item ceiling to EUR 500.
- Replace the proposal Stage button with a type-to-confirm prompt when any candidate exceeds the configured ceiling.
- Allow staging confirmation to proceed only when the user types the literal word `stage` in chat.
- Add focused tests for the default, proposal rendering gate, configurable ceiling, and chat confirmation.

## Steps

- [x] Read ticket artifacts and repository conventions.
- [x] Inspect shopping profile, Settings proposal card, and shopping chat flow code paths.
- [x] Implement the ceiling gate and chat confirmation handling.
- [x] Add focused Node tests.
- [x] Run syntax checks and relevant test files.

## Notes

- `createDefaultShoppingProfile()` now defaults `perItemPriceCeiling` to EUR 500.
- Proposal cards compare normalized candidate prices against the configured Settings -> Shopping ceiling and replace the Stage button with a type-to-confirm prompt when any candidate is above the ceiling.
- `handleShoppingChatMessage()` accepts a pending stage confirmation and calls the staging callback only for the exact chat text `stage`.

## Verification

- `node --check src/settings-shopping-pane.mjs`
- `node --check src/shopping-chat-flow.mjs`
- `node --check src/shopping-profile.mjs`
- `node --check test/settings-shopping-pane.test.mjs`
- `node --check test/shopping-chat-flow.test.mjs`
- `node --test --test-name-pattern "default ceiling|type-to-confirm|configured Shopping per-item ceiling|literal confirmation word|exact type-to-confirm" test/shopping-profile.test.mjs test/settings-shopping-pane.test.mjs test/shopping-chat-flow.test.mjs`
- `node --test test/shopping-profile.test.mjs test/settings-shopping-pane.test.mjs`

## Risks

- The broad command `node --test test/shopping-profile.test.mjs test/settings-shopping-pane.test.mjs test/shopping-chat-flow.test.mjs` still reports two Asket staging failures in existing feed/foreground expectations unrelated to KAN-92. The KAN-92-specific tests pass.
