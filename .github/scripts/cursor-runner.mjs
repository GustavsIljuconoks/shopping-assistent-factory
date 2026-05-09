#!/usr/bin/env node
/**
 * cursor-runner.mjs
 *
 * Drop-in replacement for `codex exec` in the Dark Factory workflow.
 * Reads the prompt written by jira-dispatch.mjs prepare-dispatch,
 * runs it via the Cursor SDK (local runtime on the self-hosted runner),
 * and writes the execution log + last-message file in the format that
 * jira-dispatch.mjs record-run expects.
 *
 * Required env vars (set by the workflow):
 *   PROMPT_FILE      - path to the prompt markdown file
 *   RUN_DIR          - directory for this run's artefacts
 *   GITHUB_ENV       - path to the GitHub Actions env file
 *   GITHUB_WORKSPACE - repo checkout root (used as agent cwd)
 *   CURSOR_API_KEY   - Cursor API key (from repo secret)
 */

import { Agent, CursorAgentError } from "@cursor/sdk";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { appendFileSync } from "node:fs";
import path from "node:path";

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

const promptFile = requireEnv("PROMPT_FILE");
const runDir = requireEnv("RUN_DIR");
const githubEnv = requireEnv("GITHUB_ENV");
const cwd = process.env.GITHUB_WORKSPACE ?? process.cwd();
const apiKey = requireEnv("CURSOR_API_KEY");

await mkdir(runDir, { recursive: true });

const prompt = await readFile(promptFile, "utf8");
const lastMsgFile = path.join(runDir, "last_message.txt");
const eventsFile = path.join(runDir, "events.jsonl");

let conclusion = "failure";
let lastText = "";
let agentId = "";

try {
  const result = await Agent.prompt(prompt, {
    apiKey,
    model: { id: "composer-2" },
    local: { cwd },
  });

  agentId = result.agentId ?? "";
  lastText = result.result ?? "";
  conclusion = result.status === "finished" ? "success" : "failure";

  // Write events.jsonl in the format record-run expects:
  // It looks for entries with type="assistant" and message.content[].text
  const lines = [
    JSON.stringify({ type: "agent_id", agent_id: agentId }),
    JSON.stringify({
      type: "assistant",
      message: { content: [{ type: "text", text: lastText }] },
    }),
  ];
  await writeFile(eventsFile, lines.join("\n") + "\n");
} catch (err) {
  const isStartupFailure = err instanceof CursorAgentError;
  lastText = isStartupFailure
    ? `Cursor startup error (${err.isRetryable ? "retryable" : "non-retryable"}): ${err.message}`
    : `Cursor runner error: ${err.message}`;

  await writeFile(
    eventsFile,
    JSON.stringify({ type: "error", message: lastText }) + "\n",
  );
  console.error(lastText);
}

await writeFile(lastMsgFile, lastText);

// Export paths and conclusion to $GITHUB_ENV for downstream steps.
appendFileSync(githubEnv, `CONCLUSION=${conclusion}\n`);
appendFileSync(githubEnv, `EXECUTION_FILE=${eventsFile}\n`);
appendFileSync(githubEnv, `LAST_MESSAGE_FILE=${lastMsgFile}\n`);

console.log(`cursor-runner: conclusion=${conclusion} agent=${agentId}`);
process.exit(conclusion === "success" ? 0 : 1);
