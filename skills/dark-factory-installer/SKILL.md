---
name: dark-factory-installer
description: Bootstrap a Dark Factory orchestrator end-to-end — Jira manual button → GitHub Actions → Claude Code → optional local Supabase deploy via self-hosted Mac runner + ngrok. The skill is a runbook the AI agent (Cursor or Claude Code) executes inline using its own tools (Shell, Write, AskQuestion, browser/Playwright MCP). No driver scripts, no duplicated templates — the skill fetches files from the source repo at install time. Fits non-technical users.
user_invocable: true
---

# Dark Factory Installer

End-to-end bootstrap of a Dark Factory orchestrator on macOS, executed by you (the AI agent) inside Cursor or Claude Code. The user does not run shell directly. They answer questions, confirm a one-time Chrome restart, and watch you work.

The single source of truth for the *system being built* is `architecture.md` in the source repo. This SKILL is the source of truth for the *install procedure*.

## Install this skill on a new machine

The skill is just one Markdown file. To install it locally so Cursor / Claude Code can invoke it:

```bash
mkdir -p ~/.claude/skills/dark-factory-installer
curl -fsSL https://raw.githubusercontent.com/NurMind-com/The_Dark_Factory/main/skills/dark-factory-installer/SKILL.md \
  > ~/.claude/skills/dark-factory-installer/SKILL.md
```

Then in Cursor (or Claude Code) say: `install dark factory`.

## Source repo

The skill copies live files from a **source repo** into the new orchestrator repo it creates for you. Default:

```
SOURCE_REPO = NurMind-com/The_Dark_Factory
SOURCE_REF  = main
```

If you have forked The Dark Factory and want to install from your fork, ask the user for `SOURCE_REPO` in step 1 and override the default. All file fetches go through `https://raw.githubusercontent.com/<SOURCE_REPO>/<SOURCE_REF>/<path>`.

## When to invoke

Trigger phrases: "install dark factory", "bootstrap dark factory", "set up jira to github claude pipeline", "/dark-factory-install".

If `~/.claude/skills/dark-factory-installer/.state.json` already shows a completed install for the same `GITHUB_OWNER/GITHUB_REPO`, ask the user whether to **resume** (skip done steps), **reconfigure** (re-prompt but keep validated values), or **reset** (wipe state and start over).

## Execution principles for the agent

1. **No silent secret echo.** Never write a token value to chat. When you must surface one (the Jira automation Authorization header), put it in the user's clipboard via `pbcopy` and tell them where to paste, or instruct the user to paste directly into the relevant input. The only on-disk location for tokens is `~/.credentials/credentials` at `0600`.
2. **Use AskQuestion** in Cursor for choice-style questions (multiple options). Use plain prompts for free-text input the user must paste. In Claude Code, use the equivalent input pattern available in that runtime.
3. **Front-load all credential prompts in step 1.** Never interrupt later steps to ask for a token.
4. **Idempotent.** Each step starts with a precondition check ("is this already done?"). If yes, skip and log it. Re-runs converge.
5. **One failure surface at a time.** When something fails, stop, name the step, name the fix, write the failure to `.state.json` under `last_error`, and exit. Do not keep going.
6. **Show every command before running it** (printed in chat). After it runs, show one-line summary of result.
7. **Keep cumulative cost** running in `.state.json` under `total_claude_cost_usd`. Print it in the handoff.

## State file

Maintain at `~/.claude/skills/dark-factory-installer/.state.json`. Read at the start, write after every successful step.

```json
{
  "source_repo": "NurMind-com/The_Dark_Factory",
  "source_ref": "main",
  "owner": "<github owner>",
  "repo": "<github repo>",
  "delivery_default": { "client": "<slug>", "delivery": "<slug>" },
  "ngrok_enabled": true,
  "done": {
    "step-1-tokens": "2026-05-09T08:00:00Z",
    "step-2-deps": "...",
    "...": "..."
  },
  "smoke": [{"label":"BOOT-1","jira_key":"...","run_id":"...","conclusion":"success"}],
  "total_claude_cost_usd": 0.06,
  "last_error": null
}
```

If `.state.json` is missing, create it with `{}`. After each step succeeds, set `done.<step-id>` to the current ISO 8601 UTC timestamp.

---

## The procedure (10 steps)

The agent executes these inline. No external scripts. All template files are fetched from the source repo at install time.

### Step 1 — Preflight + collect tokens

**Precondition.** Skip if `.state.json.done["step-1-tokens"]` is set and the user did not request a reconfigure.

**Actions.**

1. Verify macOS: `uname -s` returns `Darwin`. If not, tell the user this skill is macOS-only and stop.
2. Ensure `~/.credentials/` exists at `0700` and `~/.credentials/credentials` exists at `0600`.
3. Check network: `curl -fsSL --max-time 5 -o /dev/null https://api.github.com`. If it fails, ask the user to check internet and stop.
4. Read existing `~/.credentials/credentials` so you can offer current values as defaults.
5. **Ask in turn.** Front-load every credential here. Use AskQuestion for choices, plain prompts for free-text paste:

| Friendly prompt | Suffix-stripped key | Validation |
|---|---|---|
| Source repo for templates (default `NurMind-com/The_Dark_Factory`) | `SOURCE_REPO` | matches `^[A-Za-z0-9._-]+/[A-Za-z0-9._-]+$` |
| Source ref (default `main`) | `SOURCE_REF` | non-empty |
| Atlassian site URL (e.g. `https://acme.atlassian.net`) | `JIRA_BASE_URL` | starts with `https://`, ends with `.atlassian.net` |
| Atlassian account email | `JIRA_EMAIL` | contains `@` |
| Atlassian API token (`https://id.atlassian.com/manage-profile/security/api-tokens`) | `JIRA_API_TOKEN` | non-empty |
| Jira project key for tickets (e.g. `TDF`) | `JIRA_PROJECT_KEY` | uppercase letters/digits |
| GitHub owner (your username or org) | `GITHUB_OWNER` | matches `^[A-Za-z0-9-]+$` |
| Orchestrator repo name (default `the-dark-factory`) | `GITHUB_REPO` | matches `^[A-Za-z0-9._-]+$` |
| GitHub classic PAT with `repo` + `workflow` scopes | `GITHUB_PAT` | starts with `ghp_` or `github_pat_` |
| Claude Code OAuth token (run `claude setup-token`) | `CLAUDE_CODE_OAUTH_TOKEN` | non-empty |
| ngrok auth token (leave blank to skip deploy) | `NGROK_AUTHTOKEN` | optional |

Save each as `<KEY>_DARK_FACTORY=<value>` in `~/.credentials/credentials`. Re-`chmod 600`.

6. **Validate live.**
   - Jira: `GET <JIRA_BASE_URL>/rest/api/3/myself` with HTTP Basic. Expect 200. On 401, instruct the user to recheck email/token and stop.
   - GitHub: `GET https://api.github.com/user` with `Authorization: Bearer <PAT>`. Expect 200. Read `X-OAuth-Scopes` — must include `repo` and `workflow`. Warn if missing.
   - Claude OAuth: format-check only.
   - ngrok (if provided): `ngrok config check` after step 2.

**Postcondition.** Update `.state.json` with `source_repo`, `source_ref`, `owner`, `repo`, `ngrok_enabled` (boolean), and mark `done["step-1-tokens"]`.

### Step 2 — Install dependencies

**Precondition.** Skip if `.state.json.done["step-2-deps"]` is set.

**Actions.** For each tool, check `command -v <tool>`. Install via Homebrew if missing. Print the command before running.

| Tool | Brew formula | Used by |
|---|---|---|
| Homebrew | `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"` | bootstrap |
| `git` | `git` | all |
| `gh` | `gh` | repo + secrets |
| `node` | `node` | helper script |
| `jq` | `jq` | JSON |
| `python3` | preinstalled on macOS | aux calls |
| `supabase` | `supabase/tap/supabase` | step 7 if ngrok |
| `ngrok` | `ngrok/ngrok/ngrok` | step 7 if ngrok |
| `colima` + `docker` | `colima docker` (only if neither Docker Desktop nor colima installed) | Supabase backend |

After installs:

- `gh auth status`. If not logged in: `printf '%s' "<GITHUB_PAT>" | gh auth login --with-token`.
- If `NGROK_AUTHTOKEN` provided: `ngrok config add-authtoken "<token>"`.
- Start Colima if installed and not running: `colima status >/dev/null 2>&1 || colima start`.

**Postcondition.** Mark `done["step-2-deps"]`.

### Step 3 — Create the orchestrator GitHub repo and seed it from the source repo

**Precondition.** Skip if `.state.json.done["step-3-repo"]` is set AND `gh repo view <OWNER>/<REPO>` returns 0.

**Actions.**

1. `gh repo view <OWNER>/<REPO>` — if missing, `gh repo create <OWNER>/<REPO> --private --confirm`.
2. `mkdir -p ~/code && gh repo clone <OWNER>/<REPO> ~/code/<REPO>`.
3. Set local git identity if globals are unset.
4. **Fetch each template file from the source repo** and write it into the clone, preserving paths. Use the GitHub raw URL pattern:

   ```
   https://raw.githubusercontent.com/<SOURCE_REPO>/<SOURCE_REF>/<path>
   ```

   Files to fetch (skip any that already exist in the orchestrator clone — never overwrite the user's local edits):

   ```
   .github/workflows/jira-dispatch.yml
   .github/workflows/jira-pr-merged.yml
   .github/scripts/jira-dispatch.mjs
   .gitignore
   CLAUDE.md
   README.md
   architecture.md
   github_actions_claude_spec.md
   docs/workflows.md
   skills/dark-factory-installer/SKILL.md
   ```

   For each: `mkdir -p $(dirname target)` then `curl -fsSL <raw-url> -o <target>`. If a file 404s in the source repo (e.g. it's still on a PR branch), generate it from `architecture.md` §5 instead.

5. **Generate `.github/workflows/deploy-on-merge.yml` from the spec.** This file may not exist on `<SOURCE_REPO>@<SOURCE_REF>` yet. If `curl` 404s, fall back to writing the body verbatim from `architecture.md` §5 ("Workflow files (full bodies)").

6. If the orchestrator repo had no commits, commit + push:
   ```bash
   git -C ~/code/<REPO> add -A
   git -C ~/code/<REPO> commit -m "Bootstrap orchestrator from <SOURCE_REPO>@<SOURCE_REF>"
   git -C ~/code/<REPO> branch -M main
   git -C ~/code/<REPO> push -u origin main
   ```
7. If the repo had commits, only stage and commit the files that were missing locally before this step. Commit message: `Add missing dark-factory-installer files`.

**Postcondition.** Mark `done["step-3-repo"]`. Save `repo_local_dir` in `.state.json`.

### Step 4 — Set repo secrets

**Precondition.** Skip if `.state.json.done["step-4-secrets"]` is set. (Secrets can be re-set safely; "skip" just means don't waste time.)

**Actions.** For each pair, set the GitHub secret if the source value exists:

| Source key (in `~/.credentials/credentials`, with `_DARK_FACTORY` suffix) | GitHub secret name |
|---|---|
| `JIRA_BASE_URL` | `JIRA_BASE_URL` |
| `JIRA_EMAIL` | `JIRA_EMAIL` |
| `JIRA_API_TOKEN` | `JIRA_API_TOKEN` |
| `CLAUDE_CODE_OAUTH_TOKEN` | `CLAUDE_CODE_OAUTH_TOKEN` |
| `GITHUB_PAT` | `GH_PR_TOKEN` |
| `NGROK_AUTHTOKEN` | `NGROK_AUTHTOKEN` (only if non-empty) |

Each: `printf '%s' "<value>" | gh secret set <NAME> --repo <OWNER>/<REPO> --body -`.

Verify with `gh secret list --repo <OWNER>/<REPO>`.

**Postcondition.** Mark `done["step-4-secrets"]`.

### Step 5 — Wire the Jira automation rule

**Precondition.** Skip if `.state.json.done["step-5-jira-rule"]` is set.

This is the only step that needs a one-time Chrome restart so we can attach to the user's logged-in Atlassian session.

**Actions.**

1. Tell the user clearly: *"Quit Chrome completely (Cmd-Q). I'm going to relaunch it with remote debugging enabled so I can attach to your real Atlassian session. Your tabs and login will be preserved."* Wait for confirmation.
2. Relaunch Chrome with the debug port pointing at the user's profile:
   ```bash
   open -na "Google Chrome" --args \
     --remote-debugging-port=9222 \
     --user-data-dir="$HOME/Library/Application Support/Google/Chrome"
   ```
3. Verify CDP is up: `curl -fsSL http://localhost:9222/json/version`. Retry up to 20 s. If never up, fall back to step 5b.
4. **Drive Atlassian Automation via your browser MCP** (Cursor: `cursor-ide-browser`; Claude Code: `user-Playwright`). Navigate to:
   - First try: `<JIRA_BASE_URL>/jira/software/projects/<PROJECT_KEY>/settings/automate`.
   - If 404 / different layout: `<JIRA_BASE_URL>/jira/settings/automation`.
5. Create a rule with:
   - Name: `Dark Factory dispatch`.
   - Trigger: `Manual trigger`.
   - Action: `Send web request`.
   - URL: `https://api.github.com/repos/<OWNER>/<REPO>/dispatches`.
   - Method: `POST`.
   - Body type: `Custom data`.
   - Body (exact JSON):
     ```json
     {"event_type":"jira_manual_button","client_payload":{"issue_key":"{{issue.key}}"}}
     ```
   - Headers (three rows):
     ```
     Accept:        application/vnd.github+json
     Content-Type:  application/json
     Authorization: Bearer <GITHUB_PAT>
     ```
6. **Hand the user the Authorization value via clipboard, never echo it to chat:**
   ```bash
   printf 'Bearer %s' "<GITHUB_PAT>" | pbcopy
   ```
   Tell them: "I copied `Bearer <token>` to your clipboard. Paste it into the Authorization header value, then tick Hidden after the next step succeeds."
7. Click "Validate web request" against any existing ticket key. Expect HTTP 204. If not, surface the body and stop.
8. Tick Hidden on the Authorization header. Save and turn the rule on.

**Step 5b — Manual fallback.** If Chrome cannot be reattached or the UI has drifted, print the full manual instructions (URL, method, body, headers) and ask the user to create the rule manually. Wait for their confirmation.

**Postcondition.** Mark `done["step-5-jira-rule"]`. Optionally smoke-test with `gh api -X POST /repos/<OWNER>/<REPO>/dispatches -f event_type=jira_manual_button -f 'client_payload[issue_key]=<EXISTING-KEY>'` and confirm a workflow run appears.

### Step 6 — Register the self-hosted Mac runner

**Precondition.** Skip if `NGROK_AUTHTOKEN` is empty (deploy is opt-in). Skip if `gh api repos/<OWNER>/<REPO>/actions/runners --jq '.runners[] | select(.labels[].name=="dark-factory") | .name'` returns a non-empty name.

**Actions.**

1. Determine arch: `uname -m`. `arm64` → `osx-arm64`. `x86_64` → `osx-x64`.
2. Pick runner version. Default to `2.319.1`; newer is fine if confirmed via `gh api repos/actions/runner/releases/latest`.
3. Prepare runner directory:
   ```bash
   mkdir -p "$HOME/actions-runner/<OWNER>-<REPO>"
   cd "$HOME/actions-runner/<OWNER>-<REPO>"
   ```
4. Download and extract:
   ```bash
   curl -fsSL -o runner.tgz "https://github.com/actions/runner/releases/download/v<VER>/actions-runner-<ARCH>-<VER>.tar.gz"
   tar xzf runner.tgz
   ```
5. Get a registration token: `gh api -X POST repos/<OWNER>/<REPO>/actions/runners/registration-token --jq .token`.
6. Configure:
   ```bash
   ./config.sh \
     --url "https://github.com/<OWNER>/<REPO>" \
     --token "<REG_TOKEN>" \
     --name "$(scutil --get LocalHostName)-darkfactory" \
     --labels "self-hosted,macos,dark-factory" \
     --unattended --replace
   ```
7. Install as launchd service:
   ```bash
   sudo ./svc.sh install
   sudo ./svc.sh start
   ```
8. Verify online: `gh api repos/<OWNER>/<REPO>/actions/runners --jq '.runners[]|{name,status,labels:[.labels[].name]}'`.

**Postcondition.** Mark `done["step-6-runner"]`.

### Step 7 — Scaffold the first delivery

**Precondition.** Skip if `NGROK_AUTHTOKEN` is empty, or if `.state.json.done["step-7-scaffold"]` is set.

**Actions.**

1. Ask: `client_slug` (e.g. `acme`), `delivery_slug` (e.g. `website`).
2. Create `~/code/<REPO>/clients/<client_slug>/<delivery_slug>/backend/`.
3. `cd backend && supabase init`.
4. Write `~/code/<REPO>/clients/<client_slug>/<delivery_slug>/.delivery.json`:
   ```json
   {
     "client": "<client_slug>",
     "delivery": "<delivery_slug>",
     "live_url": null,
     "owners": ["<OWNER>"],
     "ngrok_port": 54321,
     "created_at": "<ISO-8601-UTC>"
   }
   ```
5. Write `backend/.env.local` (gitignored — `**/.env.local` is in the template `.gitignore`):
   ```
   SUPABASE_URL=http://localhost:54321
   SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   ```
6. `supabase start` once.
7. Capture local keys and write into `.env.local`:
   ```bash
   anon=$(supabase status --output json | jq -r '.[] | select(.name=="anon key") | .value')
   svc=$(supabase status --output json | jq -r '.[] | select(.name=="service_role key") | .value')
   sed -i '' "s|^SUPABASE_ANON_KEY=.*|SUPABASE_ANON_KEY=${anon}|"           backend/.env.local
   sed -i '' "s|^SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=${svc}|" backend/.env.local
   ```
8. Commit and push:
   ```bash
   cd ~/code/<REPO>
   git add -A
   git commit -m "Scaffold first delivery: <client_slug>/<delivery_slug>"
   git push origin main
   ```

**Postcondition.** Save `delivery_default`. Mark `done["step-7-scaffold"]`.

### Step 8 — Smoke tests

**Precondition.** Skip if `.state.json.done["step-8-smoke"]` is set.

For each smoke spec below, in order:

| Spec | Labels | Summary | Description (verbatim) |
|---|---|---|---|
| BOOT-1 | `claude:answer`, `smoke-test` | Smoke: describe the dispatch flow | "Smoke test (answer mode). In 3-5 sentences explain how the dispatch flow turns a Jira button click into a Jira-facing answer." |
| BOOT-2 | `claude:pr`, `smoke-test` | Smoke: PR-mode marker file | "Smoke test (PR mode). Create a one-line marker file at `temp/installer_smoke.md` with the contents `# Installer smoke test`." |
| BOOT-3 (only if ngrok enabled) | `claude:pr`, `smoke-test`, `client:<client_slug>`, `delivery:<delivery_slug>` | Smoke: trivial migration | "Smoke test (deploy mode). Add a no-op migration to the first delivery's backend that creates a table called `installer_smoke` with a single int column `id`." |

For each:

1. Create the Jira ticket via `POST <JIRA_BASE_URL>/rest/api/3/issue` (HTTP Basic) with ADF description.
2. Capture the returned `key`.
3. Trigger dispatch:
   ```
   POST https://api.github.com/repos/<OWNER>/<REPO>/dispatches
   { "event_type": "jira_manual_button", "client_payload": {"issue_key": "<KEY>"} }
   ```
   Expect HTTP 204.
4. Within 30 s, find the new workflow run for `jira-dispatch.yml` (`GET /repos/<OWNER>/<REPO>/actions/workflows/jira-dispatch.yml/runs?per_page=10`, pick the new id).
5. Poll every 10 s up to 600 s. Expect `status: completed`. Record `dispatch_latency_s`, `runtime_s`, `conclusion`, `pr_url`, `jira_comment_posted`.
6. For BOOT-3, additionally wait for `deploy-on-merge.yml` after merging the PR.
7. Append the result row to `.state.json.smoke`.

If any spec fails, do not continue. Surface the failing step + workflow URL and stop.

**Postcondition.** Mark `done["step-8-smoke"]`.

### Step 9 — Initial benchmark

**Precondition.** Skip if `.state.json.done["step-9-benchmark"]` is set.

**Actions.**

1. Build a markdown table from `.state.json.smoke`: columns `label`, `conclusion`, `dispatch_latency_s`, `run_url`, `jira_key`.
2. Add the targets section from `architecture.md` §5.
3. Write `~/code/<REPO>/benchmarks/initial.md`. `mkdir -p` the directory.
4. Commit and push:
   ```bash
   cd ~/code/<REPO>
   git add benchmarks/initial.md
   git commit -m "Initial benchmark $(date -u +%Y-%m-%d)"
   git push origin main
   ```
5. Best-effort: post a Jira comment on BOOT-1 with `https://github.com/<OWNER>/<REPO>/blob/main/benchmarks/initial.md`, prefixed `[TDF-bot] Initial benchmark posted: <link>`.

**Postcondition.** Mark `done["step-9-benchmark"]`.

### Step 10 — Handoff

Always run.

Print this exact summary (substitute bracketed values):

```
You are live.
Orchestrator: https://github.com/<OWNER>/<REPO>
Architecture: https://github.com/<OWNER>/<REPO>/blob/main/architecture.md
Benchmark:    https://github.com/<OWNER>/<REPO>/blob/main/benchmarks/initial.md
First delivery: clients/<client_slug>/<delivery_slug>/  (live URL: <ngrok_url or "n/a — ngrok not enabled">)

Total Claude cost during install: $<total_claude_cost_usd>
Total install time:               <m> min

Next: open Jira, write a ticket, label it claude:pr or claude:answer, click the
manual button. Watch the workflow run, then merge the PR if any.

If something breaks, see architecture.md §4 (failure-mode matrix).
```

---

## Reset (destructive)

Trigger phrases: "reset dark factory installer", "/dark-factory-reset".

The agent runs each step inline, with an AskQuestion confirm before each:

1. Wipe `.state.json`? → `rm -f ~/.claude/skills/dark-factory-installer/.state.json`.
2. Remove `*_DARK_FACTORY` entries from `~/.credentials/credentials`? → `grep -v _DARK_FACTORY= ~/.credentials/credentials > /tmp/c && mv /tmp/c ~/.credentials/credentials && chmod 600 ~/.credentials/credentials`.
3. Delete the orchestrator GitHub repo? → ask `OWNER/NAME`, then `gh repo delete <full> --yes`.
4. Uninstall the self-hosted runner? → `cd $HOME/actions-runner/<OWNER>-<REPO> && sudo ./svc.sh stop && sudo ./svc.sh uninstall && ./config.sh remove --token <gh-issued-remove-token>`.

Does not delete Jira tickets or rules; instruct the user to remove those manually.

## What this skill does NOT do

- No Flutter (web or mobile) deploys. Deferred. When ready, add a step 7b that scaffolds `app/` and a deploy step for Flutter web → Firebase or Vercel.
- No Supabase Cloud projects. Local only.
- No iOS / Android signing or store submissions.
- No customer product code. The dispatch flow does that, ticket by ticket, after install.

## See also (in the source repo)

- `architecture.md` — the system being built (executive → 300-min → cold-start rebuild data).
- `github_actions_claude_spec.md` — the GHA + Claude Code spec with all eight gotchas.
- `docs/workflows.md` — workflow inventory.
