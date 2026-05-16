import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
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
