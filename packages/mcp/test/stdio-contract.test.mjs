import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import test from "node:test";

test("stdio transport lists tools over JSON-RPC", async () => {
  const response = await runStdioRequest({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list",
    params: {},
  });

  assert.equal(response.id, 1);
  assert.equal(response.result.tools[0].name, "devflow.status");
  assert.ok(!response.result.tools.some((tool) => tool.name === "devflow.dashboard"));
  assert.ok(response.result.tools.some((tool) => tool.name === "devflow.health"));
  assert.ok(response.result.tools.some((tool) => tool.name === "devflow.harness_inspect"));
  assert.ok(response.result.tools.some((tool) => tool.name === "devflow.harness_plan"));
  assert.ok(response.result.tools.some((tool) => tool.name === "devflow.harness_health"));
  assert.ok(response.result.tools.some((tool) => tool.name === "devflow.harness_smoke"));
  assert.ok(response.result.tools.some((tool) => tool.name === "devflow.finish"));
  assert.ok(response.result.tools.some((tool) => tool.name === "devflow.record_gate"));
  assert.ok(response.result.tools.some((tool) => tool.name === "devflow.gates_run"));
  assert.ok(response.result.tools.some((tool) => tool.name === "devflow.split"));
  assert.ok(response.result.tools.some((tool) => tool.name === "devflow.explain_term"));
  assert.ok(response.result.tools.some((tool) => tool.name === "devflow.rewrite_prompt"));
  assert.ok(response.result.tools.some((tool) => tool.name === "devflow.sessions_codex"));
  assert.ok(response.result.tools.some((tool) => tool.name === "devflow.sessions_attach_plan"));
  assert.ok(response.result.tools.some((tool) => tool.name === "devflow.sessions_attach"));
  assert.ok(response.result.tools.some((tool) => tool.name === "devflow.sessions_list"));
  assert.ok(response.result.tools.some((tool) => tool.name === "devflow.sessions_note"));
  assert.ok(response.result.tools.some((tool) => tool.name === "devflow.work_create"));
  assert.ok(response.result.tools.some((tool) => tool.name === "devflow.work_start"));
  assert.ok(response.result.tools.some((tool) => tool.name === "devflow.work_update"));
  assert.ok(response.result.tools.some((tool) => tool.name === "devflow.work_rename"));
  assert.ok(response.result.tools.some((tool) => tool.name === "devflow.work_ready"));
  assert.ok(response.result.tools.some((tool) => tool.name === "devflow.work_block"));
  assert.ok(response.result.tools.some((tool) => tool.name === "devflow.work_unblock"));
  assert.ok(response.result.tools.some((tool) => tool.name === "devflow.work_list"));
  assert.ok(response.result.tools.some((tool) => tool.name === "devflow.review_record"));
  assert.ok(response.result.tools.some((tool) => tool.name === "devflow.review_request"));
});

test("stdio transport calls devflow.doctor over JSON-RPC", async () => {
  const response = await runStdioRequest({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: {
      name: "devflow.doctor",
      arguments: {
        platform: "windows-powershell",
      },
    },
  });

  assert.equal(response.id, 2);
  assert.equal(response.result.structuredContent.command, "doctor");
  assert.equal(
    response.result.structuredContent.executionContract.preferredReadCommand,
    "Get-Content -LiteralPath",
  );
});

test("stdio transport handles MCP initialize handshake", async () => {
  const response = await runStdioRequest({
    jsonrpc: "2.0",
    id: 3,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: {
        name: "devflow-test",
        version: "0",
      },
    },
  });

  assert.equal(response.id, 3);
  assert.equal(response.result.protocolVersion, "2024-11-05");
  assert.deepEqual(response.result.capabilities, { tools: {} });
  assert.equal(response.result.serverInfo.name, "devflow-native");
});

test("stdio transport responds while stdin remains open", async () => {
  const child = spawn(process.execPath, ["packages/mcp/src/stdio.js"], {
    cwd: process.cwd(),
    stdio: ["pipe", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });

  child.stdin.write(`${JSON.stringify({
    jsonrpc: "2.0",
    id: 4,
    method: "tools/list",
    params: {},
  })}\n`);

  let response;
  try {
    response = await waitForJsonLine(() => stdout, 1000);
  } finally {
    child.stdin.end();
    child.kill();
    await new Promise((resolve) => {
      child.on("close", resolve);
    });
  }

  assert.equal(response.id, 4);
  assert.ok(response.result.tools.some((tool) => tool.name === "devflow.status"));
  assert.equal(stderr, "");
});

async function runStdioRequest(request) {
  const child = spawn(process.execPath, ["packages/mcp/src/stdio.js"], {
    cwd: process.cwd(),
    stdio: ["pipe", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });

  child.stdin.end(`${JSON.stringify(request)}\n`);

  const exitCode = await new Promise((resolve) => {
    child.on("close", resolve);
  });

  assert.equal(exitCode, 0, stderr);
  return JSON.parse(stdout.trim());
}

async function waitForJsonLine(readStdout, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const line = readStdout().split("\n").find((entry) => entry.trim());
    if (line) {
      return JSON.parse(line);
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("Timed out waiting for stdio response while stdin remained open");
}
