#!/usr/bin/env node
/**
 * gemini-runner.mjs — headless Gemini CLI for Dark Factory CI.
 *
 * Expects npm deps installed in .github/scripts (npm ci there).
 * Workflow should set NODE_PATH=$GITHUB_WORKSPACE/.github/scripts/node_modules
 * so this file can live next to package.json.
 *
 * Auth: Gemini CLI reads GOOGLE_API_KEY or GEMINI_API_KEY (set one in repo secrets).
 *
 * Writes the same artefacts as codex/cursor runners: events.jsonl, last_message.txt,
 * and CONCLUSION / EXECUTION_FILE / LAST_MESSAGE_FILE on GITHUB_ENV.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { appendFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

const promptFile = requireEnv("PROMPT_FILE");
const runDir = requireEnv("RUN_DIR");
const githubEnv = requireEnv("GITHUB_ENV");
const cwd = process.env.GITHUB_WORKSPACE ?? process.cwd();

await mkdir(runDir, { recursive: true });

const prompt = await readFile(promptFile, "utf8");
const lastMsgFile = path.join(runDir, "last_message.txt");
const eventsFile = path.join(runDir, "events.jsonl");

const geminiBin = path.join(__dirname, "node_modules", ".bin", "gemini");
const args = [
  "-p",
  prompt,
  "--skip-trust",
  "--approval-mode",
  "yolo",
  "-o",
  "json",
];

const proc = spawnSync(geminiBin, args, {
  cwd,
  encoding: "utf8",
  maxBuffer: 1024 * 1024 * 64,
  env: {
    ...process.env,
    // Common env names for Google AI / Gemini
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "",
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "",
  },
});

const stderr = proc.stderr || "";
const stdout = proc.stdout || "";
if (stderr) console.error(stderr);

let lastText = stdout.trim();
let conclusion = proc.status === 0 ? "success" : "failure";

if (proc.error) {
  lastText = `gemini spawn error: ${proc.error.message}`;
  conclusion = "failure";
}

// Try to extract human-readable summary from JSON output
try {
  const parsed = JSON.parse(stdout.trim());
  if (parsed && typeof parsed === "object") {
    const txt =
      parsed.text ?? parsed.message ?? parsed.summary ?? (parsed.result && String(parsed.result));
    if (txt) lastText = String(txt);
  }
} catch {
  // keep raw stdout
}

const lines = [
  JSON.stringify({
    type: "assistant",
    message: { content: [{ type: "text", text: lastText }] },
  }),
];

await writeFile(eventsFile, lines.join("\n") + "\n");
await writeFile(lastMsgFile, lastText);

appendFileSync(githubEnv, `CONCLUSION=${conclusion}\n`);
appendFileSync(githubEnv, `EXECUTION_FILE=${eventsFile}\n`);
appendFileSync(githubEnv, `LAST_MESSAGE_FILE=${lastMsgFile}\n`);

console.log(`gemini-runner: conclusion=${conclusion} exit=${proc.status ?? "?"}`);
process.exit(conclusion === "success" ? 0 : 1);
