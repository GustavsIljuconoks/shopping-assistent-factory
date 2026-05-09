# KAN-3: Shopping profile schema and persistence

Generated from Jira on 2026-05-09T13:24:49.612Z.

## Issue Details

| Field | Value |
|---|---|
| Key | KAN-3 |
| Title | Shopping profile schema and persistence |
| Type | Task |
| Status | In Progress |
| Priority | Medium |
| Assignee | GustavsIljuconoks |
| Reporter | GustavsIljuconoks |
| Labels | dark-factory-generated, dfp-a86e6ec77442 |
| Components | - |
| Created | 2026-05-09T16:11:56.824+0300 |
| Updated | 2026-05-09T16:24:36.749+0300 |

## Description

Define and persist the structured shopping profile: country/currency, sizes per garment class, budget anchors, hard exclusions, per-item price ceiling, enabled retailers list.

### Acceptance Criteria

- Profile schema covers all hard-constraint fields from the spec (country, currency, sizes, budget anchors, exclusions, ceiling, retailer list).
- Profile survives app restart.
- Profile fields can be read and written programmatically by the shopping tools.

### Source Reference

- What Bestfriend remembers about you

### Dependencies

None

Suggested priority: high

Estimated complexity: medium

## Comments (1)

### GustavsIljuconoks on 2026-05-09T16:24:36.749+0300

[TDF-bot] Codex processed KAN-3 (conclusion: success).

Branch: [https://github.com/GustavsIljuconoks/shopping-assistent-factory/tree/tdf%2Fkan-3](https://github.com/GustavsIljuconoks/shopping-assistent-factory/tree/tdf%2Fkan-3)

Pull request: [https://github.com/GustavsIljuconoks/shopping-assistent-factory/pull/3](https://github.com/GustavsIljuconoks/shopping-assistent-factory/pull/3)

Implemented shopping profile schema and persistence.

What changed:
- Added a strict JSON Schema for the shopping profile fields: country, currency, garment-class sizes, budget anchors, hard exclusions, per-item ceiling, and enabled retailers.
- Added dependency-free Node helpers to create, read, write, update, normalize, and validate the profile programmatically.
- Added tests proving complete profile shape, persistence across reload, programmatic updates, and invalid value rejection.
- Ignored runtime `data/shopping-profile.json` so local mutable profile state is not accidentally committed.

Verification:
- `node --check src/shopping-profile.mjs`
- `node --check test/shopping-profile.test.mjs`
- `node --test test/shopping-profile.test.mjs`
- JSON parse check for `schemas/shopping-profile.schema.json`

Risk:
- Default profile values are placeholders until shopping tools write the user's real preferences.
