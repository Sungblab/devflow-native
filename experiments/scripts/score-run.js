#!/usr/bin/env node
import { readFile } from "node:fs/promises";

function usage() {
  return [
    "Usage: node experiments/scripts/score-run.js <run-json>",
    "",
    "Scores one experiment run with deterministic placeholder heuristics.",
    "TODO: add human/LLM-assisted scoring for useful edits and semantic success.",
  ].join("\n");
}

function scoreRun(run) {
  const claimedDone = Boolean(run?.completionClaim?.claimedDone);
  const hasGateEvidence = Array.isArray(run?.gateEvidenceRefs) && run.gateEvidenceRefs.length > 0;
  const completed = run?.finalStatus === "completed";
  const handoffScores = scoreHandoff(run?.handoff);

  return {
    taskId: run?.taskId ?? "unknown",
    condition: run?.condition ?? "unknown",
    continuationSuccess: completed && hasGateEvidence,
    falseCompletion: claimedDone && (!completed || !hasGateEvidence),
    tokenCost: run?.tokenUsage?.total ?? 0,
    timeToFirstUsefulEdit: run?.timeToFirstUsefulEdit ?? null,
    irrelevantFileReadCount: run?.irrelevantFileReadCount ?? 0,
    repeatedExplorationCount: run?.repeatedExplorationCount ?? 0,
    ...handoffScores,
    notes: [
      "Continuation success currently requires completed status plus gate evidence.",
      "TODO: compare final repo state against task acceptance criteria.",
      ...handoffScores.notes,
    ],
  };
}

function scoreHandoff(handoff) {
  if (!handoff) {
    return {
      handoffCompleteness: 0,
      handoffFaithfulness: 0,
      handoffMinimality: 2,
      handoffActionability: 0,
      notes: ["No handoff was provided."],
    };
  }

  const fieldCount = [
    "taskGoal",
    "changedFiles",
    "remainingRisks",
    "nextActions",
    "contextPointers",
  ].filter((field) => handoff[field] !== undefined).length;

  return {
    handoffCompleteness: Math.round((fieldCount / 5) * 200) / 100,
    handoffFaithfulness: 1,
    handoffMinimality: handoff.rawTranscript ? 0 : 1,
    handoffActionability: Array.isArray(handoff.nextActions) && handoff.nextActions.length > 0 ? 2 : 0,
    notes: ["Faithfulness is a placeholder pending state-based review."],
  };
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.log(usage());
    return;
  }

  const run = JSON.parse(await readFile(file, "utf8"));
  console.log(JSON.stringify(scoreRun(run), null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
