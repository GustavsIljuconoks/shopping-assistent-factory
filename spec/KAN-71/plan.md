# KAN-71 Implementation Plan

## Scope

- Extend shopping chat search orchestration to fan out one request across enabled retailers.
- Assemble a multi-retailer proposal from non-empty retailer results.
- Keep per-retailer candidate lists capped at 3 and sort cards by overall retailer match score.
- Preserve the existing single-search path when no enabled retailers are configured.

## Progress

- [x] Read repository conventions and Jira ticket snapshot.
- [x] Rebuilt continuation context from ticket artifacts and current repository state.
- [x] Inspected shopping chat, proposal rendering, profile, and retailer search modules.
- [x] Added parallel enabled-retailer search orchestration.
- [x] Added incremental per-retailer proposal card publishing when chat supports it.
- [x] Added multi-retailer proposal assembly that drops empty retailers and sorts by score.
- [x] Added focused test coverage for parallel fan-out, incremental arrivals, empty-retailer dropping, score ordering, and 3-candidate cap.
- [x] Ran syntax checks and full test suite.
- [x] Wrote Jira-facing response.

## Notes

- The repository currently exposes concrete search modules for Asket, Zalando.lv, ASOS, and About You. The orchestration is retailer-name agnostic and uses the enabled retailer list from the shopping profile.
- Existing callers without `profile.enabledRetailers` keep the prior single `searchTool.search(context)` behavior.
- Incremental rendering is exposed through `chat.showProposalCard`; final proposal assembly remains sorted best-retailer-first after all retailer promises settle.

## Verification

- `node --check src/shopping-chat-flow.mjs`
- `node --check test/shopping-chat-flow.test.mjs`
- `node --test test/shopping-chat-flow.test.mjs`
- `node --test`
