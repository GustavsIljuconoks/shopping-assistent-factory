# KAN-29: Asket: product search tool

Generated from Jira on 2026-05-09T14:14:26.580Z.

## Issue Details

| Field | Value |
|---|---|
| Key | KAN-29 |
| Title | Asket: product search tool |
| Type | Task |
| Status | To Do |
| Priority | Medium |
| Assignee | - |
| Reporter | GustavsIljuconoks |
| Labels | dark-factory-generated, dfp-2c01a01b4717 |
| Components | - |
| Created | 2026-05-09T16:12:25.786+0300 |
| Updated | 2026-05-09T16:12:25.863+0300 |

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

## Comments (0)

_No comments._
