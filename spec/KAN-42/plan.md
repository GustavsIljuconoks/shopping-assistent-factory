# KAN-42 Implementation Plan

## Scope

- Add an active-carts strip boundary for chat UIs that groups staged cart items by retailer.
- Show one sticky row per retailer with retailer name, staged item count, last-staged time, and an Open cart link.
- Provide a default-browser cart opener abstraction so chat links/actions do not reuse the automation browser.
- Hook successful Asket staging into the active-cart state boundary without changing failed staging behavior.
- Cover grouping, clearing, strip publishing, default-browser opening, and Asket success recording with focused tests.

## Progress

- [x] Read repository conventions and KAN-42 ticket snapshot.
- [x] Inspect existing shopping chat, Asket staging, and test patterns.
- [x] Add active-carts strip state/render/publish helpers.
- [x] Hook successful Asket staging into the active-carts helper.
- [x] Add focused tests for strip behavior and staging integration.
- [x] Run syntax checks and relevant tests.
- [x] Write Jira-facing response.

## Notes

- The repository currently exposes adapter-style chat/browser boundaries rather than a concrete frontend shell, so the strip is implemented as a dependency-free model/render/publish module that a chat UI can mount at the top of a chat.
- `openCartInDefaultBrowser` uses an injectable opener for app integrations and a platform default opener for direct runtime use, so checkout opens outside the automation browser.

## Verification

- `node --check src/shopping-active-carts-strip.mjs`
- `node --check src/asket-cart-staging-recipe.mjs`
- `node --check test/shopping-active-carts-strip.test.mjs`
- `node --check test/asket-cart-staging-recipe.test.mjs`
- `node --test test/shopping-active-carts-strip.test.mjs test/asket-cart-staging-recipe.test.mjs`
- `node --test test/*.test.mjs`
