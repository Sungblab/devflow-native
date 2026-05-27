#!/usr/bin/env node
import { compactJson, detectIntent, readHookInput, runDevflow, writeHookContext } from "./devflow-hook-lib.mjs";

const input = await readHookInput();
const repoPath = input.cwd ?? process.cwd();
const intent = detectIntent(input.prompt ?? "");

if (!intent) {
  writeHookContext(input.hook_event_name ?? "UserPromptSubmit", "Devflow: no workflow intent detected.");
  process.exit(0);
}

const status = runDevflow(repoPath, ["status", "--json"]);
const context = [
  `Devflow detected intent: ${intent}`,
  "- Resolve fast maintainer wording from repo state before asking questions.",
  "- Prefer plugin/MCP state restoration over manual CLI instructions.",
  "- Superpowers may guide method; Devflow records project truth, gates, sessions, and handoffs.",
  "- Do not generate HTML unless requested, state is visually dense, or an artifact is explicitly useful.",
  "- On finish/review intent, verify gates, run devflow review request when review is required, record devflow review record evidence, and record finish evidence before claiming completion.",
  "",
  "Current compact status:",
  compactJson(status, 3000),
].join("\n");

writeHookContext(input.hook_event_name ?? "UserPromptSubmit", context, {
  hookSpecificOutput: {
    sessionTitle: intent === "continue_or_start" ? "Devflow continue" : `Devflow ${intent}`,
  },
});
