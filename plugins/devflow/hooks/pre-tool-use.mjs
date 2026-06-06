#!/usr/bin/env node
import {
  detectPreToolIssue,
  extractToolCommand,
  readHookInput,
  writeHookContext,
  writeHookJson,
} from "./devflow-hook-lib.mjs";

const input = await readHookInput();
const eventName = input.hook_event_name ?? "PreToolUse";
const command = extractToolCommand(input);
const issue = detectPreToolIssue(input);

if (issue) {
  writeHookJson({
    hookSpecificOutput: {
      hookEventName: eventName,
      permissionDecision: "deny",
      permissionDecisionReason: [
        `Devflow command guard: ${issue.reason}`,
        `Correction: ${issue.correction}`,
        `Mistake id: ${issue.id}`,
      ].join(" "),
    },
  });
  process.exit(0);
}

if (eventName === "HarnessHealth") {
  writeHookContext(
    eventName,
    [
      "Devflow pre-tool guard is active.",
      "- Blocks known shell-mismatch commands before execution.",
      "- Current command:",
      command || "(none supplied)",
    ].join("\n"),
  );
  process.exit(0);
}

writeHookJson({});
