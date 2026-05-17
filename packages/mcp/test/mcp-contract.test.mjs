import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { callTool, listTools } from "../src/index.js";

test("MCP lists initial devflow tools", () => {
  const tools = listTools();
  const names = tools.map((tool) => tool.name);

  assert.ok(names.includes("devflow.doctor"));
  assert.ok(names.includes("devflow.status"));
  assert.ok(names.includes("devflow.health"));
  assert.ok(names.includes("devflow.finish"));
  assert.ok(names.includes("devflow.next_prompt"));
  assert.ok(names.includes("devflow.record_gate"));
  assert.ok(names.includes("devflow.gates_run"));
  assert.ok(names.includes("devflow.split"));
  assert.ok(names.includes("devflow.explain_term"));
  assert.ok(names.includes("devflow.rewrite_prompt"));
  assert.ok(names.includes("devflow.sessions_codex"));
  assert.ok(names.includes("devflow.sessions_attach_plan"));
  assert.ok(names.includes("devflow.sessions_attach"));
  assert.ok(names.includes("devflow.sessions_list"));
  assert.ok(names.includes("devflow.sessions_note"));
  assert.ok(names.includes("devflow.work_create"));
  assert.ok(names.includes("devflow.work_start"));
  assert.ok(names.includes("devflow.work_list"));
});

test("MCP health reports missing scaffold files", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-health-"));
  const result = await callTool("devflow.health", {
    repo: repoPath,
  });

  assert.equal(result.structuredContent.command, "health");
  assert.equal(result.structuredContent.status, "missing");
  assert.ok(result.structuredContent.missingFiles.some((file) => file.path === ".devflow/config.json"));
  assert.match(result.content[0].text, /health/);
});

test("MCP status reads configured gates from devflow config", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-status-config-gates-"));
  await mkdir(join(repoPath, ".devflow"), { recursive: true });
  await writeFile(
    join(repoPath, ".devflow", "config.json"),
    `${JSON.stringify({
      gates: [{ id: "custom", command: "npm run custom" }],
    })}\n`,
  );

  const result = await callTool("devflow.status", {
    repo: repoPath,
  });

  assert.equal(result.structuredContent.gates[0].id, "custom");
  assert.equal(result.structuredContent.gates[0].command, "npm run custom");
});

test("MCP health reports invalid configured gates", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-health-invalid-"));
  await mkdir(join(repoPath, ".devflow"), { recursive: true });
  await writeFile(join(repoPath, ".devflow", "config.json"), "{}\n");
  await mkdir(join(repoPath, "docs", "contributing"), { recursive: true });
  await mkdir(join(repoPath, "docs", "testing"), { recursive: true });
  await mkdir(join(repoPath, "docs", "architecture", "maps"), { recursive: true });
  await writeFile(join(repoPath, "AGENTS.md"), "# Agent Guide\n");
  await writeFile(join(repoPath, "docs", "README.md"), "# Project Contract\n");
  await writeFile(join(repoPath, "docs", "contributing", "workflow.md"), "# Workflow\n");
  await writeFile(join(repoPath, "docs", "testing", "strategy.md"), "# Testing\n");
  await writeFile(join(repoPath, "docs", "architecture", "maps", "README.md"), "# Maps\n");
  await writeFile(
    join(repoPath, ".devflow", "config.json"),
    `${JSON.stringify({
      gates: [
        { id: "unit", command: "npm test" },
        { id: "unit", command: "" },
      ],
    })}\n`,
  );

  const result = await callTool("devflow.health", {
    repo: repoPath,
  });

  assert.equal(result.structuredContent.status, "invalid");
  assert.ok(result.structuredContent.invalidGates.some((gate) => gate.reason === "duplicate-id"));
  assert.ok(result.structuredContent.invalidGates.some((gate) => gate.reason === "missing-command"));
  assert.match(result.content[0].text, /invalid/);
});

test("MCP status returns local repo state and latest handoff evidence", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-status-"));
  await callTool("devflow.finish", {
    repo: repoPath,
    work: "status-source",
    title: "Status source",
    intent: "Seed status evidence.",
    gates: [{ id: "unit", command: "npm test", status: "passed" }],
    nextTask: "Read status through MCP.",
  });

  const result = await callTool("devflow.status", {
    repo: repoPath,
    changedFiles: [{ path: "packages/mcp/src/index.js", status: "modified" }],
  });

  assert.equal(result.structuredContent.command, "status");
  assert.equal(result.structuredContent.repo.absolutePath, repoPath);
  assert.equal(result.structuredContent.git.changedFiles[0].path, "packages/mcp/src/index.js");
  assert.equal(result.structuredContent.handoffs.latest.workItemId, "status-source");
  assert.match(result.content[0].text, /status/);
});

test("MCP status can focus attached sessions by work item", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-status-work-"));
  await callTool("devflow.sessions_note", {
    repo: repoPath,
    work: "phase-6-session-import",
    agent: "Codex",
    summary: "Session import note.",
  });
  await callTool("devflow.sessions_note", {
    repo: repoPath,
    work: "phase-7-beginner-guidance",
    agent: "Codex",
    summary: "Beginner guidance note.",
  });

  const result = await callTool("devflow.status", {
    repo: repoPath,
    work: "phase-6-session-import",
  });

  assert.equal(result.structuredContent.filters.workItemId, "phase-6-session-import");
  assert.equal(result.structuredContent.sessions.attached.length, 1);
  assert.equal(result.structuredContent.sessions.attached[0].workItemId, "phase-6-session-import");
  assert.match(result.structuredContent.sessions.attached[0].summary, /Session import note/);
});

test("MCP status can focus attached sessions by agent", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-status-agent-"));
  await callTool("devflow.sessions_note", {
    repo: repoPath,
    work: "phase-6-session-import",
    agent: "Codex",
    summary: "Codex import note.",
  });
  await callTool("devflow.sessions_note", {
    repo: repoPath,
    work: "phase-6-session-import",
    agent: "manual",
    summary: "Manual import note.",
  });

  const result = await callTool("devflow.status", {
    repo: repoPath,
    agent: "Codex",
  });

  assert.equal(result.structuredContent.filters.agent, "Codex");
  assert.equal(result.structuredContent.sessions.attached.length, 1);
  assert.equal(result.structuredContent.sessions.attached[0].agent, "Codex");
  assert.match(result.structuredContent.sessions.attached[0].summary, /Codex import note/);
});

test("MCP doctor returns the same structured execution contract", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-doctor-"));
  const result = await callTool("devflow.doctor", {
    repo: repoPath,
    platform: "windows-powershell",
  });

  assert.equal(result.structuredContent.command, "doctor");
  assert.equal(result.structuredContent.platform.name, "windows-powershell");
  assert.equal(
    result.structuredContent.executionContract.preferredReadCommand,
    "Get-Content -LiteralPath",
  );
  assert.match(result.content[0].text, /doctor/);
});

test("MCP finish records evidence into local state", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-finish-"));
  const result = await callTool("devflow.finish", {
    repo: repoPath,
    work: "mcp-finish",
    title: "MCP finish",
    intent: "Record finish evidence from MCP.",
    gates: [{ id: "unit", command: "npm test", status: "passed" }],
    risks: ["No stdio transport yet."],
    nextTask: "Add stdio MCP protocol transport.",
  });

  assert.equal(result.structuredContent.command, "finish");
  assert.equal(result.structuredContent.workItem.id, "mcp-finish");
  assert.match(result.structuredContent.nextSession.prompt, /stdio MCP protocol/);

  const log = await readFile(join(repoPath, ".devflow", "state", "events.jsonl"), "utf8");
  assert.match(log, /"type":"work.completed"/);
  assert.match(log, /mcp-finish/);
});

test("MCP record_gate records standalone gate evidence", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-record-gate-"));
  const result = await callTool("devflow.record_gate", {
    repo: repoPath,
    id: "docs",
    command: "npm run docs:check",
    status: "passed",
    summary: "Documentation link check passed.",
    workItemId: "docs-check",
  });

  assert.equal(result.structuredContent.command, "record_gate");
  assert.equal(result.structuredContent.gate.id, "docs");
  assert.equal(result.structuredContent.gate.status, "passed");
  assert.match(result.content[0].text, /record_gate/);

  const status = await callTool("devflow.status", {
    repo: repoPath,
    gates: [{ id: "docs", command: "npm run docs:check", recommended: true }],
  });

  assert.equal(status.structuredContent.gates[0].lastRun.status, "passed");
  assert.equal(status.structuredContent.gates[0].lastRun.workItemId, "docs-check");

  const log = await readFile(join(repoPath, ".devflow", "state", "events.jsonl"), "utf8");
  assert.match(log, /"type":"gate.finished"/);
  assert.match(log, /docs-check/);
});

test("MCP work tools create, start, and list work items", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-work-"));
  const created = await callTool("devflow.work_create", {
    repo: repoPath,
    id: "phase-3-work-registry",
    title: "Phase 3 work registry",
    ownedPaths: ["packages/core/**", "packages/mcp/**"],
  });
  const started = await callTool("devflow.work_start", {
    repo: repoPath,
    id: "phase-3-work-registry",
  });
  const listed = await callTool("devflow.work_list", {
    repo: repoPath,
  });

  assert.equal(created.structuredContent.command, "work_create");
  assert.equal(started.structuredContent.command, "work_start");
  assert.equal(listed.structuredContent.command, "work_list");
  assert.equal(listed.structuredContent.items[0].status, "active");
  assert.deepEqual(listed.structuredContent.items[0].ownedPaths, ["packages/core/**", "packages/mcp/**"]);
});

test("MCP work_create is idempotent for existing ids", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-work-idempotent-"));
  await callTool("devflow.work_create", {
    repo: repoPath,
    id: "duplicate-safe",
    title: "Duplicate safe",
  });
  const repeated = await callTool("devflow.work_create", {
    repo: repoPath,
    id: "duplicate-safe",
    title: "Changed title",
  });

  assert.equal(repeated.structuredContent.event.existing, true);
  assert.equal(repeated.structuredContent.workItem.title, "Duplicate safe");

  const log = await readFile(join(repoPath, ".devflow", "state", "events.jsonl"), "utf8");
  assert.equal(log.trim().split("\n").length, 1);
});

test("MCP work lifecycle tools mark items ready and blocked", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-work-lifecycle-"));
  await callTool("devflow.work_create", {
    repo: repoPath,
    id: "ready-work",
    title: "Ready work",
  });
  await callTool("devflow.work_create", {
    repo: repoPath,
    id: "blocked-work",
    title: "Blocked work",
  });

  const ready = await callTool("devflow.work_ready", {
    repo: repoPath,
    id: "ready-work",
  });
  const blocked = await callTool("devflow.work_block", {
    repo: repoPath,
    id: "blocked-work",
    reason: "Waiting for review.",
  });
  const status = await callTool("devflow.status", {
    repo: repoPath,
  });

  assert.equal(ready.structuredContent.command, "work_ready");
  assert.equal(blocked.structuredContent.command, "work_block");
  assert.equal(status.structuredContent.work.readyToFinish[0].id, "ready-work");
  assert.equal(status.structuredContent.work.blocked[0].id, "blocked-work");
  assert.equal(status.structuredContent.work.blocked[0].blockedReason, "Waiting for review.");
});

test("MCP dashboard renders active work view", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-dashboard-"));
  await callTool("devflow.work_create", {
    repo: repoPath,
    id: "active-work",
    title: "Active work",
  });
  await callTool("devflow.work_create", {
    repo: repoPath,
    id: "ready-work",
    title: "Ready work",
  });
  await callTool("devflow.work_start", {
    repo: repoPath,
    id: "active-work",
  });
  await callTool("devflow.work_ready", {
    repo: repoPath,
    id: "ready-work",
  });

  const dashboard = await callTool("devflow.dashboard", {
    repo: repoPath,
  });

  assert.equal(dashboard.structuredContent.command, "dashboard");
  assert.equal(dashboard.structuredContent.work.counts.active, 1);
  assert.equal(dashboard.structuredContent.work.counts.readyToFinish, 1);
  assert.equal(dashboard.structuredContent.work.active[0].id, "active-work");
  assert.equal(dashboard.structuredContent.work.readyToFinish[0].id, "ready-work");
});

test("MCP gates_run executes configured gate and records evidence", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-gates-run-"));
  const scriptPath = join(repoPath, "gate-script.mjs");
  await mkdir(join(repoPath, ".devflow"), { recursive: true });
  await writeFile(scriptPath, "console.log('mcp gate stdout');\n", "utf8");
  await writeFile(
    join(repoPath, ".devflow", "config.json"),
    `${JSON.stringify({
      gates: [{ id: "unit", command: `${JSON.stringify(process.execPath)} ${JSON.stringify(scriptPath)}` }],
    })}\n`,
    "utf8",
  );

  const result = await callTool("devflow.gates_run", {
    repo: repoPath,
    id: "unit",
  });

  assert.equal(result.structuredContent.command, "gates_run");
  assert.equal(result.structuredContent.gate.id, "unit");
  assert.equal(result.structuredContent.status, "passed");
  assert.equal(result.structuredContent.exitCode, 0);
  assert.match(result.structuredContent.stdout.summary, /mcp gate stdout/);
  assert.match(result.content[0].text, /gates_run/);

  const log = await readFile(join(repoPath, ".devflow", "state", "events.jsonl"), "utf8");
  assert.match(log, /"type":"gate.finished"/);
  assert.match(log, /mcp gate stdout/);
});

test("MCP split returns worktree sessions and copy-paste prompts", async () => {
  const result = await callTool("devflow.split", {
    runId: "2026-05-16-mcp-split",
    goal: "Split the next Devflow implementation.",
    sessionCount: 2,
    platform: "windows-powershell",
    tasks: [
      {
        id: "mcp-split-tool",
        ownedPaths: ["packages/mcp/**", "packages/core/**"],
        avoidPaths: ["docs/**"],
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

  assert.equal(result.structuredContent.command, "split");
  assert.equal(result.structuredContent.sessions.length, 2);
  assert.equal(result.structuredContent.sessions[0].branch, "codex/mcp-split-tool");
  assert.match(result.structuredContent.sessions[0].prompt, /packages\/mcp\/\*\*/);
  assert.match(result.content[0].text, /split/);
});

test("MCP split reads project-specific tasks from devflow config", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-config-split-"));
  await mkdir(join(repoPath, ".devflow"), { recursive: true });
  await writeFile(
    join(repoPath, ".devflow", "config.json"),
    `${JSON.stringify({
      defaultProfile: "hermes",
      defaultPlatform: "windows-powershell",
      split: {
        tasks: [
          {
            id: "configured-mcp",
            ownedPaths: ["packages/mcp/**"],
            avoidPaths: ["docs/**"],
            verification: [{ cwd: ".", command: "npm test" }],
          },
        ],
      },
    })}\n`,
  );

  const result = await callTool("devflow.split", {
    repo: repoPath,
    goal: "Use configured MCP split.",
  });

  assert.equal(result.structuredContent.profile.name, "hermes");
  assert.equal(result.structuredContent.sessions[0].id, "configured-mcp");
  assert.deepEqual(result.structuredContent.sessions[0].ownedPaths, ["packages/mcp/**"]);
});

test("MCP split can register and start generated work items", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-split-register-"));
  await mkdir(join(repoPath, ".devflow"), { recursive: true });
  await writeFile(
    join(repoPath, ".devflow", "config.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        split: {
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
        },
      },
      null,
      2,
    )}\n`,
  );

  const split = await callTool("devflow.split", {
    repo: repoPath,
    register: true,
    start: true,
  });
  const listed = await callTool("devflow.work_list", {
    repo: repoPath,
  });

  assert.equal(split.structuredContent.registration.command, "split_register");
  assert.equal(split.structuredContent.registration.created.length, 2);
  assert.equal(split.structuredContent.registration.started.length, 2);
  assert.deepEqual(
    listed.structuredContent.items.map((item) => item.status),
    ["active", "active"],
  );
});

test("MCP explain_term returns beginner-friendly structured explanation", async () => {
  const result = await callTool("devflow.explain_term", {
    term: "middleware",
    context: "The agent said to add middleware before the route handler.",
  });

  assert.equal(result.structuredContent.command, "explain");
  assert.equal(result.structuredContent.term, "middleware");
  assert.match(result.structuredContent.plainExplanation, /between/);
  assert.match(result.content[0].text, /explain_term/);
});

test("MCP rewrite_prompt turns vague request into agent-ready requirements", async () => {
  const result = await callTool("devflow.rewrite_prompt", {
    request: "알아서 다음 구현 계속해",
    context: "Phase 7 still needs MCP prompt rewrite.",
  });

  assert.equal(result.structuredContent.command, "prompt_rewrite");
  assert.equal(result.structuredContent.originalRequest, "알아서 다음 구현 계속해");
  assert.match(result.structuredContent.agentReadyPrompt, /Objective:/);
  assert.match(result.structuredContent.agentReadyPrompt, /Phase 7/);
  assert.match(result.content[0].text, /rewrite_prompt/);
});

test("MCP sessions_codex renders explicit read-only Codex discovery JSON", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-codex-repo-"));
  const codexHome = await mkdtemp(join(tmpdir(), "devflow-mcp-codex-home-"));
  const sessionDir = join(codexHome, "sessions", "2026", "05", "16");
  await mkdir(sessionDir, { recursive: true });
  await writeFile(
    join(sessionDir, "fixture.jsonl"),
    `${JSON.stringify({
      type: "session_meta",
      payload: {
        id: "019c7714-3b77-74d1-9866-e1f484aae2ab",
        cwd: repoPath,
        timestamp: "2026-05-16T11:00:00+09:00",
      },
    })}\n${JSON.stringify({
      type: "response_item",
      payload: { type: "function_call", name: "apply_patch" },
    })}\n`,
  );

  const result = await callTool("devflow.sessions_codex", {
    repo: repoPath,
    codexHome,
  });

  assert.equal(result.structuredContent.command, "sessions_codex");
  assert.equal(result.structuredContent.files.length, 1);
  assert.equal(
    result.structuredContent.discovery.sessions[0].sessionId,
    "019c7714-3b77-74d1-9866-e1f484aae2ab",
  );
  assert.equal(result.structuredContent.discovery.sessions[0].project.confidence, "high");
  assert.equal(result.structuredContent.discovery.sessions[0].signals.hasFileEdits, true);
  assert.match(result.content[0].text, /sessions_codex/);
});

test("MCP sessions_attach_plan renders dry-run attach proposals", async () => {
  const result = await callTool("devflow.sessions_attach_plan", {
    workItems: [
      {
        id: "phase-6-session-import",
        title: "Phase 6 session import",
        ownedPaths: ["packages/adapters/**"],
      },
    ],
    sessions: [
      {
        sessionId: "high-confidence",
        agent: "Codex",
        project: { confidence: "high" },
        events: [
          {
            type: "git.diff.captured",
            changedFiles: ["packages/adapters/src/index.js"],
          },
        ],
      },
    ],
  });

  assert.equal(result.structuredContent.command, "session_attach_plan");
  assert.equal(result.structuredContent.proposals[0].sessionId, "high-confidence");
  assert.equal(result.structuredContent.proposals[0].recommendedWorkItemId, "phase-6-session-import");
  assert.equal(result.structuredContent.proposals[0].action, "attach-ready");
  assert.match(result.content[0].text, /sessions_attach_plan/);
});

test("MCP sessions_attach writes confirmed session attach events", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-session-attach-"));
  const result = await callTool("devflow.sessions_attach", {
    repo: repoPath,
    confirm: true,
    proposal: {
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
  });

  assert.equal(result.structuredContent.command, "session_attach");
  assert.equal(result.structuredContent.event.type, "session.attached");
  assert.equal(result.structuredContent.event.payload.sessionId, "high-confidence");
  assert.match(result.content[0].text, /sessions_attach/);

  const status = await callTool("devflow.status", { repo: repoPath });
  assert.equal(status.structuredContent.sessions.attached[0].sessionId, "high-confidence");
});

test("MCP sessions_attach reports existing links without duplicate events", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-session-attach-dedupe-"));
  const args = {
    repo: repoPath,
    confirm: true,
    proposal: {
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
  };

  await callTool("devflow.sessions_attach", args);
  const second = await callTool("devflow.sessions_attach", args);
  const log = await readFile(join(repoPath, ".devflow", "state", "events.jsonl"), "utf8");

  assert.equal(second.structuredContent.event.existing, true);
  assert.equal(log.trim().split("\n").length, 1);
});

test("MCP sessions_list renders attached sessions", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-session-list-"));
  await callTool("devflow.sessions_attach", {
    repo: repoPath,
    confirm: true,
    proposal: {
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
  });

  const result = await callTool("devflow.sessions_list", {
    repo: repoPath,
  });

  assert.equal(result.structuredContent.command, "session_list");
  assert.equal(result.structuredContent.count, 1);
  assert.equal(result.structuredContent.sessions[0].sessionId, "high-confidence");
  assert.match(result.content[0].text, /sessions_list/);
});

test("MCP sessions_note records a manual session note", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-session-note-"));
  const result = await callTool("devflow.sessions_note", {
    repo: repoPath,
    work: "phase-6-session-import",
    agent: "manual",
    summary: "Reviewed local session context outside an agent transcript.",
  });

  assert.equal(result.structuredContent.command, "session_note");
  assert.equal(result.structuredContent.event.type, "session.message");
  assert.equal(result.structuredContent.event.payload.workItemId, "phase-6-session-import");

  const list = await callTool("devflow.sessions_list", { repo: repoPath });
  assert.equal(list.structuredContent.sessions[0].kind, "manual-note");
  assert.match(list.structuredContent.sessions[0].summary, /Reviewed local session context/);
});

test("MCP sessions_list filters by work item", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-session-list-filter-"));
  await callTool("devflow.sessions_note", {
    repo: repoPath,
    work: "phase-6-session-import",
    summary: "Session import note.",
  });
  await callTool("devflow.sessions_note", {
    repo: repoPath,
    work: "phase-7-beginner-guidance",
    summary: "Beginner guidance note.",
  });

  const result = await callTool("devflow.sessions_list", {
    repo: repoPath,
    work: "phase-6-session-import",
  });

  assert.equal(result.structuredContent.count, 1);
  assert.equal(result.structuredContent.filters.workItemId, "phase-6-session-import");
  assert.equal(result.structuredContent.sessions[0].workItemId, "phase-6-session-import");
});

test("MCP sessions_list limits after work item filtering", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-session-list-limit-"));
  await callTool("devflow.sessions_note", {
    repo: repoPath,
    work: "phase-6-session-import",
    summary: "First import note.",
  });
  await callTool("devflow.sessions_note", {
    repo: repoPath,
    work: "phase-7-beginner-guidance",
    summary: "Beginner guidance note.",
  });
  await callTool("devflow.sessions_note", {
    repo: repoPath,
    work: "phase-6-session-import",
    summary: "Second import note.",
  });

  const result = await callTool("devflow.sessions_list", {
    repo: repoPath,
    work: "phase-6-session-import",
    limit: 1,
  });

  assert.equal(result.structuredContent.count, 1);
  assert.equal(result.structuredContent.totalCount, 2);
  assert.equal(result.structuredContent.filters.limit, 1);
  assert.match(result.structuredContent.sessions[0].summary, /Second import note/);
});

test("MCP sessions_list rejects invalid limit values", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-session-list-invalid-limit-"));

  await assert.rejects(
    callTool("devflow.sessions_list", {
      repo: repoPath,
      limit: 0,
    }),
    /devflow.sessions_list requires limit to be a positive integer/,
  );

  await assert.rejects(
    callTool("devflow.sessions_list", {
      repo: repoPath,
      limit: "abc",
    }),
    /devflow.sessions_list requires limit to be a positive integer/,
  );
});

test("MCP sessions_list filters by agent", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-session-list-agent-"));
  await callTool("devflow.sessions_note", {
    repo: repoPath,
    work: "phase-6-session-import",
    agent: "manual",
    summary: "Manual import note.",
  });
  await callTool("devflow.sessions_note", {
    repo: repoPath,
    work: "phase-6-session-import",
    agent: "Codex",
    summary: "Codex import note.",
  });

  const result = await callTool("devflow.sessions_list", {
    repo: repoPath,
    agent: "Codex",
  });

  assert.equal(result.structuredContent.count, 1);
  assert.equal(result.structuredContent.filters.agent, "Codex");
  assert.equal(result.structuredContent.sessions[0].agent, "Codex");
  assert.match(result.structuredContent.sessions[0].summary, /Codex import note/);
});

test("MCP sessions_list filters by observed time", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-session-list-since-"));
  const stateDir = join(repoPath, ".devflow", "state");
  await mkdir(stateDir, { recursive: true });
  await writeFile(
    join(stateDir, "events.jsonl"),
    `${JSON.stringify({
      schemaVersion: "0.1",
      type: "session.message",
      observedAt: "2026-05-15T00:00:00.000Z",
      payload: {
        sessionId: "old",
        workItemId: "phase-6-session-import",
        agent: "Codex",
        kind: "manual-note",
        summary: "Old Codex note.",
      },
    })}\n${JSON.stringify({
      schemaVersion: "0.1",
      type: "session.message",
      observedAt: "2026-05-16T00:00:00.000Z",
      payload: {
        sessionId: "new",
        workItemId: "phase-6-session-import",
        agent: "Codex",
        kind: "manual-note",
        summary: "New Codex note.",
      },
    })}\n`,
    "utf8",
  );

  const result = await callTool("devflow.sessions_list", {
    repo: repoPath,
    since: "2026-05-15T12:00:00.000Z",
  });

  assert.equal(result.structuredContent.count, 1);
  assert.equal(result.structuredContent.totalCount, 1);
  assert.equal(result.structuredContent.filters.since, "2026-05-15T12:00:00.000Z");
  assert.match(result.structuredContent.sessions[0].summary, /New Codex note/);
});

test("MCP sessions_list rejects invalid since values", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-session-list-invalid-since-"));

  await assert.rejects(
    callTool("devflow.sessions_list", {
      repo: repoPath,
      since: "not-a-date",
    }),
    /devflow.sessions_list requires since to be an ISO date/,
  );
});

test("MCP sessions_list sorts by observed time before limit", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-session-list-sort-"));
  const stateDir = join(repoPath, ".devflow", "state");
  await mkdir(stateDir, { recursive: true });
  await writeFile(
    join(stateDir, "events.jsonl"),
    `${JSON.stringify({
      schemaVersion: "0.1",
      type: "session.message",
      observedAt: "2026-05-16T00:00:00.000Z",
      payload: {
        sessionId: "middle",
        workItemId: "phase-6-session-import",
        agent: "Codex",
        kind: "manual-note",
        summary: "Middle Codex note.",
      },
    })}\n${JSON.stringify({
      schemaVersion: "0.1",
      type: "session.message",
      observedAt: "2026-05-15T00:00:00.000Z",
      payload: {
        sessionId: "old",
        workItemId: "phase-6-session-import",
        agent: "Codex",
        kind: "manual-note",
        summary: "Old Codex note.",
      },
    })}\n${JSON.stringify({
      schemaVersion: "0.1",
      type: "session.message",
      observedAt: "2026-05-17T00:00:00.000Z",
      payload: {
        sessionId: "new",
        workItemId: "phase-6-session-import",
        agent: "Codex",
        kind: "manual-note",
        summary: "New Codex note.",
      },
    })}\n`,
    "utf8",
  );

  const ascending = await callTool("devflow.sessions_list", {
    repo: repoPath,
    sort: "observedAt:asc",
  });
  const descendingLimited = await callTool("devflow.sessions_list", {
    repo: repoPath,
    sort: "observedAt:desc",
    limit: 1,
  });

  assert.deepEqual(
    ascending.structuredContent.sessions.map((session) => session.summary),
    ["Old Codex note.", "Middle Codex note.", "New Codex note."],
  );
  assert.equal(ascending.structuredContent.filters.sort, "observedAt:asc");
  assert.equal(descendingLimited.structuredContent.count, 1);
  assert.equal(descendingLimited.structuredContent.totalCount, 3);
  assert.equal(descendingLimited.structuredContent.filters.sort, "observedAt:desc");
  assert.match(descendingLimited.structuredContent.sessions[0].summary, /New Codex note/);
});

test("MCP sessions_list rejects invalid sort values", async () => {
  const repoPath = await mkdtemp(join(tmpdir(), "devflow-mcp-session-list-invalid-sort-"));

  await assert.rejects(
    callTool("devflow.sessions_list", {
      repo: repoPath,
      sort: "observedAt:newest",
    }),
    /devflow.sessions_list requires sort to be observedAt:asc or observedAt:desc/,
  );
});
