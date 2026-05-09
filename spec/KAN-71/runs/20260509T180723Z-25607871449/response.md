Implemented multi-retailer proposal assembly for shopping chat.

- Enabled retailer searches now fan out in parallel from a single request when `profile.enabledRetailers` is present.
- Retailers with no candidates are dropped from the proposal.
- Per-retailer candidate lists are capped at 3.
- Final cards are sorted best-retailer-first by overall match score, with confidence and original order as tie-breakers.
- Retailer cards can be published incrementally as each retailer result arrives when the chat surface provides `showProposalCard`.
- Existing single-search behavior is preserved for profiles without enabled retailers.

Verification:
- `node --test` passed.

Risk:
- Incremental rendering depends on the chat integration implementing `showProposalCard`; without it, callers still receive the assembled final multi-retailer proposal.
