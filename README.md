# The Dark Factory

A self-driving Jira → GitHub Actions → Claude Code loop. A Jira ticket
becomes either a reviewable pull request or a Jira-facing answer,
without anyone touching a terminal.

## How it works

1. Jira automation fires a `repository_dispatch` of type
   `jira_manual_button` carrying the issue key (a manual
   `workflow_dispatch` is also accepted).
2. [`.github/workflows/jira-dispatch.yml`](.github/workflows/jira-dispatch.yml)
   runs [`.github/scripts/jira-dispatch.mjs`](.github/scripts/jira-dispatch.mjs):
   fetches the ticket from Jira, prepares `spec/<TICKET-ID>/`, restores
   any cached Claude session, runs `anthropics/claude-code-base-action@main`
   on Opus, then commits, opens (or updates) the PR, and comments back
   on Jira.
3. Routing is by Jira label / type:
   - label `claude:answer` (or issue type `Question`) → answer mode.
     Claude writes only inside `spec/<TICKET-ID>/`; `response.md` is
     posted as a Jira comment.
   - label `claude:pr` (or default) → PR mode. Claude makes the
     repository changes on `tdf/<ticket-id>` and the workflow opens a
     PR.
4. When the PR merges,
   [`.github/workflows/jira-pr-merged.yml`](.github/workflows/jira-pr-merged.yml)
   transitions the Jira ticket to Done and deletes the head branch.

Session continuity across runs comes from `actions/cache`-ing
`~/.claude/projects/` (key prefix `tdf-claude-<KEY>-`) plus replaying
`spec/<TICKET-ID>/state.json` and `transcript.md` so progress survives
cache eviction.

## Per-ticket artefacts

```
spec/<TICKET-ID>/
  spec.md         ticket snapshot (refreshed each run)
  plan.md         implementation plan (Claude owns this)
  response.md     Jira-facing summary or answer
  state.json      last_session_id, run_count, kind, conclusion
  transcript.md   one section per run
  runs/<ts>-<id>/ per-run prompt + execution copies
```

## Repo layout

| Path | Purpose |
|---|---|
| [`.github/workflows/`](.github/workflows) | The three live workflows (dispatch, PR-merged finalize, POC session). |
| [`.github/scripts/jira-dispatch.mjs`](.github/scripts/jira-dispatch.mjs) | Jira ↔ GitHub glue: ticket fetch, state, PR open/update, Jira comment, status transitions. |
| [`CLAUDE.md`](CLAUDE.md) | Operating contract for Claude when invoked by the dispatch flow. |
| [`docs/workflows.md`](docs/workflows.md) | High-level overview of the workflows with diagrams. |
| [`github_actions_claude_spec.md`](github_actions_claude_spec.md) | Authoritative spec for running Claude Code from GitHub Actions with cross-run session continuity. Includes validated POC and gotchas. |
| [`spec/<TICKET-ID>/`](spec) | Per-ticket artefacts (see above). |
| [`temp/`](temp) | POC artefacts (`temp/poc/`) and historical research (`temp/progress_plan.md`). Kept as history; not part of production. |
| [`two-pizzas.html`](two-pizzas.html) | Self-contained HTML deliverable from TDS-9. Open directly in a browser. |

## Required GitHub secrets

| Secret | Used for |
|---|---|
| `CLAUDE_CODE_OAUTH_TOKEN` | Auth for `anthropics/claude-code-base-action`. |
| `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN` | Jira REST API for ticket fetch, comment, status transitions. |
| `GH_PR_TOKEN` | PAT with `contents: write` + `pull-requests: write` so the workflow can push to `tdf/*` branches and open PRs against branch-protected `main`. |

## Triggering manually

From a GitHub-side workflow run:

```
gh workflow run jira-dispatch.yml -f issue_key=TDS-14
```

Or replicate the Jira automation:

```
gh api repos/NurMind-com/The_Dark_Factory/dispatches \
  -f event_type=jira_manual_button \
  -f 'client_payload[issue_key]=TDS-14'
```

## See also

- [`CLAUDE.md`](CLAUDE.md) — what the agent does on each run.
- [`docs/workflows.md`](docs/workflows.md) — system view + diagrams.
- [`github_actions_claude_spec.md`](github_actions_claude_spec.md) —
  end-to-end spec, cache strategy, gotchas, validated POC.
