# KAN-29 Implementation Plan

## Scope

- Add an Asket product search tool boundary that accepts structured intent: garment class, size, color keywords, and price ceiling.
- Reuse the existing Asket retailer identity and persistent browser profile conventions from the login/session module.
- Normalize and score product candidates from an injectable search/session adapter, returning up to 3 ranked matches with the proposal-card fields.
- Filter out products above the provided price ceiling and return an empty list when nothing matches.
- Cover normalization, filtering, ranking, and graceful empty results with focused tests.

## Progress

- [x] Read repository conventions and KAN-29 ticket snapshot.
- [x] Inspect existing Asket login/session and test patterns.
- [x] Add Asket product search module.
- [x] Add focused product search tests.
- [x] Run syntax checks and relevant tests.
- [x] Write Jira-facing response.

## Notes

- The repository currently exposes adapter-style browser boundaries rather than a concrete browser automation implementation, so the product search tool accepts injectable adapter methods for searching/extracting Asket products.
- Candidate prices are compared only when their currency matches the intent's price-ceiling currency; no currency conversion is attempted.

## Verification

- `node --check src/asket-product-search.mjs`
- `node --check test/asket-product-search.test.mjs`
- `node --test test/asket-product-search.test.mjs`
- `node --test test/*.test.mjs`
