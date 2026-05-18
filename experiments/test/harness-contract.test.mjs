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
