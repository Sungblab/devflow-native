import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  createFinishSummary,
  createHealthSummary,
  createHarnessInspectSummary,
  createHarnessPlanSummary,
  createDoctorSummary,
  createInitPlan,
  createSessionAttachPlan,
  createWorkListSummary,
  createTermExplanation,
  createNextPrompt,
  createPromptRewrite,
  createReviewRequest,
  createSessionListSummary,
  createSplitPlan,
  createStatusSummary,
  parseSessionListLimit,
  parseSessionListSince,
  parseSessionListSort,
  parseGitStatusLines,
  readProjectHealth,
  readHarnessInspect,
  readHarnessPlan,
  readHarnessHealth,
  readDevflowConfig,
  readDevflowState,
  readLatestHandoff,
  runConfiguredGate,
  writeHarnessInstall,
  writeHarnessRepair,
  recordGateEvent,
  recordFinishEvent,
  writeInitPlan,
  recordManualSessionNoteEvent,
  recordReviewEvent,
  recordSessionAttachedEvent,
  recordSplitWorkEvents,
  recordWorkBlockedEvent,
  recordWorkCreatedEvent,
  recordWorkReadyEvent,
  recordWorkRenamedEvent,
  recordWorkStartedEvent,
  recordWorkUpdatedEvent,
  recordWorkUnblockedEvent,
} from "../src/index.js";

function emptyTestState() {
  return {
    warnings: [],
    gates: { latestById: {} },
    handoffs: { latest: null, stale: true },
    work: { items: [], active: [], blocked: [], readyToFinish: [] },
    reviews: { latestByWorkItemId: {} },
    sessions: { discovered: [], attached: [] },
  };
}

test("status summary captures repo, dirty files, gates, and prompt recommendation", () => {
  const summary = createStatusSummary({
    repo: {
      absolutePath: "C:\\Users\\You\\Documents\\GitHub\\devflow-demo",
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

test("status summary recommends review request when required review is missing for focused work", () => {
  const summary = createStatusSummary({
    repo: {
      absolutePath: "C:\\repo",
      branch: "main",
    },
    changedFiles: [],
    workItemId: "review-focused-work",
    reviewRequired: true,
    state: {
      ...emptyTestState(),
      reviews: {
        latestByWorkItemId: {},
      },
    },
  });

  assert.equal(summary.recommendations[0].kind, "review");
  assert.equal(
    summary.recommendations[0].command,
    "devflow review request --work review-focused-work --target reviewer --persona strict-reviewer",
  );
  assert.match(summary.recommendations[0].message, /review-focused-work/);
});

test("status summary recommends review request for ready work when no work filter is provided", () => {
  const summary = createStatusSummary({
    repo: {
      absolutePath: "C:\\repo",
      branch: "main",
    },
    changedFiles: [],
    reviewRequired: true,
    state: {
      ...emptyTestState(),
      work: {
        items: [{ id: "ready-review-work", title: "Ready review work", status: "ready-to-finish" }],
        active: [],
        blocked: [],
        readyToFinish: [{ id: "ready-review-work", title: "Ready review work", status: "ready-to-finish" }],
      },
      reviews: {
        latestByWorkItemId: {},
      },
    },
  });

  assert.equal(summary.filters.workItemId, null);
  assert.equal(summary.recommendations[0].kind, "review");
  assert.equal(
    summary.recommendations[0].command,
    "devflow review request --work ready-review-work --target reviewer --persona strict-reviewer",
  );
});

test("status summary falls back to active work for review recommendation", () => {
  const summary = createStatusSummary({
    repo: {
      absolutePath: "C:\\repo",
      branch: "main",
    },
    changedFiles: [],
    reviewRequired: true,
    state: {
      ...emptyTestState(),
      work: {
        items: [{ id: "active-review-work", title: "Active review work", status: "active" }],
        active: [{ id: "active-review-work", title: "Active review work", status: "active" }],
        blocked: [],
        readyToFinish: [],
      },
      reviews: {
        latestByWorkItemId: {},
      },
    },
  });

  assert.equal(summary.filters.workItemId, null);
  assert.equal(summary.recommendations[0].kind, "review");
  assert.equal(
    summary.recommendations[0].command,
    "devflow review request --work active-review-work --target reviewer --persona strict-reviewer",
  );
});

test("finish summary records evidence, skipped checks, risks, and next-session prompt", () => {
  const summary = createFinishSummary({
    workItem: {
      id: "mvp-loop",
      title: "MVP status-finish-next loop",
    },
    intent: "Start the first useful Devflow Native loop.",
    changedFiles: [{ path: "packages/core/src/index.js", status: "added" }],
    gates: [{ id: "unit", command: "npm test", status: "passed" }],
    skipped: [{ id: "artifact-smoke", reason: "No artifact view exists in this slice." }],
    risks: [{ severity: "low", message: "No persistent SQLite store yet." }],
    nextTask: "Add file-backed .devflow state persistence.",
    nextPrompt: "Continue Devflow Native by adding file-backed state persistence.",
  });

  assert.equal(summary.command, "finish");
  assert.equal(summary.workItem.status, "completed");
  assert.equal(summary.evidence.gates[0].status, "passed");
  assert.equal(summary.evidence.skipped[0].id, "artifact-smoke");
  assert.match(summary.nextSession.prompt, /file-backed state persistence/);
});

test("finish summary blocks done claims when required gate evidence is missing", () => {
  const summary = createFinishSummary({
    workItem: {
      id: "research-finish",
      title: "Research-ready finish guard",
    },
    intent: "Close work with evidence-aware finish guard.",
    changedFiles: [{ path: "packages/core/src/index.js", status: "modified" }],
    requiredGates: [
      {
        id: "unit",
        command: "npm test",
      },
    ],
    gates: [],
    risks: [],
    nextTask: "Run missing unit gate.",
  });

  assert.equal(summary.canClaimDone, false);
  assert.deepEqual(summary.unknownGates, [
    {
      id: "unit",
      command: "npm test",
      reason: "Required gate has no recorded gate.finished evidence.",
    },
  ]);
  assert.match(summary.doneBlockers[0].message, /unit/);
  assert.equal(summary.structuredHandoff.currentStatus, "blocked");
  assert.match(summary.nextPrompt, /Run missing unit gate/);
});

test("finish summary blocks done claims when recorded gate evidence failed", () => {
  const summary = createFinishSummary({
    workItem: {
      id: "failed-gate",
      title: "Failed gate guard",
    },
    intent: "Check failed gate handling.",
    changedFiles: [{ path: "packages/core/src/index.js", status: "modified" }],
    requiredGates: [{ id: "unit", command: "npm test" }],
    gates: [{ id: "unit", command: "npm test", status: "failed" }],
    risks: [],
    nextTask: "Fix failing unit gate.",
  });

  assert.equal(summary.canClaimDone, false);
  assert.deepEqual(summary.failedGates, [{ id: "unit", command: "npm test", status: "failed" }]);
  assert.equal(summary.doneBlockers[0].kind, "failed_gate");
});

test("finish summary allows done claim with passed required gate and no remaining risk", () => {
  const summary = createFinishSummary({
    workItem: {
      id: "passed-gate",
      title: "Passed gate guard",
    },
    intent: "Check passed gate handling.",
    changedFiles: [{ path: "packages/core/src/index.js", status: "modified" }],
    requiredGates: [{ id: "unit", command: "npm test" }],
    gates: [{ id: "unit", command: "npm test", status: "passed" }],
    risks: [],
    nextTask: "Continue the next implementation slice.",
  });

  assert.equal(summary.canClaimDone, true);
  assert.deepEqual(summary.doneBlockers, []);
  assert.deepEqual(summary.failedGates, []);
  assert.deepEqual(summary.unknownGates, []);
  assert.equal(summary.structuredHandoff.currentStatus, "completed");
  assert.match(summary.nextPrompt, /Continue the next implementation slice/);
});

test("finish summary requires review evidence when review gate is required", () => {
  const blocked = createFinishSummary({
    workItem: { id: "review-required", title: "Review required" },
    intent: "Require code review before finish.",
    changedFiles: [{ path: "packages/core/src/index.js", status: "modified" }],
    requiredGates: [],
    reviewRequired: true,
  });

  assert.equal(blocked.canClaimDone, false);
  assert.ok(blocked.doneBlockers.some((blocker) => blocker.kind === "missing_review"));
  assert.equal(blocked.review.nextAction.command, "devflow review request --work review-required --target reviewer --persona strict-reviewer");
  assert.equal(
    blocked.review.nextAction.recordCommand,
    "devflow review record --work review-required --reviewer <reviewer> --status <passed|changes-requested> --summary <summary>",
  );
  assert.match(blocked.review.nextAction.reason, /required review/i);

  const reviewed = createFinishSummary({
    workItem: { id: "review-required", title: "Review required" },
    intent: "Require code review before finish.",
    changedFiles: [{ path: "packages/core/src/index.js", status: "modified" }],
    requiredGates: [],
    reviewRequired: true,
    reviewEvidence: {
      workItemId: "review-required",
      reviewer: "Claude Code",
      status: "passed",
      summary: "No blocking findings.",
    },
  });

  assert.equal(reviewed.canClaimDone, true);
  assert.deepEqual(reviewed.doneBlockers, []);
  assert.equal(reviewed.review.status, "passed");
  assert.equal(reviewed.review.reviewer, "Claude Code");
});

test("finish summary blocks review evidence that still requests changes", () => {
  const summary = createFinishSummary({
    workItem: { id: "review-changes", title: "Review changes" },
    intent: "Block unresolved review findings.",
    reviewRequired: true,
    reviewEvidence: {
      workItemId: "review-changes",
      reviewer: "Codex reviewer",
      status: "changes-requested",
      summary: "Fix the failing edge case.",
    },
  });

  assert.equal(summary.canClaimDone, false);
  assert.ok(summary.doneBlockers.some((blocker) => blocker.kind === "review_changes_requested"));
  assert.equal(
    summary.review.nextAction.recordCommand,
    "devflow review record --work review-changes --reviewer <reviewer> --status <passed|changes-requested> --summary <summary>",
  );
});

test("review request creates an agent-ready strict review prompt", () => {
  const request = createReviewRequest({
    workItem: {
      id: "review-request",
      title: "Review request prompt",
    },
    intent: "Make finish-time review hard to skip.",
    target: "claude-code",
    persona: "strict-reviewer",
    changedFiles: [
      { path: "packages/core/src/index.js", status: "modified" },
      { path: "packages/cli/src/index.js", status: "modified" },
    ],
    gates: [{ id: "unit", command: "npm test", status: "passed" }],
    reviewRecordCommand:
      "devflow review record --work review-request --reviewer Claude --status passed --summary <summary>",
  });

  assert.equal(request.schemaVersion, "0.1");
  assert.equal(request.command, "review_request");
  assert.equal(request.workItemId, "review-request");
  assert.equal(request.target, "claude-code");
  assert.equal(request.persona, "strict-reviewer");
  assert.match(request.prompt, /Assume another coding agent wrote this change/);
  assert.match(request.prompt, /Make finish-time review hard to skip/);
  assert.match(request.prompt, /packages\/core\/src\/index\.js/);
  assert.match(request.prompt, /npm test/);
  assert.match(request.prompt, /devflow review record --work review-request/);
  assert.ok(request.checklist.some((item) => item.includes("Blockers")));
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
    context: "Devflow Native roadmap has Phase 7 remaining prompt rewrite helper.",
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
  const workflow = await readFile(join(repoPath, "docs", "contributing", "workflow.md"), "utf8");
  const gitignore = await readFile(join(repoPath, ".gitignore"), "utf8");

  assert.equal(result.written.length, plan.files.length + 1);
  assert.equal(config.defaultProfile, "standard");
  assert.equal(config.defaultPlatform, "windows-powershell");
  assert.equal(config.review.required, true);
  assert.match(docsRouter, /Project Contract/);
  assert.match(workflow, /devflow review request/);
  assert.match(workflow, /devflow review record/);
  assert.match(gitignore, /^\.devflow\/state\/$/m);
  assert.match(gitignore, /^\.devflow\/next-prompt\.md$/m);
});

test("init plan preserves and deduplicates Devflow runtime gitignore entries", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-init-gitignore-"));
  await writeFile(join(repoPath, ".gitignore"), "node_modules\n.devflow/state/\n", "utf8");
  const plan = createInitPlan({
    repo: repoPath,
    profile: "standard",
    platform: "windows-powershell",
  });

  await writeInitPlan(repoPath, plan, { confirmed: true });
  await writeInitPlan(repoPath, plan, { confirmed: true });

  const gitignore = await readFile(join(repoPath, ".gitignore"), "utf8");
  assert.equal((gitignore.match(/^\.devflow\/state\/$/gm) ?? []).length, 1);
  assert.equal((gitignore.match(/^\.devflow\/next-prompt\.md$/gm) ?? []).length, 1);
  assert.match(gitignore, /^node_modules$/m);
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

test("harness inspect summary reports native target readiness and recommendations", () => {
  const summary = createHarnessInspectSummary({
    repo: { absolutePath: "C:\\repo" },
    targets: ["codex", "claude", "superpowers", "codegraph"],
    existingPaths: [
      "AGENTS.md",
      "plugins/devflow/.codex-plugin/plugin.json",
      "plugins/devflow/hooks/hooks.json",
      "plugins/devflow/hooks/session-start.mjs",
      "plugins/devflow/hooks/user-prompt-submit.mjs",
      "plugins/devflow/hooks/stop.mjs",
      "plugins/devflow/.mcp.json",
      "plugins/devflow/skills/start/SKILL.md",
      "plugins/devflow/skills/finish/SKILL.md",
      "docs/superpowers/specs",
    ],
    config: {
      gates: [{ id: "docs-check", command: "npm run docs:check" }],
    },
  });

  assert.equal(summary.schemaVersion, "0.1");
  assert.equal(summary.command, "harness_inspect");
  assert.equal(summary.status, "needs-install");
  assert.equal(summary.targets.codex.status, "ready");
  assert.equal(summary.targets.claude.status, "missing");
  assert.equal(summary.targets.superpowers.status, "available");
  assert.equal(summary.targets.codegraph.status, "missing");
  assert.ok(summary.instructions.some((item) => item.path === "AGENTS.md" && item.present));
  assert.ok(summary.recommendations.some((item) => item.target === "claude"));
});

test("harness inspector reads repo files without writing", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-harness-inspect-"));
  await mkdir(join(repoPath, "plugins", "devflow", ".codex-plugin"), { recursive: true });
  await mkdir(join(repoPath, "plugins", "devflow", "hooks"), { recursive: true });
  await mkdir(join(repoPath, "plugins", "devflow", "skills", "start"), { recursive: true });
  await mkdir(join(repoPath, "plugins", "devflow", "skills", "finish"), { recursive: true });
  await mkdir(join(repoPath, ".devflow"), { recursive: true });
  await writeFile(join(repoPath, "AGENTS.md"), "# Agent Guide\n", "utf8");
  await writeFile(join(repoPath, "plugins", "devflow", ".codex-plugin", "plugin.json"), "{}\n", "utf8");
  await writeFile(join(repoPath, "plugins", "devflow", "hooks", "hooks.json"), "{}\n", "utf8");
  await writeFile(join(repoPath, "plugins", "devflow", "hooks", "session-start.mjs"), "\n", "utf8");
  await writeFile(join(repoPath, "plugins", "devflow", "hooks", "user-prompt-submit.mjs"), "\n", "utf8");
  await writeFile(join(repoPath, "plugins", "devflow", "hooks", "stop.mjs"), "\n", "utf8");
  await writeFile(join(repoPath, "plugins", "devflow", "skills", "start", "SKILL.md"), "# Start\n", "utf8");
  await writeFile(join(repoPath, "plugins", "devflow", "skills", "finish", "SKILL.md"), "# Finish\n", "utf8");
  await writeFile(join(repoPath, "plugins", "devflow", ".mcp.json"), "{}\n", "utf8");
  await writeFile(
    join(repoPath, ".devflow", "config.json"),
    `${JSON.stringify({ review: { required: true }, gates: [{ id: "unit", command: "npm test" }] })}\n`,
    "utf8",
  );

  const summary = await readHarnessInspect(repoPath, {
    targets: ["codex", "claude"],
  });

  assert.equal(summary.command, "harness_inspect");
  assert.equal(summary.targets.codex.status, "ready");
  assert.equal(summary.targets.claude.status, "missing");
  assert.equal(summary.gates.status, "configured");
});

test("harness plan converts inspect findings into dry-run adoption actions", () => {
  const inspect = createHarnessInspectSummary({
    repo: { absolutePath: "C:\\repo" },
    targets: ["codex", "superpowers", "codegraph"],
    existingPaths: ["AGENTS.md"],
    config: {
      gates: [{ id: "docs-check", command: "npm run docs:check" }],
    },
  });
  const plan = createHarnessPlanSummary({ inspect });

  assert.equal(plan.schemaVersion, "0.1");
  assert.equal(plan.command, "harness_plan");
  assert.equal(plan.dryRun, true);
  assert.equal(plan.status, "changes-proposed");
  assert.ok(plan.actions.some((action) => action.target === "codex" && action.action === "create-if-missing"));
  assert.ok(plan.actions.some((action) => action.target === "review" && action.action === "configure-required-review"));
  assert.ok(plan.actions.some((action) => action.target === "superpowers" && action.action === "adopt-optional"));
  assert.ok(plan.actions.some((action) => action.target === "codegraph" && action.action === "skip-optional"));
  assert.ok(plan.actions.every((action) => action.writes === false));
});

test("harness plan reads inspection state without writing files", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-harness-plan-"));
  await writeFile(join(repoPath, "AGENTS.md"), "# Agent Guide\n", "utf8");

  const plan = await readHarnessPlan(repoPath, {
    targets: ["codex", "claude", "codegraph"],
  });

  assert.equal(plan.command, "harness_plan");
  assert.equal(plan.repo.absolutePath, repoPath);
  assert.ok(plan.actions.some((action) => action.target === "codex"));
  assert.ok(plan.actions.some((action) => action.target === "claude"));
  assert.ok(plan.actions.some((action) => action.target === "codegraph" && action.action === "skip-optional"));
  await assert.rejects(() => readFile(join(repoPath, "plugins", "devflow", ".codex-plugin", "plugin.json"), "utf8"), {
    code: "ENOENT",
  });
});

test("harness install writes missing native files only after confirmation", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-harness-install-"));
  await writeFile(join(repoPath, "AGENTS.md"), "# Existing Agent Guide\n", "utf8");

  await assert.rejects(
    () => writeHarnessInstall(repoPath, { targets: ["codex", "claude", "codegraph"] }),
    /requires --confirm/,
  );

  const result = await writeHarnessInstall(repoPath, {
    targets: ["codex", "claude", "codegraph"],
    confirmed: true,
  });
  const agents = await readFile(join(repoPath, "AGENTS.md"), "utf8");
  const codexManifest = JSON.parse(
    await readFile(join(repoPath, "plugins", "devflow", ".codex-plugin", "plugin.json"), "utf8"),
  );
  const claudeManifest = JSON.parse(
    await readFile(join(repoPath, "plugins", "devflow", ".claude-plugin", "plugin.json"), "utf8"),
  );
  const finishSkill = await readFile(join(repoPath, "plugins", "devflow", "skills", "finish", "SKILL.md"), "utf8");
  const stopHook = await readFile(join(repoPath, "plugins", "devflow", "hooks", "stop.mjs"), "utf8");
  const config = JSON.parse(await readFile(join(repoPath, ".devflow", "config.json"), "utf8"));
  const gitignore = await readFile(join(repoPath, ".gitignore"), "utf8");

  assert.equal(result.command, "harness_install");
  assert.equal(result.status, "installed");
  assert.ok(result.written.some((file) => file.path === "plugins/devflow/.codex-plugin/plugin.json"));
  assert.ok(result.written.some((file) => file.path === ".devflow/config.json" && file.target === "review"));
  assert.ok(result.written.some((file) => file.path === ".gitignore"));
  assert.ok(result.ignored.some((action) => action.target === "codegraph" && action.action === "skip-optional"));
  assert.equal(agents, "# Existing Agent Guide\n");
  assert.equal(config.review.required, true);
  assert.equal(codexManifest.name, "devflow");
  assert.equal(claudeManifest.name, "devflow");
  assert.match(finishSkill, /devflow review request/);
  assert.match(finishSkill, /devflow review record/);
  assert.match(finishSkill, /review\.nextAction\.recordCommand/);
  assert.match(stopHook, /devflow review request --work <id>/);
  assert.match(stopHook, /review\.nextAction\.recordCommand/);
  assert.match(gitignore, /^\.devflow\/state\/$/m);
  assert.match(gitignore, /^\.devflow\/next-prompt\.md$/m);
  assert.match(gitignore, /^plugins\/devflow\/$/m);
  await assert.rejects(() => readFile(join(repoPath, ".codegraph"), "utf8"), {
    code: "ENOENT",
  });
});

test("harness install can leave plugin files repo-visible when explicitly requested", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-harness-repo-visible-"));

  await writeHarnessInstall(repoPath, {
    targets: ["codex"],
    confirmed: true,
    repoVisible: true,
  });

  const gitignore = await readFile(join(repoPath, ".gitignore"), "utf8");
  assert.match(gitignore, /^\.devflow\/state\/$/m);
  assert.match(gitignore, /^\.devflow\/next-prompt\.md$/m);
  assert.doesNotMatch(gitignore, /^plugins\/devflow\/$/m);
});

test("harness install preserves existing config while enabling required review", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-harness-config-"));
  await mkdir(join(repoPath, ".devflow"), { recursive: true });
  await writeFile(
    join(repoPath, ".devflow", "config.json"),
    `${JSON.stringify({ gates: [{ id: "unit", command: "npm test" }] }, null, 2)}\n`,
    "utf8",
  );

  const result = await writeHarnessInstall(repoPath, {
    targets: ["codex"],
    confirmed: true,
  });
  const config = JSON.parse(await readFile(join(repoPath, ".devflow", "config.json"), "utf8"));

  assert.equal(result.command, "harness_install");
  assert.equal(config.review.required, true);
  assert.deepEqual(config.gates, [{ id: "unit", command: "npm test" }]);
});

test("harness health validates manifests, hook scripts, MCP config, and gates", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-harness-health-"));
  await writeFile(join(repoPath, "AGENTS.md"), "# Existing Agent Guide\n", "utf8");
  await writeHarnessInstall(repoPath, {
    targets: ["codex", "claude"],
    confirmed: true,
  });
  await mkdir(join(repoPath, ".devflow"), { recursive: true });
  await writeFile(
    join(repoPath, ".devflow", "config.json"),
    `${JSON.stringify({ review: { required: true }, gates: [{ id: "unit", command: "npm test" }] })}\n`,
    "utf8",
  );

  const health = await readHarnessHealth(repoPath, {
    targets: ["codex", "claude"],
  });

  assert.equal(health.schemaVersion, "0.1");
  assert.equal(health.command, "harness_health");
  assert.equal(health.status, "ok");
  assert.ok(health.checks.some((check) => check.kind === "manifest-json" && check.status === "passed"));
  assert.ok(health.checks.some((check) => check.kind === "hook-script" && check.status === "passed"));
  assert.ok(health.checks.some((check) => check.kind === "mcp-config" && check.status === "passed"));
  assert.ok(health.checks.some((check) => check.kind === "review-required" && check.status === "passed"));
  assert.equal(health.gates.status, "configured");
});

test("harness health fails when required review is not configured", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-harness-health-review-"));
  await writeHarnessInstall(repoPath, {
    targets: ["codex"],
    confirmed: true,
  });
  await writeFile(
    join(repoPath, ".devflow", "config.json"),
    `${JSON.stringify({ gates: [{ id: "unit", command: "npm test" }] })}\n`,
    "utf8",
  );

  const health = await readHarnessHealth(repoPath, {
    targets: ["codex"],
  });

  assert.equal(health.status, "failed");
  assert.ok(health.checks.some((check) => (
    check.kind === "review-required" &&
      check.status === "failed" &&
      check.path === ".devflow/config.json"
  )));
});

test("harness health reports invalid manifest JSON as failed", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-harness-health-invalid-"));
  await mkdir(join(repoPath, "plugins", "devflow", ".codex-plugin"), { recursive: true });
  await writeFile(join(repoPath, "AGENTS.md"), "# Agent Guide\n", "utf8");
  await writeFile(join(repoPath, "plugins", "devflow", ".codex-plugin", "plugin.json"), "{bad json\n", "utf8");

  const health = await readHarnessHealth(repoPath, {
    targets: ["codex"],
  });

  assert.equal(health.status, "failed");
  assert.ok(health.checks.some((check) => check.path === "plugins/devflow/.codex-plugin/plugin.json" && check.status === "failed"));
});

test("harness health accepts Claude stop hook decision payloads", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-harness-health-stop-"));
  await writeHarnessInstall(repoPath, {
    targets: ["claude"],
    confirmed: true,
  });
  await writeFile(
    join(repoPath, "plugins", "devflow", "hooks", "stop.mjs"),
    [
      "#!/usr/bin/env node",
      "process.stdout.write(`${JSON.stringify({ decision: 'block', reason: 'verify first' })}\\n`);",
    ].join("\n"),
    "utf8",
  );

  const health = await readHarnessHealth(repoPath, {
    targets: ["claude"],
  });

  assert.equal(health.status, "ok");
  assert.ok(
    health.checks.some(
      (check) =>
        check.path === "plugins/devflow/hooks/stop.mjs" &&
        check.status === "passed" &&
        /valid decision payload/.test(check.message),
    ),
  );
});

test("harness repair restores broken installed harness files only after confirmation", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-harness-repair-"));
  await writeHarnessInstall(repoPath, {
    targets: ["codex", "claude"],
    confirmed: true,
  });
  await writeFile(join(repoPath, "plugins", "devflow", ".codex-plugin", "plugin.json"), "{bad json\n", "utf8");
  await writeFile(join(repoPath, "plugins", "devflow", "hooks", "session-start.mjs"), "process.exit(1);\n", "utf8");

  const failed = await readHarnessHealth(repoPath, {
    targets: ["codex", "claude"],
  });
  assert.equal(failed.status, "failed");

  await assert.rejects(
    () => writeHarnessRepair(repoPath, { targets: ["codex", "claude"] }),
    /requires --confirm/,
  );

  const repaired = await writeHarnessRepair(repoPath, {
    targets: ["codex", "claude"],
    confirmed: true,
  });
  const health = await readHarnessHealth(repoPath, {
    targets: ["codex", "claude"],
  });

  assert.equal(repaired.command, "harness_repair");
  assert.equal(repaired.status, "repaired");
  assert.ok(repaired.repaired.some((file) => file.path === "plugins/devflow/.codex-plugin/plugin.json"));
  assert.ok(repaired.repaired.some((file) => file.path === "plugins/devflow/hooks/session-start.mjs"));
  assert.equal(JSON.parse(await readFile(join(repoPath, "plugins", "devflow", ".codex-plugin", "plugin.json"), "utf8")).name, "devflow");
  assert.equal(health.status, "ok");
});

test("installed session start hook surfaces the latest persisted handoff", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-harness-handoff-"));
  await writeHarnessInstall(repoPath, {
    targets: ["codex"],
    confirmed: true,
  });
  await mkdir(join(repoPath, ".devflow"), { recursive: true });
  await writeFile(
    join(repoPath, ".devflow", "next-prompt.md"),
    "# Next Prompt\n\nContinue from the installed harness handoff.\n",
    "utf8",
  );

  const output = await runInstalledHook(
    repoPath,
    "plugins/devflow/hooks/session-start.mjs",
    {
      hook_event_name: "SessionStart",
      cwd: repoPath,
    },
  );

  assert.match(output.hookSpecificOutput.additionalContext, /Latest handoff prompt/);
  assert.match(output.hookSpecificOutput.additionalContext, /installed harness handoff/);
});

test("harness repair enables required review without dropping existing gates", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-harness-repair-review-"));
  await writeHarnessInstall(repoPath, {
    targets: ["codex"],
    confirmed: true,
  });
  await writeFile(
    join(repoPath, ".devflow", "config.json"),
    `${JSON.stringify({ gates: [{ id: "unit", command: "npm test" }] }, null, 2)}\n`,
    "utf8",
  );

  const failed = await readHarnessHealth(repoPath, {
    targets: ["codex"],
  });
  assert.equal(failed.status, "failed");

  const repaired = await writeHarnessRepair(repoPath, {
    targets: ["codex"],
    confirmed: true,
  });
  const config = JSON.parse(await readFile(join(repoPath, ".devflow", "config.json"), "utf8"));
  const health = await readHarnessHealth(repoPath, {
    targets: ["codex"],
  });

  assert.equal(repaired.status, "repaired");
  assert.ok(repaired.repaired.some((file) => file.path === ".devflow/config.json" && file.kind === "review-required"));
  assert.equal(config.review.required, true);
  assert.deepEqual(config.gates, [{ id: "unit", command: "npm test" }]);
  assert.equal(health.status, "ok");
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

test("work update events can change metadata without changing lifecycle status", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-work-update-"));

  await recordWorkCreatedEvent(repoPath, {
    id: "update-work",
    title: "Original title",
    description: "Original description",
    ownedPaths: ["docs/**"],
  });
  await recordWorkStartedEvent(repoPath, { id: "update-work" });
  const updated = await recordWorkUpdatedEvent(
    repoPath,
    {
      id: "update-work",
      title: "Updated title",
      description: "Updated description",
      ownedPaths: ["packages/core/**", "packages/cli/**"],
    },
    { observedAt: "2026-05-17T09:30:00.000Z" },
  );

  assert.equal(updated.type, "work.updated");
  assert.equal(updated.payload.title, "Updated title");
  assert.deepEqual(updated.payload.ownedPaths, ["packages/core/**", "packages/cli/**"]);

  const state = await readDevflowState(repoPath);
  const item = state.work.items.find((candidate) => candidate.id === "update-work");
  assert.equal(item.title, "Updated title");
  assert.equal(item.description, "Updated description");
  assert.deepEqual(item.ownedPaths, ["packages/core/**", "packages/cli/**"]);
  assert.equal(item.status, "active");
  assert.equal(item.updatedAt, "2026-05-17T09:30:00.000Z");
  assert.equal(state.work.active[0].id, "update-work");
});

test("work rename events update only the title", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-work-rename-"));

  await recordWorkCreatedEvent(repoPath, {
    id: "rename-work",
    title: "Original title",
    description: "Keep description",
    ownedPaths: ["docs/**"],
  });
  await recordWorkStartedEvent(repoPath, { id: "rename-work" });
  const renamed = await recordWorkRenamedEvent(
    repoPath,
    {
      id: "rename-work",
      title: "Renamed title",
    },
    { observedAt: "2026-05-17T09:35:00.000Z" },
  );

  assert.equal(renamed.type, "work.updated");
  assert.equal(renamed.payload.title, "Renamed title");
  assert.equal(renamed.payload.description, undefined);
  assert.equal(renamed.payload.ownedPaths, undefined);

  const state = await readDevflowState(repoPath);
  const item = state.work.items.find((candidate) => candidate.id === "rename-work");
  assert.equal(item.title, "Renamed title");
  assert.equal(item.description, "Keep description");
  assert.deepEqual(item.ownedPaths, ["docs/**"]);
  assert.equal(item.status, "active");
});

test("work lifecycle events can unblock blocked items", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-work-unblock-"));

  await recordWorkCreatedEvent(repoPath, {
    id: "blocked-work",
    title: "Blocked work",
  });
  await recordWorkBlockedEvent(
    repoPath,
    {
      id: "blocked-work",
      reason: "Waiting for review.",
    },
    { observedAt: "2026-05-17T09:21:00.000Z" },
  );
  const unblocked = await recordWorkUnblockedEvent(
    repoPath,
    { id: "blocked-work" },
    { observedAt: "2026-05-17T09:22:00.000Z" },
  );

  assert.equal(unblocked.type, "work.unblocked");
  assert.equal(unblocked.payload.status, "active");

  const state = await readDevflowState(repoPath);
  const status = createStatusSummary({
    repo: { absolutePath: repoPath },
    state,
  });

  assert.equal(state.work.active[0].id, "blocked-work");
  assert.equal(state.work.active[0].blockedReason, null);
  assert.equal(state.work.blocked.length, 0);
  assert.equal(status.work.active[0].id, "blocked-work");
  assert.equal(status.work.blocked.length, 0);
});

test("review events are visible in state and can satisfy finish review requirements", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-review-event-"));

  const event = await recordReviewEvent(
    repoPath,
    {
      workItemId: "reviewed-work",
      reviewer: "Claude Code",
      status: "passed",
      summary: "No blocking findings.",
    },
    { observedAt: "2026-05-17T10:00:00.000Z" },
  );
  const state = await readDevflowState(repoPath);
  const summary = createFinishSummary({
    workItem: { id: "reviewed-work", title: "Reviewed work" },
    intent: "Finish after review evidence.",
    reviewRequired: true,
    reviewEvidence: state.reviews.latestByWorkItemId["reviewed-work"],
  });

  assert.equal(event.type, "review.completed");
  assert.equal(state.reviews.latestByWorkItemId["reviewed-work"].status, "passed");
  assert.equal(summary.canClaimDone, true);
});

test("project health scanner surfaces invalid gates from config", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-health-invalid-"));
  const plan = createInitPlan({
    repo: repoPath,
    profile: "standard",
    platform: "windows-powershell",
  });
  await writeInitPlan(repoPath, plan, { confirmed: true });
  await writeFile(
    join(repoPath, ".devflow", "config.json"),
    `${JSON.stringify({
      gates: [
        { id: "unit", command: "npm test" },
        { id: "unit", command: "" },
      ],
    })}\n`,
  );

  const config = await readDevflowConfig(repoPath);
  const summary = await readProjectHealth(repoPath, config);

  assert.equal(summary.status, "invalid");
  assert.equal(summary.missingFiles.length, 0);
  assert.ok(summary.invalidGates.some((gate) => gate.reason === "duplicate-id"));
  assert.ok(summary.invalidGates.some((gate) => gate.reason === "missing-command"));
});

test("session attach plan proposes confirmation-gated work links", () => {
  const plan = createSessionAttachPlan({
    workItems: [
      {
        id: "phase-6-session-import",
        title: "Phase 6 session import",
        ownedPaths: ["packages/adapters/**", "packages/cli/**"],
      },
    ],
    sessions: [
      {
        sessionId: "high-confidence",
        agent: "Codex",
        project: { confidence: "high" },
        events: [{ type: "git.diff.captured", changedFiles: ["packages/adapters/src/index.js"] }],
      },
      {
        sessionId: "low-confidence",
        agent: "Codex",
        project: { confidence: "low" },
        events: [],
        warnings: ["No cwd metadata was available for this Codex session."],
      },
    ],
  });

  assert.equal(plan.schemaVersion, "0.1");
  assert.equal(plan.command, "session_attach_plan");
  assert.equal(plan.proposals.length, 2);
  assert.equal(plan.proposals[0].sessionId, "high-confidence");
  assert.equal(plan.proposals[0].recommendedWorkItemId, "phase-6-session-import");
  assert.equal(plan.proposals[0].action, "attach-ready");
  assert.equal(plan.proposals[0].requiresConfirmation, false);
  assert.equal(plan.proposals[1].action, "confirmation-required");
  assert.equal(plan.proposals[1].requiresConfirmation, true);
  assert.match(plan.proposals[1].reason, /low confidence/);
});

test("session attach persistence records approved session links", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-session-attach-"));
  const event = await recordSessionAttachedEvent(
    repoPath,
    {
      sessionId: "high-confidence",
      agent: "Codex",
      recommendedWorkItemId: "phase-6-session-import",
      action: "attach-ready",
      requiresConfirmation: false,
      confidence: "high",
      changedFiles: ["packages/adapters/src/index.js"],
      reason: "Session has high confidence.",
      warnings: [],
    },
    {
      confirmed: true,
      observedAt: "2026-05-16T12:00:00+09:00",
    },
  );

  const state = await readDevflowState(repoPath);

  assert.equal(event.type, "session.attached");
  assert.equal(event.payload.sessionId, "high-confidence");
  assert.equal(event.payload.workItemId, "phase-6-session-import");
  assert.equal(state.sessions.attached[0].sessionId, "high-confidence");
  assert.equal(state.sessions.attached[0].workItemId, "phase-6-session-import");
});

test("session attach persistence reports existing links without duplicate events", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-session-attach-dedupe-"));
  const proposal = {
    sessionId: "high-confidence",
    agent: "Codex",
    recommendedWorkItemId: "phase-6-session-import",
    action: "attach-ready",
    requiresConfirmation: false,
    confidence: "high",
    changedFiles: ["packages/adapters/src/index.js"],
    reason: "Session has high confidence.",
    warnings: [],
  };

  await recordSessionAttachedEvent(repoPath, proposal, {
    confirmed: true,
    observedAt: "2026-05-16T12:00:00+09:00",
  });
  const second = await recordSessionAttachedEvent(repoPath, proposal, {
    confirmed: true,
    observedAt: "2026-05-16T12:01:00+09:00",
  });

  const log = await readFile(join(repoPath, ".devflow", "state", "events.jsonl"), "utf8");

  assert.equal(log.trim().split("\n").length, 1);
  assert.equal(second.existing, true);
  assert.equal(second.observedAt, "2026-05-16T12:00:00+09:00");
});

test("session attach persistence requires explicit confirmation", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-session-attach-confirm-"));

  await assert.rejects(
    () =>
      recordSessionAttachedEvent(repoPath, {
        sessionId: "low-confidence",
        recommendedWorkItemId: "phase-6-session-import",
        requiresConfirmation: true,
        confidence: "low",
      }),
    /requires explicit confirmation/,
  );
});

test("session list summary renders attached session evidence", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-session-list-"));
  await recordSessionAttachedEvent(
    repoPath,
    {
      sessionId: "high-confidence",
      agent: "Codex",
      recommendedWorkItemId: "phase-6-session-import",
      action: "attach-ready",
      requiresConfirmation: false,
      confidence: "high",
      changedFiles: ["packages/adapters/src/index.js"],
      reason: "Session has high confidence.",
      warnings: [],
    },
    {
      confirmed: true,
      observedAt: "2026-05-16T12:00:00+09:00",
    },
  );

  const state = await readDevflowState(repoPath);
  const summary = createSessionListSummary({
    repo: { absolutePath: repoPath },
    state,
  });

  assert.equal(summary.command, "session_list");
  assert.equal(summary.repo.absolutePath, repoPath);
  assert.equal(summary.count, 1);
  assert.equal(summary.sessions[0].sessionId, "high-confidence");
  assert.equal(summary.sessions[0].workItemId, "phase-6-session-import");
  assert.equal(summary.sessions[0].agent, "Codex");
});

test("manual session note persistence appears in session list state", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-manual-session-note-"));
  const event = await recordManualSessionNoteEvent(
    repoPath,
    {
      workItemId: "phase-6-session-import",
      agent: "manual",
      summary: "Reviewed local session context outside an agent transcript.",
    },
    {
      observedAt: "2026-05-16T13:00:00+09:00",
    },
  );

  const state = await readDevflowState(repoPath);
  const summary = createSessionListSummary({
    repo: { absolutePath: repoPath },
    state,
  });

  assert.equal(event.type, "session.message");
  assert.equal(event.payload.workItemId, "phase-6-session-import");
  assert.equal(summary.sessions[0].agent, "manual");
  assert.equal(summary.sessions[0].kind, "manual-note");
  assert.match(summary.sessions[0].summary, /Reviewed local session context/);
});

test("session list summary filters by work item", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-session-list-filter-"));
  await recordManualSessionNoteEvent(repoPath, {
    workItemId: "phase-6-session-import",
    agent: "manual",
    summary: "Session import note.",
  });
  await recordManualSessionNoteEvent(repoPath, {
    workItemId: "phase-7-beginner-guidance",
    agent: "manual",
    summary: "Beginner guidance note.",
  });

  const state = await readDevflowState(repoPath);
  const summary = createSessionListSummary({
    repo: { absolutePath: repoPath },
    state,
    workItemId: "phase-6-session-import",
  });

  assert.equal(summary.count, 1);
  assert.equal(summary.filters.workItemId, "phase-6-session-import");
  assert.equal(summary.sessions[0].workItemId, "phase-6-session-import");
});

test("session list summary limits after work item filtering", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-session-list-limit-"));
  await recordManualSessionNoteEvent(repoPath, {
    workItemId: "phase-6-session-import",
    agent: "manual",
    summary: "First import note.",
  });
  await recordManualSessionNoteEvent(repoPath, {
    workItemId: "phase-7-beginner-guidance",
    agent: "manual",
    summary: "Beginner guidance note.",
  });
  await recordManualSessionNoteEvent(repoPath, {
    workItemId: "phase-6-session-import",
    agent: "manual",
    summary: "Second import note.",
  });

  const state = await readDevflowState(repoPath);
  const summary = createSessionListSummary({
    repo: { absolutePath: repoPath },
    state,
    workItemId: "phase-6-session-import",
    limit: 1,
  });

  assert.equal(summary.count, 1);
  assert.equal(summary.totalCount, 2);
  assert.equal(summary.filters.workItemId, "phase-6-session-import");
  assert.equal(summary.filters.limit, 1);
  assert.match(summary.sessions[0].summary, /Second import note/);
});

test("session list summary filters by agent before work item and limit", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-session-list-agent-"));
  await recordManualSessionNoteEvent(repoPath, {
    workItemId: "phase-6-session-import",
    agent: "manual",
    summary: "Manual import note.",
  });
  await recordManualSessionNoteEvent(repoPath, {
    workItemId: "phase-6-session-import",
    agent: "Codex",
    summary: "First Codex import note.",
  });
  await recordManualSessionNoteEvent(repoPath, {
    workItemId: "phase-6-session-import",
    agent: "Codex",
    summary: "Second Codex import note.",
  });

  const state = await readDevflowState(repoPath);
  const summary = createSessionListSummary({
    repo: { absolutePath: repoPath },
    state,
    agent: "Codex",
    workItemId: "phase-6-session-import",
    limit: 1,
  });

  assert.equal(summary.count, 1);
  assert.equal(summary.totalCount, 2);
  assert.equal(summary.filters.agent, "Codex");
  assert.equal(summary.sessions[0].agent, "Codex");
  assert.match(summary.sessions[0].summary, /Second Codex import note/);
});

test("session list summary filters by observed time before limit", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-session-list-since-"));
  await recordManualSessionNoteEvent(
    repoPath,
    {
      workItemId: "phase-6-session-import",
      agent: "Codex",
      summary: "Old Codex note.",
    },
    { observedAt: "2026-05-15T00:00:00.000Z" },
  );
  await recordManualSessionNoteEvent(
    repoPath,
    {
      workItemId: "phase-6-session-import",
      agent: "Codex",
      summary: "New Codex note.",
    },
    { observedAt: "2026-05-16T00:00:00.000Z" },
  );

  const state = await readDevflowState(repoPath);
  const summary = createSessionListSummary({
    repo: { absolutePath: repoPath },
    state,
    agent: "Codex",
    workItemId: "phase-6-session-import",
    since: "2026-05-15T12:00:00.000Z",
    limit: 1,
  });

  assert.equal(summary.count, 1);
  assert.equal(summary.totalCount, 1);
  assert.equal(summary.filters.since, "2026-05-15T12:00:00.000Z");
  assert.match(summary.sessions[0].summary, /New Codex note/);
});

test("session list summary sorts by observed time before limit", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-session-list-sort-"));
  await recordManualSessionNoteEvent(
    repoPath,
    {
      workItemId: "phase-6-session-import",
      agent: "Codex",
      summary: "Middle Codex note.",
    },
    { observedAt: "2026-05-16T00:00:00.000Z" },
  );
  await recordManualSessionNoteEvent(
    repoPath,
    {
      workItemId: "phase-6-session-import",
      agent: "Codex",
      summary: "Old Codex note.",
    },
    { observedAt: "2026-05-15T00:00:00.000Z" },
  );
  await recordManualSessionNoteEvent(
    repoPath,
    {
      workItemId: "phase-6-session-import",
      agent: "Codex",
      summary: "New Codex note.",
    },
    { observedAt: "2026-05-17T00:00:00.000Z" },
  );

  const state = await readDevflowState(repoPath);
  const ascending = createSessionListSummary({
    repo: { absolutePath: repoPath },
    state,
    sort: "observedAt:asc",
  });
  const descendingLimited = createSessionListSummary({
    repo: { absolutePath: repoPath },
    state,
    sort: "observedAt:desc",
    limit: 1,
  });

  assert.deepEqual(
    ascending.sessions.map((session) => session.summary),
    ["Old Codex note.", "Middle Codex note.", "New Codex note."],
  );
  assert.equal(ascending.filters.sort, "observedAt:asc");
  assert.equal(descendingLimited.count, 1);
  assert.equal(descendingLimited.totalCount, 3);
  assert.equal(descendingLimited.filters.sort, "observedAt:desc");
  assert.match(descendingLimited.sessions[0].summary, /New Codex note/);
});

test("session list option parsers share CLI and MCP validation rules", () => {
  assert.equal(parseSessionListLimit(undefined, "limit is required"), null);
  assert.equal(parseSessionListLimit("3", "limit is invalid"), 3);
  assert.equal(parseSessionListSince("", "since is invalid"), null);
  assert.equal(parseSessionListSince("2026-05-16T00:00:00.000Z", "since is invalid"), "2026-05-16T00:00:00.000Z");
  assert.equal(parseSessionListSort(null, "sort is invalid"), null);
  assert.equal(parseSessionListSort("observedAt:desc", "sort is invalid"), "observedAt:desc");

  assert.throws(() => parseSessionListLimit("0", "limit is invalid"), /limit is invalid/);
  assert.throws(() => parseSessionListSince("not-a-date", "since is invalid"), /since is invalid/);
  assert.throws(() => parseSessionListSort("observedAt:newest", "sort is invalid"), /sort is invalid/);
});

test("term explanation translates beginner-facing development terms", () => {
  const explanation = createTermExplanation({
    term: "toast notification",
    context: "Agent said the save action should show a toast notification.",
  });

  assert.equal(explanation.schemaVersion, "0.1");
  assert.equal(explanation.command, "explain");
  assert.equal(explanation.term, "toast notification");
  assert.match(explanation.plainExplanation, /small message/);
  assert.match(explanation.projectContext, /save action/);
  assert.ok(explanation.relatedTerms.includes("modal"));
});

test("split plan creates disjoint worktree sessions with prompts and commands", () => {
  const plan = createSplitPlan({
    runId: "2026-05-16-devflow-next",
    goal: "Continue Devflow Native MCP work.",
    sessionCount: 2,
    profile: "standard",
    platform: "windows-powershell",
    baseRef: "origin/main",
    tasks: [
      {
        id: "mcp-split-tool",
        role: "implementation",
        ownedPaths: ["packages/mcp/**", "packages/core/**"],
        avoidPaths: ["packages/web/**"],
        verification: [{ cwd: ".", command: "npm test" }],
      },
      {
        id: "docs-split-contract",
        role: "audit",
        ownedPaths: ["docs/**"],
        avoidPaths: ["packages/**"],
        verification: [{ cwd: ".", command: "npm run docs:check" }],
      },
    ],
  });

  assert.equal(plan.schemaVersion, "0.1");
  assert.equal(plan.command, "split");
  assert.equal(plan.platform.name, "windows-powershell");
  assert.equal(plan.sessions.length, 2);
  assert.equal(plan.sessions[0].branch, "codex/mcp-split-tool");
  assert.equal(plan.sessions[0].worktreePath, ".worktrees/mcp-split-tool");
  assert.match(plan.sessions[0].commands[0].variants.powershell, /git worktree add/);
  assert.match(plan.sessions[0].prompt, /packages\/mcp\/\*\*/);
  assert.deepEqual(plan.mergeOrder, ["docs-split-contract", "mcp-split-tool"]);
  assert.equal(plan.collisionRisks.length, 0);
});

test("split plan can derive project-specific tasks from devflow config", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-config-"));
  await mkdir(join(repoPath, ".devflow"), { recursive: true });
  await writeFile(
    join(repoPath, ".devflow", "config.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        defaultProfile: "superpowers",
        defaultPlatform: "windows-powershell",
        split: {
          tasks: [
            {
              id: "configured-api",
              role: "implementation",
              ownedPaths: ["apps/api/**"],
              avoidPaths: ["apps/web/**"],
              verification: [{ cwd: "apps/api", command: "npm test" }],
            },
            {
              id: "configured-docs",
              role: "audit",
              ownedPaths: ["docs/**"],
              avoidPaths: ["apps/**"],
              verification: [{ cwd: ".", command: "npm run docs:check" }],
            },
          ],
        },
      },
      null,
      2,
    )}\n`,
  );

  const config = await readDevflowConfig(repoPath);
  const plan = createSplitPlan({
    goal: "Use configured split tasks.",
    config,
  });

  assert.equal(plan.profile.name, "superpowers");
  assert.equal(plan.sessions[0].id, "configured-api");
  assert.deepEqual(plan.sessions[0].ownedPaths, ["apps/api/**"]);
  assert.equal(plan.sessions[0].verification[0].cwd, "apps/api");
  assert.deepEqual(plan.mergeOrder, ["configured-docs", "configured-api"]);
});

test("split sessions can be registered as active work items", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-split-register-"));
  const plan = createSplitPlan({
    goal: "Connect split tasks to work registry",
    tasks: [
      {
        id: "core-cli",
        goal: "Wire CLI split registration.",
        ownedPaths: ["packages/core/**", "packages/cli/**"],
      },
      {
        id: "mcp-docs",
        goal: "Expose split registration through MCP and docs.",
        ownedPaths: ["packages/mcp/**", "docs/**"],
      },
    ],
  });

  const registration = await recordSplitWorkEvents(repoPath, plan, {
    start: true,
    observedAt: "2026-05-17T09:00:00.000Z",
  });
  const state = await readDevflowState(repoPath);
  const list = createWorkListSummary({
    repo: { absolutePath: repoPath },
    state,
  });

  assert.equal(registration.command, "split_register");
  assert.equal(registration.created.length, 2);
  assert.equal(registration.started.length, 2);
  assert.deepEqual(
    list.items.map((item) => item.id),
    ["core-cli", "mcp-docs"],
  );
  assert.deepEqual(list.items[0].ownedPaths, ["packages/core/**", "packages/cli/**"]);
  assert.equal(list.items[0].status, "active");
  assert.equal(list.items[1].title, "Expose split registration through MCP and docs.");
});

test("split registration does not append duplicate work created events", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-split-idempotent-"));
  const plan = createSplitPlan({
    goal: "Idempotent split registration",
    tasks: [
      {
        id: "core-cli",
        goal: "Wire CLI split registration.",
        ownedPaths: ["packages/core/**", "packages/cli/**"],
      },
    ],
  });

  await recordSplitWorkEvents(repoPath, plan, {
    start: true,
    observedAt: "2026-05-17T09:12:00.000Z",
  });
  const second = await recordSplitWorkEvents(repoPath, plan, {
    start: true,
    observedAt: "2026-05-17T09:13:00.000Z",
  });

  assert.equal(second.created[0].existing, true);

  const log = await readFile(join(repoPath, ".devflow", "state", "events.jsonl"), "utf8");
  const lines = log.trim().split("\n");
  assert.equal(lines.filter((line) => line.includes('"type":"work.created"')).length, 1);
  assert.equal(lines.filter((line) => line.includes('"type":"work.started"')).length, 1);
});

test("split plan surfaces invalid config warnings while falling back to defaults", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-invalid-config-"));
  await mkdir(join(repoPath, ".devflow"), { recursive: true });
  await writeFile(join(repoPath, ".devflow", "config.json"), "{ invalid json\n");

  const config = await readDevflowConfig(repoPath);
  const plan = createSplitPlan({
    goal: "Fallback from invalid config.",
    config,
  });

  assert.equal(plan.sessions[0].id, "implementation");
  assert.match(plan.warnings[0], /Ignoring invalid .devflow\/config.json/);
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

test("finish persistence writes latest next prompt projection", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-finish-next-prompt-"));
  const summary = createFinishSummary({
    workItem: {
      id: "handoff-persistence",
      title: "Handoff persistence",
    },
    intent: "Persist next prompt for the next agent session.",
    changedFiles: [{ path: "packages/core/src/index.js", status: "modified" }],
    gates: [{ id: "unit", command: "node --test", status: "passed" }],
    nextTask: "Read latest handoff through MCP.",
  });

  await recordFinishEvent(repoPath, summary, {
    observedAt: "2026-05-27T10:00:00.000Z",
  });

  const eventLog = await readFile(join(repoPath, ".devflow", "state", "events.jsonl"), "utf8");
  const projection = await readFile(join(repoPath, ".devflow", "next-prompt.md"), "utf8");
  const latest = await readLatestHandoff(repoPath);

  assert.match(eventLog, /"type":"work.completed"/);
  assert.match(projection, /Persist next prompt for the next agent session/);
  assert.match(projection, /Read latest handoff through MCP/);
  assert.equal(latest.command, "handoff_latest");
  assert.equal(latest.handoff.workItemId, "handoff-persistence");
  assert.equal(latest.path, ".devflow/next-prompt.md");
  assert.equal(latest.prompt, projection);
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

test("status summary can focus attached sessions by work item", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-status-work-filter-"));
  await recordManualSessionNoteEvent(
    repoPath,
    {
      workItemId: "phase-6-session-import",
      agent: "Codex",
      summary: "Session import note.",
    },
    { observedAt: "2026-05-16T10:00:00.000Z" },
  );
  await recordManualSessionNoteEvent(
    repoPath,
    {
      workItemId: "phase-7-beginner-guidance",
      agent: "Codex",
      summary: "Beginner guidance note.",
    },
    { observedAt: "2026-05-16T11:00:00.000Z" },
  );

  const state = await readDevflowState(repoPath);
  const status = createStatusSummary({
    repo: { absolutePath: repoPath, branch: "main" },
    state,
    workItemId: "phase-6-session-import",
  });

  assert.equal(status.filters.workItemId, "phase-6-session-import");
  assert.equal(status.sessions.attached.length, 1);
  assert.equal(status.sessions.attached[0].workItemId, "phase-6-session-import");
  assert.match(status.sessions.attached[0].summary, /Session import note/);
});

test("status summary can focus attached sessions by agent", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-status-agent-filter-"));
  await recordManualSessionNoteEvent(
    repoPath,
    {
      workItemId: "phase-6-session-import",
      agent: "Codex",
      summary: "Codex import note.",
    },
    { observedAt: "2026-05-16T10:00:00.000Z" },
  );
  await recordManualSessionNoteEvent(
    repoPath,
    {
      workItemId: "phase-6-session-import",
      agent: "manual",
      summary: "Manual import note.",
    },
    { observedAt: "2026-05-16T11:00:00.000Z" },
  );

  const state = await readDevflowState(repoPath);
  const status = createStatusSummary({
    repo: { absolutePath: repoPath, branch: "main" },
    state,
    agent: "Codex",
  });

  assert.equal(status.filters.agent, "Codex");
  assert.equal(status.sessions.attached.length, 1);
  assert.equal(status.sessions.attached[0].agent, "Codex");
  assert.match(status.sessions.attached[0].summary, /Codex import note/);
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

test("devflow state keeps latest gate evidence indexed by work item", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-gate-scope-"));

  await recordGateEvent(
    repoPath,
    {
      id: "unit",
      command: "npm test",
      status: "passed",
      workItemId: "other-work",
    },
    { observedAt: "2026-05-16T10:00:00+09:00" },
  );
  await recordGateEvent(
    repoPath,
    {
      id: "unit",
      command: "npm test",
      status: "passed",
      workItemId: "target-work",
    },
    { observedAt: "2026-05-16T11:00:00+09:00" },
  );

  const state = await readDevflowState(repoPath);

  assert.equal(state.gates.latestById.unit.workItemId, "target-work");
  assert.equal(state.gates.latestByWorkItemId["other-work"].unit.workItemId, "other-work");
  assert.equal(state.gates.latestByWorkItemId["target-work"].unit.workItemId, "target-work");
});

test("configured gate runner executes a configured command and records evidence", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-gate-run-"));
  const scriptPath = join(repoPath, "gate-script.mjs");
  await writeFile(
    scriptPath,
    "console.log('gate stdout line'); console.error('gate stderr line');\n",
    "utf8",
  );

  const summary = await runConfiguredGate(repoPath, {
    id: "unit",
    gates: [{ id: "unit", command: `${JSON.stringify(process.execPath)} ${JSON.stringify(scriptPath)}` }],
  });

  assert.equal(summary.command, "gates_run");
  assert.equal(summary.gate.id, "unit");
  assert.equal(summary.status, "passed");
  assert.equal(summary.exitCode, 0);
  assert.match(summary.stdout.summary, /gate stdout line/);
  assert.match(summary.stderr.summary, /gate stderr line/);

  const state = await readDevflowState(repoPath);
  const status = createStatusSummary({
    repo: { absolutePath: repoPath },
    state,
    gates: [{ id: "unit", command: "node gate-script.mjs", recommended: true }],
  });
  assert.equal(status.gates[0].lastRun.status, "passed");
  assert.equal(status.gates[0].lastRun.exitCode, 0);

  const log = await readFile(join(repoPath, ".devflow", "state", "events.jsonl"), "utf8");
  assert.match(log, /"type":"gate.finished"/);
  assert.match(log, /gate stdout line/);
});

test("configured gate runner records failed command evidence", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-gate-run-fail-"));
  const scriptPath = join(repoPath, "gate-fail.mjs");
  await writeFile(scriptPath, "console.error('gate failed'); process.exit(7);\n", "utf8");

  const summary = await runConfiguredGate(repoPath, {
    id: "unit",
    gates: [{ id: "unit", command: `${JSON.stringify(process.execPath)} ${JSON.stringify(scriptPath)}` }],
  });

  assert.equal(summary.status, "failed");
  assert.equal(summary.exitCode, 7);
  assert.match(summary.stderr.summary, /gate failed/);

  const log = await readFile(join(repoPath, ".devflow", "state", "events.jsonl"), "utf8");
  assert.match(log, /"status":"failed"/);
  assert.match(log, /"exitCode":7/);
});

test("doctor summary renders platform rules and repeated mistake memory", () => {
  const summary = createDoctorSummary({
    repo: {
      absolutePath: "C:\\Users\\You\\Documents\\GitHub\\devflow-demo",
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

async function runInstalledHook(repoPath, path, payload) {
  const child = spawn(process.execPath, [join(repoPath, path)], {
    cwd: repoPath,
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
  });
  let stdout = "";
  let stderr = "";

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  child.stdin.end(`${JSON.stringify(payload)}\n`);

  const exitCode = await new Promise((resolve) => {
    child.on("close", resolve);
  });

  assert.equal(exitCode, 0, stderr);
  return JSON.parse(stdout);
}
