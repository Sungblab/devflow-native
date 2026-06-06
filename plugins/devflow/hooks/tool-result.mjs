#!/usr/bin/env node
import {
  compactJson,
  extractToolCommand,
  extractToolFailureText,
  extractToolStdout,
  inferHookPlatform,
  parseJson,
  readHookInput,
  runDevflow,
  writeHookContext,
  writeHookJson,
} from "./devflow-hook-lib.mjs";

const input = await readHookInput();
const eventName = input.hook_event_name ?? "PostToolUse";
const repoPath = input.cwd ?? process.cwd();
const command = extractToolCommand(input);
const stderr = extractToolFailureText(input);
const stdout = extractToolStdout(input);
const platform = inferHookPlatform(input);

if (!command && !stderr && !stdout) {
  if (eventName === "HarnessHealth") {
    writeHookContext(eventName, "Devflow tool-result hook is active.");
  } else {
    writeHookJson({});
  }
  process.exit(0);
}

const args = ["mistakes", "detect", "--json"];
if (input.record !== false) {
  args.push("--record");
}
if (platform) {
  args.push("--platform", platform);
}
if (command) {
  args.push("--command", command);
}
if (stderr) {
  args.push("--stderr", stderr);
}
if (stdout) {
  args.push("--stdout", stdout);
}

const detectionOutput = runDevflow(repoPath, args);
const detection = parseJson(detectionOutput);
const candidates = detection?.candidates ?? [];

if (candidates.length === 0 && eventName !== "HarnessHealth") {
  writeHookJson({});
  process.exit(0);
}

const context = [
  "Devflow tool-result context:",
  candidates.length > 0
    ? `- Detected and recorded ${candidates.length} repeated-mistake candidate(s).`
    : "- No repeated-mistake candidate detected in this health check.",
  "- If the failure is a broader recurring category, promote it through devflow mistakes add or a project instruction after maintainer confirmation.",
  "",
  "Detection:",
  compactJson(detection ?? detectionOutput, 2200),
].join("\n");

writeHookContext(eventName, context);
