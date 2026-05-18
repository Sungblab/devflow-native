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
