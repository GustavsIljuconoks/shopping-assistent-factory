Implemented the per-retailer proposal card UI.

What changed:
- Added proposal-card rendering to the Settings Shopping pane, grouped by retailer.
- Each card normalizes to at most 3 candidate rows and pre-selects the top candidate when no selection is provided.
- Candidate rows now render image, brand, title, size, color, price, reasoning, and an Open product link.
- Card headers show retailer name and selected count; footers show ETA, return policy, and a staging CTA that is disabled when nothing is selected.
- Successful staging renders a result card state with staged count and an Open cart link.
- Added responsive static styles for the new proposal-card classes.
- Added unit tests for grouping, candidate limiting, default selection, disabled CTA, and staged-result rendering.

Validation:
- `node --test` passed.
- `git diff --check` passed.

Risks:
- This is a renderer/UI state implementation only; wiring live product-search and cart-staging actions to the CTA remains dependent on the later Asket search/staging integration.
