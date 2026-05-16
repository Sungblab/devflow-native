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
