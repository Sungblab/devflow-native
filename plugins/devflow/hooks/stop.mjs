#!/usr/bin/env node
import { readHookInput, runDevflow } from "./devflow-hook-lib.mjs";

const input = await readHookInput();
const repoPath = input.cwd ?? process.cwd();
const message = input.last_assistant_message ?? "";
const claimsDone = /(완료|마무리|done|complete|implemented|finished)/i.test(message);
const mentionsEvidence = /(verified|verification|tests?|테스트|검증|gate|finish|next-session|handoff)/i.test(message);
const mentionsReviewEvidence = /(review request|review record|review\.completed|리뷰)/i.test(message);
const status = input.devflow_status_json ?? runDevflow(repoPath, ["status", "--json"]);
const parsedStatus = parseJson(status);
const reviewRecommendation = parsedStatus?.recommendations?.find((item) => item.kind === "review");

if (claimsDone && !mentionsEvidence && !input.stop_hook_active) {
  writeStopBlock(
    [
      "Devflow finish guard:",
      "Before closing, verify relevant gates, run devflow review request when review is required,",
      "record review/finish evidence or known gaps, and include the next-session handoff.",
    ].join(" "),
  );
  process.exit(0);
}

if (claimsDone && reviewRecommendation && !mentionsReviewEvidence && !input.stop_hook_active) {
  writeStopBlock(
    [
      `Devflow review guard: status recommends ${reviewRecommendation.command}.`,
      "Run the review request and record the review outcome before claiming completion.",
    ].join(" "),
  );
  process.exit(0);
}

writeStopOk();

function writeStopBlock(reason) {
  process.stdout.write(`${JSON.stringify({ decision: "block", reason })}\n`);
}

function writeStopOk() {
  process.stdout.write(`${JSON.stringify({})}\n`);
}

function parseJson(value) {
  if (!value) {
    return null;
  }
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return null;
  }
}
