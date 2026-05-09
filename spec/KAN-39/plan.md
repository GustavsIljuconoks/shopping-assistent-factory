# KAN-39 Implementation Plan

## Scope

- Add an explicit Asket accept/stage orchestration boundary for the proposal-card button handler.
- Keep search/proposal generation separate from cart staging so the cart is untouched until the caller invokes the stage action.
- Stage selected candidates sequentially through the existing Asket cart-staging recipe.
- Refresh the Active carts strip after each successful staging result.
- Return a result card payload with staged count and an Open cart on Asket link.

## Progress

- [x] Read repository conventions and KAN-39 ticket snapshot.
- [x] Inspect existing chat flow, Asket search, and Asket cart-staging modules.
- [x] Implement `stageSelectedAsketCandidates()` and the Asket staging result-card payload.
- [x] Add focused tests for sequential staging, successful-stage cart refreshes, and zero-selection no-op behavior.
- [x] Run syntax checks and tests.
- [x] Write Jira-facing response.
- [x] Continuation run: confirmed the implementation is present on `main` after PR #15 merge and reran focused/full verification.

## Notes

- The repository still uses injectable boundaries rather than a concrete chat/frontend runtime. This change adds the accept/stage handler boundary that the real `Stage selected -> Asket cart` UI can call.
- `handleShoppingChatMessage()` still only searches and renders proposals; it does not call the staging recipe.

## Verification

- `node --check src/shopping-chat-flow.mjs`
- `node --check test/shopping-chat-flow.test.mjs`
- `node --test test/shopping-chat-flow.test.mjs`
- `node --test test/*.test.mjs`

Continuation verification on 2026-05-09:

- `node --check src/shopping-chat-flow.mjs`
- `node --check test/shopping-chat-flow.test.mjs`
- `node --test test/shopping-chat-flow.test.mjs`
- `node --test test/*.test.mjs`
