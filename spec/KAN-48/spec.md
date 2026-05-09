# KAN-48: Shopping memories (soft taste accumulation)

Generated from Jira on 2026-05-09T14:45:20.650Z.

## Issue Details

| Field | Value |
|---|---|
| Key | KAN-48 |
| Title | Shopping memories (soft taste accumulation) |
| Type | Task |
| Status | To Do |
| Priority | Medium |
| Assignee | - |
| Reporter | GustavsIljuconoks |
| Labels | dark-factory-generated, dfp-150f37bb1e31 |
| Components | - |
| Created | 2026-05-09T16:12:46.515+0300 |
| Updated | 2026-05-09T16:12:46.684+0300 |

## Description

Integrate soft-taste shopping memories with the existing memory system. Shopping memories are tagged with a 'Shopping' filter. After a staging event, the agent may capture outcome feedback as a shopping memory. Memories influence future search ranking.

### Acceptance Criteria

- Shopping memories are stored with a 'Shopping' tag.
- Memories appear in Settings → Memories with a Shopping filter.
- Memories can be individually scrolled, edited, pinned, or wiped.
- Clear shopping memories wipes only shopping-tagged memories, not other memories.
- Agent uses shopping memories to de-prioritize items that match negative past outcomes.

### Source Reference

- S-Shop-6 — Taste learns from outcomes (without forms)
- What Bestfriend remembers about you

### Dependencies

- Shopping profile schema and persistence

Suggested priority: medium

Estimated complexity: medium

## Comments (0)

_No comments._
