import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  createFinishSummary,
  createDoctorSummary,
  createNextPrompt,
  createStatusSummary,
  parseGitStatusLines,
  readDevflowState,
  recordGateEvent,
  recordFinishEvent,
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
    skipped: [{ id: "dashboard-smoke", reason: "No dashboard exists in this slice." }],
    risks: [{ severity: "low", message: "No persistent SQLite store yet." }],
    nextTask: "Add file-backed .devflow state persistence.",
    nextPrompt: "Continue Solo Devflow OS by adding file-backed state persistence.",
  });

  assert.equal(summary.command, "finish");
  assert.equal(summary.workItem.status, "completed");
  assert.equal(summary.evidence.gates[0].status, "passed");
  assert.equal(summary.evidence.skipped[0].id, "dashboard-smoke");
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

test("git status parser preserves file-level untracked paths", () => {
  const files = parseGitStatusLines("?? packages/core/test/mvp-contract.test.mjs\n M docs/roadmap.md");

  assert.deepEqual(files, [
    { status: "??", path: "packages/core/test/mvp-contract.test.mjs" },
    { status: "M", path: "docs/roadmap.md" },
  ]);
});

test("finish evidence is appended to the local devflow event log", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-state-"));
  const summary = createFinishSummary({
    workItem: { id: "state-persistence", title: "State persistence" },
    intent: "Persist finish evidence.",
    changedFiles: [{ path: "packages/core/src/index.js", status: "modified" }],
    gates: [
      {
        id: "unit",
        command: "npm test",
        status: "passed",
        observedAt: "2026-05-16T10:00:00+09:00",
        summary: "node --test passed.",
      },
    ],
    risks: [{ severity: "low", message: "JSONL only; no SQLite yet." }],
    nextPrompt: "Continue with persisted status evidence.",
  });

  const event = await recordFinishEvent(repoPath, summary, {
    observedAt: "2026-05-16T10:01:00+09:00",
  });

  const logPath = join(repoPath, ".devflow", "state", "events.jsonl");
  const log = await readFile(logPath, "utf8");
  const lines = log.trim().split("\n");

  assert.equal(lines.length, 1);
  assert.deepEqual(JSON.parse(lines[0]), event);
  assert.equal(event.type, "work.completed");
  assert.equal(event.payload.workItem.id, "state-persistence");
});

test("status summary can derive latest handoff and gate evidence from devflow state", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-status-"));
  const finish = createFinishSummary({
    workItem: { id: "state-persistence", title: "State persistence" },
    intent: "Persist finish evidence.",
    changedFiles: [{ path: "packages/core/src/index.js", status: "modified" }],
    gates: [
      {
        id: "unit",
        command: "npm test",
        status: "passed",
        observedAt: "2026-05-16T10:00:00+09:00",
        summary: "node --test passed.",
      },
    ],
    nextPrompt: "Continue with persisted status evidence.",
  });
  await recordFinishEvent(repoPath, finish, {
    observedAt: "2026-05-16T10:01:00+09:00",
  });

  const state = await readDevflowState(repoPath);
  const status = createStatusSummary({
    repo: { absolutePath: repoPath, branch: "main" },
    state,
    gates: [{ id: "unit", command: "npm test", recommended: true }],
  });

  assert.equal(status.handoffs.latest.workItemId, "state-persistence");
  assert.match(status.handoffs.latest.prompt, /persisted status evidence/);
  assert.equal(status.gates[0].lastRun.status, "passed");
  assert.equal(status.gates[0].lastRun.observedAt, "2026-05-16T10:00:00+09:00");
});

test("status summary can derive gate evidence recorded independently", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-gate-"));

  await recordGateEvent(
    repoPath,
    {
      id: "docs",
      command: "npm run docs:check",
      status: "passed",
      summary: "Documentation link check passed.",
      workItemId: "docs-check",
    },
    { observedAt: "2026-05-16T11:00:00+09:00" },
  );

  const state = await readDevflowState(repoPath);
  const status = createStatusSummary({
    repo: { absolutePath: repoPath, branch: "main" },
    state,
    gates: [{ id: "docs", command: "npm run docs:check", recommended: true }],
  });

  assert.equal(status.gates[0].lastRun.status, "passed");
  assert.equal(status.gates[0].lastRun.summary, "Documentation link check passed.");
  assert.equal(status.gates[0].lastRun.workItemId, "docs-check");
});

test("doctor summary renders platform rules and repeated mistake memory", () => {
  const summary = createDoctorSummary({
    repo: {
      absolutePath: "C:\\Users\\Sungbin\\Documents\\GitHub\\solo-devflow-os",
    },
    platform: {
      name: "windows-powershell",
      shell: "pwsh",
      pathStyle: "windows",
    },
    tools: {
      git: { available: true, command: "git" },
      rg: { available: true, command: "rg" },
      gh: { available: false, command: "gh" },
    },
    mistakes: [
      {
        id: "powershell-literal-path",
        symptom: "Agent used Bash-style path handling in PowerShell.",
        correction: "Use Get-Content -LiteralPath and quote Windows paths.",
        appliesTo: ["windows-powershell"],
      },
    ],
  });

  assert.equal(summary.command, "doctor");
  assert.equal(summary.platform.shell, "pwsh");
  assert.equal(summary.executionContract.preferredReadCommand, "Get-Content -LiteralPath");
  assert.ok(summary.executionContract.avoid.includes("bash-specific syntax"));
  assert.equal(summary.memory.repeatedMistakes[0].id, "powershell-literal-path");
  assert.match(summary.recommendations[0].message, /Use Get-Content -LiteralPath/);
});
