# KAN-83: Settings → Privacy → Shopping activity audit pane: populated

Generated from Jira on 2026-05-09T17:59:36.285Z.

## Issue Details

| Field | Value |
|---|---|
| Key | KAN-83 |
| Title | Settings → Privacy → Shopping activity audit pane: populated |
| Type | Task |
| Status | In Progress |
| Priority | Medium |
| Assignee | - |
| Reporter | GustavsIljuconoks |
| Labels | dark-factory-generated, dfp-9e40efbc6bfb |
| Components | - |
| Created | 2026-05-09T16:13:25.300+0300 |
| Updated | 2026-05-09T19:22:16.643+0300 |

## Description

Populate the audit pane with real entries from the audit log. Each entry shows: action type, retailer, timestamp, status, and an optional debug screenshot link when something failed.

### Acceptance Criteria

- Audit pane shows all logged shopping actions in reverse-chronological order.
- Each entry shows: action type, retailer, timestamp, status.
- Failed entries include a link to the optional debug screenshot if one was captured.
- Pane updates in real time during a staging run.

### Source Reference

- S-Shop-5 — Visibility into what was done

### Dependencies

- Shopping audit log schema and persistence
- Settings → Privacy → Shopping activity pane (empty shell)

Suggested priority: medium

Estimated complexity: medium

## Comments (1)

### GustavsIljuconoks on 2026-05-09T19:22:16.643+0300

[TDF-bot] Codex processed KAN-83 (conclusion: unknown).

Branch: [https://github.com/GustavsIljuconoks/shopping-assistent-factory/tree/tdf%2Fkan-83](https://github.com/GustavsIljuconoks/shopping-assistent-factory/tree/tdf%2Fkan-83)

Pull request: [https://github.com/GustavsIljuconoks/shopping-assistent-factory/pull/32](https://github.com/GustavsIljuconoks/shopping-assistent-factory/pull/32)
