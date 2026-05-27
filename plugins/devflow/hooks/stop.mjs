#!/usr/bin/env node
import { readHookInput } from "./devflow-hook-lib.mjs";

const input = await readHookInput();
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

process.stdout.write("{}\n");
