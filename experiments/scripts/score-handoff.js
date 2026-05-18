#!/usr/bin/env node
import { readFile } from "node:fs/promises";

function usage() {
  return [
    "Usage: node experiments/scripts/score-handoff.js <handoff-json>",
    "",
    "Scores a structured handoff with deterministic placeholder heuristics.",
    "TODO: replace or supplement with human/LLM-assisted faithfulness review.",
  ].join("\n");
}

function scoreHandoff(handoff) {
  const requiredFields = [
    "workItemId",
    "taskGoal",
    "currentStatus",
    "changedFiles",
    "remainingRisks",
    "nextActions",
    "contextPointers",
  ];
  const present = requiredFields.filter((field) => handoff?.[field] !== undefined).length;
  const completeness = roundScore((present / requiredFields.length) * 2);
  const hasPointers = Array.isArray(handoff?.contextPointers) && handoff.contextPointers.length > 0;
  const hasNext = Array.isArray(handoff?.nextActions) && handoff.nextActions.length > 0;

  return {
    handoffCompleteness: completeness,
    handoffFaithfulness: null,
    handoffMinimality: handoff?.rawTranscript ? 0 : 1,
    handoffActionability: hasPointers && hasNext ? 2 : hasNext ? 1 : 0,
    notes: [
      "Faithfulness requires comparison against repo state, git diff, and gate evidence.",
    ],
  };
}

function roundScore(value) {
  return Math.round(value * 100) / 100;
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.log(usage());
    return;
  }

  const handoff = JSON.parse(await readFile(file, "utf8"));
  console.log(JSON.stringify(scoreHandoff(handoff), null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
