# KAN-75: Failure card UI

Generated from Jira on 2026-05-09T18:03:07.280Z.

## Issue Details

| Field | Value |
|---|---|
| Key | KAN-75 |
| Title | Failure card UI |
| Type | Task |
| Status | In Progress |
| Priority | Medium |
| Assignee | - |
| Reporter | GustavsIljuconoks |
| Labels | dark-factory-generated, dfp-ce73bb99982d |
| Components | - |
| Created | 2026-05-09T16:13:15.994+0300 |
| Updated | 2026-05-09T19:23:17.817+0300 |

## Description

When a staging attempt fails, replace the proposal card with a failure card explaining the error in plain English ('Staging blocked by Asos — anti-bot challenge', 'Item out of stock', 'Login expired', 'Site error'). The visible browser foregrounds on the relevant page so the user can finish manually.

### Acceptance Criteria

- Failure card replaces the proposal card on staging failure.
- Failure card shows a plain-English explanation of the error type.
- The visible browser foregrounds on the retailer's page when a staging failure occurs.
- Failure card includes an 'Open in [retailer] to complete manually' link.

### Source Reference

- S-Shop-4 — Graceful retailer failure
- When things go wrong

### Dependencies

- Per-retailer proposal card UI
- Accept → stage flow (Asket)

Suggested priority: medium

Estimated complexity: medium

## Comments (1)

### GustavsIljuconoks on 2026-05-09T19:19:06.560+0300

[TDF-bot] Codex processed KAN-75 (conclusion: unknown).

Branch: [https://github.com/GustavsIljuconoks/shopping-assistent-factory/tree/tdf%2Fkan-75](https://github.com/GustavsIljuconoks/shopping-assistent-factory/tree/tdf%2Fkan-75)

Pull request: [https://github.com/GustavsIljuconoks/shopping-assistent-factory/pull/29](https://github.com/GustavsIljuconoks/shopping-assistent-factory/pull/29)
