# KAN-71: Multi-retailer parallel search and proposal assembly

Generated from Jira on 2026-05-09T18:07:23.382Z.

## Issue Details

| Field | Value |
|---|---|
| Key | KAN-71 |
| Title | Multi-retailer parallel search and proposal assembly |
| Type | Task |
| Status | In Progress |
| Priority | Medium |
| Assignee | - |
| Reporter | GustavsIljuconoks |
| Labels | dark-factory-generated, dfp-bd84d4aa7f0f |
| Components | - |
| Created | 2026-05-09T16:13:11.533+0300 |
| Updated | 2026-05-09T19:23:27.043+0300 |

## Description

Run search across all enabled retailers in parallel on a single user request. Assemble the results into a multi-retailer proposal (one card per retailer that has candidates). Empty retailers are silently dropped. Cards stack in score order.

### Acceptance Criteria

- All enabled retailers are searched in parallel.
- Results from each retailer arrive as their card; proposal renders incrementally.
- Empty retailers (no candidates) produce no card.
- Cards are ordered best-retailer-first by overall match score.
- Total proposal includes up to 3 candidates per retailer.

### Source Reference

- S-Shop-1 — Describe an item, get candidates staged in cart

### Dependencies

- Zalando.lv: search and cart-staging recipe
- About You: search and cart-staging recipe
- Asos: search and cart-staging recipe
- H&M.lv: search and cart-staging recipe

Suggested priority: medium

Estimated complexity: medium

## Comments (1)

### GustavsIljuconoks on 2026-05-09T19:18:49.841+0300

[TDF-bot] Codex processed KAN-71 (conclusion: unknown).

Branch: [https://github.com/GustavsIljuconoks/shopping-assistent-factory/tree/tdf%2Fkan-71](https://github.com/GustavsIljuconoks/shopping-assistent-factory/tree/tdf%2Fkan-71)

Pull request: [https://github.com/GustavsIljuconoks/shopping-assistent-factory/pull/28](https://github.com/GustavsIljuconoks/shopping-assistent-factory/pull/28)
