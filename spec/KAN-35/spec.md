# KAN-35: Per-retailer proposal card UI

Generated from Jira on 2026-05-09T14:24:23.602Z.

## Issue Details

| Field | Value |
|---|---|
| Key | KAN-35 |
| Title | Per-retailer proposal card UI |
| Type | Task |
| Status | To Do |
| Priority | Medium |
| Assignee | - |
| Reporter | GustavsIljuconoks |
| Labels | dark-factory-generated, dfp-e2c5a8de40ed |
| Components | - |
| Created | 2026-05-09T16:12:32.492+0300 |
| Updated | 2026-05-09T16:12:32.667+0300 |

## Description

Build the proposal card component: one card per retailer, up to 3 candidates, top match pre-selected. Each candidate shows image, brand, title, size, color, price, one-line reasoning, and an Open product link. Card header shows retailer and selected-candidate count. Footer shows ETA and return policy. Stage selected → [Retailer] cart CTA.

### Acceptance Criteria

- Card shows per-retailer grouping.
- Up to 3 candidates per card, top match pre-selected.
- Each candidate row has: image, brand, title, size, color, price, reasoning, Open product link.
- Card header shows retailer name and currently-selected count.
- Footer shows ETA and return policy summary.
- Stage selected CTA is present and disabled until at least one candidate is selected.
- Card transforms into a result card after successful staging: shows staged count and Open cart link.

### Source Reference

- What you see and accept (the proposal card)

### Dependencies

- Asket: product search tool

Suggested priority: high

Estimated complexity: large

## Comments (0)

_No comments._
