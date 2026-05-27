#!/usr/bin/env node
import { compactJson, readHookInput, runDevflow, writeHookContext } from "./devflow-hook-lib.mjs";

const input = await readHookInput();
const repoPath = input.cwd ?? process.cwd();
const message = input.last_assistant_message ?? "";
const claimsDone = /(완료|마무리|done|complete|implemented|finished)/i.test(message);
const mentionsEvidence = /(verified|verification|테스트|검증|gate|finish|next-session|handoff)/i.test(message);

if (claimsDone && !mentionsEvidence && !input.stop_hook_active) {
  process.stdout.write(
    `${JSON.stringify({
      decision: "block",
      reason:
        "Devflow finish guard: before closing, verify relevant gates, run devflow review request when review is required, record review/finish evidence or known gaps, and include the next-session handoff.",
    })}\n`,
  );
  process.exit(0);
}

const status = runDevflow(repoPath, ["status", "--json"]);
const context = [
  "Devflow stop context:",
  "- Before ending, check whether status recommends review, gates, finish, or handoff work.",
  "- If review is required, run devflow review request, hand the prompt to a separate reviewer, then run devflow review record before devflow finish.",
  "- If finish returns review.nextAction.command or review.nextAction.recordCommand, follow both before claiming completion.",
  "",
  "Current compact status:",
  compactJson(status, 2600),
].join("\n");

writeHookContext(input.hook_event_name ?? "Stop", context);
