#!/usr/bin/env node
/**
 * codex-runner.mjs — wraps `codex exec` for Dark Factory (same contract as factory workflow).
 *
 * Requires `codex` on PATH (typical on self-hosted macOS runners).
 * On GitHub-hosted ubuntu-latest, install Codex CLI in an earlier step or use another backend.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { appendFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

const promptFile = requireEnv("PROMPT_FILE");
const runDir = requireEnv("RUN_DIR");
const githubEnv = requireEnv("GITHUB_ENV");
const workspace = requireEnv("GITHUB_WORKSPACE");

await mkdir(runDir, { recursive: true });

const lastMsg = path.join(runDir, "last_message.txt");
const eventsLog = path.join(runDir, "events.jsonl");

const promptBody = await readFile(promptFile);

const proc = spawnSync(
  "codex",
  [
    "exec",
    "--json",
    "--skip-git-repo-check",
    "--output-last-message",
    lastMsg,
    "--dangerously-bypass-approvals-and-sandbox",
    "--cd",
    workspace,
    "-",
  ],
  {
    cwd: workspace,
    input: promptBody,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 64,
    env: process.env,
  },
);

if (proc.stdout) process.stdout.write(proc.stdout);
if (proc.stderr) process.stderr.write(proc.stderr);

const combined =
  (typeof proc.stdout === "string" ? proc.stdout : proc.stdout?.toString?.() ?? "") +
  (typeof proc.stderr === "string" ? proc.stderr : proc.stderr?.toString?.() ?? "");
await writeFile(eventsLog, combined);

const rc = proc.status ?? 1;
const conclusion = rc === 0 ? "success" : "failure";
appendFileSync(githubEnv, `CONCLUSION=${conclusion}\n`);
appendFileSync(githubEnv, `EXECUTION_FILE=${eventsLog}\n`);
appendFileSync(githubEnv, `LAST_MESSAGE_FILE=${lastMsg}\n`);

process.exit(0);
