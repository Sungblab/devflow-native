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

