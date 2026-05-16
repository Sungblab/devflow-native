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
  assert.ok(names.includes("devflow.finish"));
  assert.ok(names.includes("devflow.next_prompt"));
  assert.ok(names.includes("devflow.record_gate"));
  assert.ok(names.includes("devflow.split"));
  assert.ok(names.includes("devflow.explain_term"));
  assert.ok(names.includes("devflow.rewrite_prompt"));
  assert.ok(names.includes("devflow.sessions_codex"));
  assert.ok(names.includes("devflow.sessions_attach_plan"));
  assert.ok(names.includes("devflow.sessions_attach"));
  assert.ok(names.includes("devflow.sessions_list"));
  assert.ok(names.includes("devflow.sessions_note"));
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
