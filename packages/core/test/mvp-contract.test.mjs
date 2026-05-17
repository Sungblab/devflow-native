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
  recordGateEvent,
  recordFinishEvent,
  writeInitPlan,
  recordManualSessionNoteEvent,
  recordSessionAttachedEvent,
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
    goal: "Continue Solo Devflow OS MCP work.",
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
