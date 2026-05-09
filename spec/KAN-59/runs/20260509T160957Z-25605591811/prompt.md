You are running inside `GustavsIljuconoks/shopping-assistent-factory` for Jira ticket `KAN-59: About You: search and cart-staging recipe`.

Read `AGENTS.md` for repository conventions before touching files.

Ticket folder: `spec/KAN-59`.
- `spec/KAN-59/spec.md`: a fresh snapshot of the Jira ticket and its comments. Read it. Do not edit it.
- `spec/KAN-59/plan.md`: implementation plan. You own this file. Update it as you go.
- `spec/KAN-59/transcript.md`: rolling history of prior runs. Read it for context if needed.
- `spec/KAN-59/response.md`: the message that will be posted back to Jira. You own this file.

Run kind: `pr` (expects code/config changes plus a PR).
Run mode: `NEW`.

Goal:
- Make the smallest correct repository changes to satisfy the ticket.
- Update `spec/KAN-59/plan.md` with the implementation plan.
- Write a concise Jira-facing summary to `spec/KAN-59/response.md` (what changed, why, risks). Do not include logs or secrets.
- Do not create or merge pull requests; the workflow does that.

Constraints:
- Never expose, print, or commit secrets.
- Do not switch branches.
- Keep tool usage minimal.
