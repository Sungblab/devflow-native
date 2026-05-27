import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);

test("experiment schemas define task, run, and result contracts", async () => {
  const taskSchema = JSON.parse(await readFile("experiments/schemas/task.schema.json", "utf8"));
  const runSchema = JSON.parse(await readFile("experiments/schemas/run.schema.json", "utf8"));
  const resultSchema = JSON.parse(await readFile("experiments/schemas/result.schema.json", "utf8"));

  assert.deepEqual(taskSchema.required, [
    "taskId",
    "repoFixture",
    "initialPrompt",
    "interruptionSnapshot",
    "acceptanceCriteria",
    "requiredGates",
    "goldChangedFiles",
    "goldContextPointers",
    "expectedRisks",
  ]);
  assert.ok(runSchema.required.includes("condition"));
  assert.ok(runSchema.properties.condition.enum.includes("structured-handoff-plus-gate"));
  assert.ok(resultSchema.required.includes("falseCompletion"));
  assert.ok(resultSchema.required.includes("handoffFaithfulness"));
});

test("experiment scorer scripts print usage without input files", async () => {
  for (const script of [
    "experiments/scripts/score-handoff.js",
    "experiments/scripts/score-run.js",
    "experiments/scripts/aggregate-results.js",
  ]) {
    const { stdout } = await execFileAsync("node", [script]);
    assert.match(stdout, /Usage:/);
  }
});

test("sample pilot fixtures can be scored and aggregated", async () => {
  const task = JSON.parse(await readFile("experiments/fixtures/tasks/task-001.json", "utf8"));
  const run = JSON.parse(await readFile("experiments/fixtures/runs/task-001-structured-handoff-plus-gate.json", "utf8"));
  const expectedResult = JSON.parse(await readFile("experiments/fixtures/results/task-001-structured-handoff-plus-gate.json", "utf8"));

  assert.equal(task.taskId, "task-001");
  assert.equal(run.taskId, task.taskId);
  assert.equal(expectedResult.taskId, task.taskId);

  const scoredRun = await execFileAsync("node", [
    "experiments/scripts/score-run.js",
    "experiments/fixtures/runs/task-001-structured-handoff-plus-gate.json",
  ]);
  const scoredResult = JSON.parse(scoredRun.stdout);
  assert.equal(scoredResult.taskId, "task-001");
  assert.equal(scoredResult.condition, "structured-handoff-plus-gate");
  assert.equal(scoredResult.continuationSuccess, true);
  assert.equal(scoredResult.falseCompletion, false);

  const aggregate = await execFileAsync("node", [
    "experiments/scripts/aggregate-results.js",
    "experiments/fixtures/results/task-001-structured-handoff-plus-gate.json",
  ]);
  const aggregateResult = JSON.parse(aggregate.stdout);
  assert.equal(aggregateResult.totalRuns, 1);
  assert.equal(aggregateResult.byCondition["structured-handoff-plus-gate"].runs, 1);
});

test("task-001 A-H pilot inputs separate visible context from hidden gold metadata", async () => {
  const inputDir = "experiments/fixtures/inputs/task-001";
  const visibleInputs = [
    "00-no-handoff.md",
    "01-raw-transcript.md",
    "02-token-matched-summary.md",
    "03-artifact-only.md",
    "04-structured-handoff.json",
    "05-gate-only.json",
    "06-structured-handoff-plus-gate.json",
    "07-human-oracle.md",
  ];

  const visibleContents = await Promise.all(
    visibleInputs.map(async (fileName) => readFile(`${inputDir}/${fileName}`, "utf8")),
  );
  const hiddenEval = JSON.parse(await readFile(`${inputDir}/hidden-eval.json`, "utf8"));
  const provenance = JSON.parse(await readFile(`${inputDir}/provenance.json`, "utf8"));
  const structuredHandoff = JSON.parse(await readFile(`${inputDir}/04-structured-handoff.json`, "utf8"));
  const gateOnly = JSON.parse(await readFile(`${inputDir}/05-gate-only.json`, "utf8"));
  const structuredWithGate = JSON.parse(
    await readFile(`${inputDir}/06-structured-handoff-plus-gate.json`, "utf8"),
  );

  assert.equal(structuredHandoff.version, "devflow.handoff.v1");
  assert.equal(gateOnly.version, "devflow.gateEvidence.v1");
  assert.equal(structuredWithGate.handoff.version, "devflow.handoff.v1");
  assert.equal(structuredWithGate.gateEvidence.version, "devflow.gateEvidence.v1");

  const hiddenGoldStrings = [
    hiddenEval.goldNextAction,
    hiddenEval.expectedFinalFixSummary,
    ...hiddenEval.goldChangedFiles.map((file) => file.label),
    ...hiddenEval.goldContextPointers.map((pointer) => pointer.label),
    ...hiddenEval.hiddenAcceptanceNotes,
    ...hiddenEval.expectedFalseCompletionRisks,
  ].filter((value) => typeof value === "string" && value.length > 0);
  const visibleCorpus = visibleContents.join("\n");

  for (const hiddenValue of hiddenGoldStrings) {
    assert.equal(
      visibleCorpus.includes(hiddenValue),
      false,
      `visible task-001 inputs must not contain hidden gold string: ${hiddenValue}`,
    );
  }

  const artifactOnly = visibleContents[3];
  assert.doesNotMatch(artifactOnly, /next action|known blocker|fix the|해야 한다|고쳐라|남았다/i);

  const allowedSourceTypes = new Set([
    "original prompt",
    "raw transcript",
    "file read",
    "edit",
    "git diff",
    "command log",
    "gate output",
    "user statement",
  ]);
  for (const claim of provenance.claims) {
    assert.ok(allowedSourceTypes.has(claim.sourceArtifactType));
    assert.equal(claim.observable, true);
  }
});
