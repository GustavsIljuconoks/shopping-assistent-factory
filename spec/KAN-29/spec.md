# KAN-29: Asket: product search tool

Generated from Jira on 2026-05-09T14:31:58.744Z.

## Issue Details

| Field | Value |
|---|---|
| Key | KAN-29 |
| Title | Asket: product search tool |
| Type | Task |
| Status | Done |
| Priority | Medium |
| Assignee | - |
| Reporter | GustavsIljuconoks |
| Labels | dark-factory-generated, dfp-2c01a01b4717 |
| Components | - |
| Created | 2026-05-09T16:12:25.786+0300 |
| Updated | 2026-05-09T17:26:07.372+0300 |

## Description

Implement the tool that searches Asket for products matching a structured intent (garment class, color, size, price ceiling). Returns up to 3 scored candidates with product URL, image, brand, title, size, color, price, and a one-line reasoning.

### Acceptance Criteria

- Tool accepts structured intent (garment class, size, color keywords, price ceiling).
- Returns up to 3 ranked candidates.
- Each candidate includes: product URL, image URL, brand, title, size, color, price, one-line reasoning.
- Filters out candidates above the price ceiling.
- Returns empty list gracefully when no matches.

### Source Reference

- S-Shop-1 — Describe an item, get candidates staged in cart
- What you see and accept (the proposal card)

### Dependencies

- Asket: login flow and session management

Suggested priority: high

Estimated complexity: large

## Comments (1)

### GustavsIljuconoks on 2026-05-09T17:18:50.360+0300

[TDF-bot] Codex processed KAN-29 (conclusion: success).

Branch: [https://github.com/GustavsIljuconoks/shopping-assistent-factory/tree/tdf%2Fkan-29](https://github.com/GustavsIljuconoks/shopping-assistent-factory/tree/tdf%2Fkan-29)

Pull request: [https://github.com/GustavsIljuconoks/shopping-assistent-factory/pull/11](https://github.com/GustavsIljuconoks/shopping-assistent-factory/pull/11)

Implemented the Asket product search tool boundary.

What changed:
- Added `searchAsketProducts`, which accepts structured intent, builds an Asket search URL, uses the existing persistent Asket browser profile when a launcher is provided, and delegates page extraction to an injectable search adapter.
- Normalizes, filters, scores, and returns up to 3 candidates with product URL, image URL, brand, title, size, color, price, and one-line reasoning.
- Filters out candidates above the price ceiling, mismatched currency, mismatched size/color/garment class, and returns an empty list when nothing matches.
- Added focused tests for ranking, filtering, empty results, adapter payloads, and browser/profile integration.

Verification:
- `node --check src/asket-product-search.mjs`
- `node --check test/asket-product-search.test.mjs`
- `node --test test/asket-product-search.test.mjs`
- `node --test test/*.test.mjs`

Risk:
- The repo still uses adapter-style browser boundaries, so production needs a concrete Asket page extraction adapter to pass raw products into this tool.
