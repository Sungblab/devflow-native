#!/usr/bin/env node
import {
  compactJson,
  detectIntent,
  extractUserPrompt,
  intentNextActions,
  parseJson,
  readHookInput,
  runDevflow,
  shouldRewritePrompt,
  writeHookContext,
} from "./devflow-hook-lib.mjs";

const input = await readHookInput();
const repoPath = input.cwd ?? process.cwd();
const eventName = input.hook_event_name ?? "UserPromptSubmit";
const prompt = extractUserPrompt(input);
const intent = detectIntent(prompt);
const status = runDevflow(repoPath, ["status", "--json"]);

if (!intent && shouldRewritePrompt(prompt, intent)) {
  const rewriteOutput = runDevflow(repoPath, [
    "prompt",
    "rewrite",
    "--request",
    prompt,
    "--context",
    compactJson(status, 1800),
    "--json",
  ]);
  const rewrite = parseJson(rewriteOutput);
  const context = [
    "Devflow prompt interpretation context:",
    "- Treat this as an interpretation aid, not a replacement for the user's request.",
    "- Resolve missing details from repo docs, git state, gates, and recent handoffs before asking questions.",
    "- Keep the implementation to the next safe slice unless the maintainer explicitly asks for broader scope.",
    "",
    "Agent-ready prompt:",
    rewrite?.agentReadyPrompt?.trim() ?? compactJson(rewriteOutput, 2200),
    "",
    "Current compact status:",
    compactJson(status, 1800),
  ].join("\n");

  writeHookContext(eventName, context);
  process.exit(0);
}

if (!intent) {
  writeHookContext(eventName, "Devflow: no workflow intent detected.");
  process.exit(0);
}

const nextActions = intentNextActions(intent);
const context = [
  `Devflow detected intent: ${intent}`,
  "- Resolve fast maintainer wording from repo state before asking questions.",
  "- Prefer plugin/MCP state restoration over manual CLI instructions.",
  "- Superpowers may guide method; Devflow records project truth, gates, sessions, and handoffs.",
  "- Do not generate HTML unless requested, state is visually dense, or an artifact is explicitly useful.",
  "- On finish/review intent, verify gates, run devflow review request when review is required, record devflow review record evidence, and record finish evidence before claiming completion.",
  "",
  "Recommended Devflow next actions:",
  ...nextActions.map((action) => `- ${action}`),
  "",
  "Current compact status:",
  compactJson(status, 3000),
].join("\n");

writeHookContext(eventName, context);
