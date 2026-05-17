import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  createFinishSummary,
  createHealthSummary,
  createDoctorSummary,
  createInitPlan,
  createSessionAttachPlan,
  createWorkListSummary,
  createTermExplanation,
  createNextPrompt,
  createPromptRewrite,
  createSessionListSummary,
  createSplitPlan,
  createStatusSummary,
  parseSessionListLimit,
  parseSessionListSince,
  parseSessionListSort,
  parseGitStatusLines,
  readProjectHealth,
  readDevflowConfig,
  readDevflowState,
  runConfiguredGate,
  recordGateEvent,
  recordFinishEvent,
  writeInitPlan,
  recordManualSessionNoteEvent,
  recordSessionAttachedEvent,
  recordSplitWorkEvents,
  recordWorkBlockedEvent,
  recordWorkCreatedEvent,
  recordWorkReadyEvent,
  recordWorkStartedEvent,
} from "../src/index.js";

test("status summary captures repo, dirty files, gates, and prompt recommendation", () => {
  const summary = createStatusSummary({
    repo: {
      absolutePath: "C:\\Users\\Sungbin\\Documents\\GitHub\\solo-devflow-os",
      branch: "main",
      head: "abc123",
    },
    changedFiles: [{ path: "docs/roadmap.md", status: "modified" }],
    gates: [{ id: "docs-check", command: "npm run docs:check", recommended: true }],
  });

  assert.equal(summary.schemaVersion, "0.1");
  assert.equal(summary.command, "status");
  assert.equal(summary.repo.dirty, true);
  assert.equal(summary.git.changedFiles[0].path, "docs/roadmap.md");
  assert.equal(summary.gates[0].recommended, true);
  assert.equal(summary.recommendations[0].kind, "gate");
});

test("finish summary records evidence, skipped checks, risks, and next-session prompt", () => {
  const summary = createFinishSummary({
    workItem: {
      id: "mvp-loop",
      title: "MVP status-finish-next loop",
    },
    intent: "Start the first useful Solo Devflow OS loop.",
    changedFiles: [{ path: "packages/core/src/index.js", status: "added" }],
    gates: [{ id: "unit", command: "npm test", status: "passed" }],
    skipped: [{ id: "artifact-smoke", reason: "No artifact view exists in this slice." }],
    risks: [{ severity: "low", message: "No persistent SQLite store yet." }],
    nextTask: "Add file-backed .devflow state persistence.",
    nextPrompt: "Continue Solo Devflow OS by adding file-backed state persistence.",
  });

  assert.equal(summary.command, "finish");
  assert.equal(summary.workItem.status, "completed");
  assert.equal(summary.evidence.gates[0].status, "passed");
  assert.equal(summary.evidence.skipped[0].id, "artifact-smoke");
  assert.match(summary.nextSession.prompt, /file-backed state persistence/);
});

test("next prompt includes objective, changed files, evidence, risks, and next task", () => {
  const prompt = createNextPrompt({
    objective: "Continue the MVP loop.",
    changedFiles: ["docs/roadmap.md", "packages/core/src/index.js"],
    commands: ["npm test", "npm run docs:check"],
    risks: ["No SQLite persistence yet."],
    nextTask: "Add CLI rendering for status.",
  });

  assert.match(prompt, /Continue the MVP loop/);
  assert.match(prompt, /docs\/roadmap\.md/);
  assert.match(prompt, /npm test/);
  assert.match(prompt, /No SQLite persistence yet/);
  assert.match(prompt, /Add CLI rendering for status/);
});

test("prompt rewrite turns vague intent into agent-ready requirements", () => {
  const rewrite = createPromptRewrite({
    request: "알아서 다음 구현 계속해",
    context: "Solo Devflow OS roadmap has Phase 7 remaining prompt rewrite helper.",
  });

  assert.equal(rewrite.schemaVersion, "0.1");
  assert.equal(rewrite.command, "prompt_rewrite");
  assert.match(rewrite.agentReadyPrompt, /Objective:/);
  assert.match(rewrite.agentReadyPrompt, /Phase 7/);
  assert.ok(rewrite.requirements.some((item) => item.includes("Infer")));
  assert.ok(rewrite.missingDetails.includes("target repository or feature area"));
});

test("init plan describes a local project scaffold without writing files", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-init-plan-"));
  const plan = createInitPlan({
    repo: repoPath,
    profile: "standard",
    platform: "windows-powershell",
  });

  assert.equal(plan.schemaVersion, "0.1");
  assert.equal(plan.command, "init");
  assert.equal(plan.repo.absolutePath, repoPath);
  assert.ok(plan.files.some((file) => file.path === ".devflow/config.json"));
  assert.ok(plan.files.some((file) => file.path === "docs/README.md"));

  await assert.rejects(() => readFile(join(repoPath, ".devflow", "config.json"), "utf8"), {
    code: "ENOENT",
  });
});

test("init plan writes scaffold files only after confirmation", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-init-write-"));
  const plan = createInitPlan({
    repo: repoPath,
    profile: "standard",
    platform: "windows-powershell",
  });

  await assert.rejects(() => writeInitPlan(repoPath, plan), /requires explicit confirmation/);

  const result = await writeInitPlan(repoPath, plan, { confirmed: true });
  const config = JSON.parse(await readFile(join(repoPath, ".devflow", "config.json"), "utf8"));
  const docsRouter = await readFile(join(repoPath, "docs", "README.md"), "utf8");

  assert.equal(result.written.length, plan.files.length);
  assert.equal(config.defaultProfile, "standard");
  assert.equal(config.defaultPlatform, "windows-powershell");
  assert.match(docsRouter, /Project Contract/);
});

test("health summary reports missing scaffold files and gates", () => {
  const summary = createHealthSummary({
    repo: { absolutePath: "C:\\repo" },
    existingPaths: ["AGENTS.md", "docs/README.md"],
    gates: [{ id: "docs-check", command: "npm run docs:check" }],
  });

  assert.equal(summary.schemaVersion, "0.1");
  assert.equal(summary.command, "health");
  assert.equal(summary.status, "missing");
  assert.ok(summary.requiredFiles.some((file) => file.path === "AGENTS.md" && file.present));
  assert.ok(summary.requiredFiles.some((file) => file.path === ".devflow/config.json" && !file.present));
  assert.equal(summary.gates[0].id, "docs-check");
  assert.ok(summary.recommendations.some((item) => item.kind === "missing-file"));
});

test("project health scanner reads scaffold files and configured gates", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-health-"));
  const plan = createInitPlan({
    repo: repoPath,
    profile: "standard",
    platform: "windows-powershell",
  });
  await writeInitPlan(repoPath, plan, { confirmed: true });

  const config = await readDevflowConfig(repoPath);
  const summary = await readProjectHealth(repoPath, config);

  assert.equal(summary.command, "health");
  assert.equal(summary.status, "ok");
  assert.equal(summary.missingFiles.length, 0);
  assert.equal(summary.gates[0].id, "docs-check");
});

test("health summary reports invalid gate definitions", () => {
  const summary = createHealthSummary({
    repo: { absolutePath: "C:\\repo" },
    existingPaths: [
      ".devflow/config.json",
      "AGENTS.md",
      "docs/README.md",
      "docs/contributing/workflow.md",
      "docs/testing/strategy.md",
      "docs/architecture/maps/README.md",
    ],
    gates: [
      { id: "docs-check", command: "npm run docs:check" },
      { id: "docs-check", command: "npm test" },
      { id: "", command: "npm run lint" },
      { id: "empty-command", command: "" },
    ],
  });

  assert.equal(summary.status, "invalid");
  assert.equal(summary.invalidGates.length, 3);
  assert.ok(summary.invalidGates.some((gate) => gate.reason === "duplicate-id"));
  assert.ok(summary.invalidGates.some((gate) => gate.reason === "missing-id"));
  assert.ok(summary.invalidGates.some((gate) => gate.reason === "missing-command"));
  assert.ok(summary.recommendations.some((item) => item.kind === "invalid-gate"));
});

test("work item events can create, start, list, and feed status", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-work-"));

  const created = await recordWorkCreatedEvent(
    repoPath,
    {
      id: "phase-3-work-registry",
      title: "Phase 3 work registry",
      description: "Persist work items in local state.",
      ownedPaths: ["packages/core/**", "packages/cli/**"],
    },
    { observedAt: "2026-05-17T08:00:00.000Z" },
  );
  const started = await recordWorkStartedEvent(
    repoPath,
    { id: "phase-3-work-registry" },
    { observedAt: "2026-05-17T08:01:00.000Z" },
  );

  assert.equal(created.type, "work.created");
  assert.equal(started.type, "work.started");

  const state = await readDevflowState(repoPath);
  const list = createWorkListSummary({
    repo: { absolutePath: repoPath },
    state,
  });

  assert.equal(list.command, "work_list");
  assert.equal(list.items.length, 1);
  assert.equal(list.items[0].id, "phase-3-work-registry");
  assert.equal(list.items[0].status, "active");
  assert.deepEqual(list.items[0].ownedPaths, ["packages/core/**", "packages/cli/**"]);

  const status = createStatusSummary({
    repo: { absolutePath: repoPath },
    state,
  });
  assert.equal(status.work.active[0].id, "phase-3-work-registry");

  const log = await readFile(join(repoPath, ".devflow", "state", "events.jsonl"), "utf8");
  assert.match(log, /"type":"work.created"/);
  assert.match(log, /"type":"work.started"/);
});

test("work create is idempotent for an existing work item id", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-work-idempotent-"));

  const first = await recordWorkCreatedEvent(
    repoPath,
    {
      id: "duplicate-safe",
      title: "Duplicate safe",
      ownedPaths: ["packages/core/**"],
    },
    { observedAt: "2026-05-17T09:10:00.000Z" },
  );
  const second = await recordWorkCreatedEvent(
    repoPath,
    {
      id: "duplicate-safe",
      title: "Duplicate safe changed",
      ownedPaths: ["docs/**"],
    },
    { observedAt: "2026-05-17T09:11:00.000Z" },
  );

  assert.equal(second.existing, true);
  assert.equal(second.observedAt, first.observedAt);
  assert.equal(second.payload.title, "Duplicate safe");

  const log = await readFile(join(repoPath, ".devflow", "state", "events.jsonl"), "utf8");
  assert.equal(log.trim().split("\n").length, 1);
});

test("work lifecycle events can mark items ready and blocked", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-work-lifecycle-"));

  await recordWorkCreatedEvent(repoPath, {
    id: "ready-work",
    title: "Ready work",
  });
  await recordWorkCreatedEvent(repoPath, {
    id: "blocked-work",
    title: "Blocked work",
  });
  const ready = await recordWorkReadyEvent(
    repoPath,
    { id: "ready-work" },
    { observedAt: "2026-05-17T09:20:00.000Z" },
  );
  const blocked = await recordWorkBlockedEvent(
    repoPath,
    {
      id: "blocked-work",
      reason: "Waiting for review.",
    },
    { observedAt: "2026-05-17T09:21:00.000Z" },
  );

  assert.equal(ready.type, "work.ready");
  assert.equal(blocked.type, "work.blocked");

  const state = await readDevflowState(repoPath);
  const status = createStatusSummary({
    repo: { absolutePath: repoPath },
    state,
  });

  assert.equal(state.work.readyToFinish[0].id, "ready-work");
  assert.equal(state.work.blocked[0].id, "blocked-work");
  assert.equal(state.work.blocked[0].blockedReason, "Waiting for review.");
  assert.equal(status.work.readyToFinish[0].id, "ready-work");
  assert.equal(status.work.blocked[0].id, "blocked-work");
});
