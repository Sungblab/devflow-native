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
  assert.ok(response.result.tools.some((tool) => tool.name === "devflow.finish"));
  assert.ok(response.result.tools.some((tool) => tool.name === "devflow.record_gate"));
  assert.ok(response.result.tools.some((tool) => tool.name === "devflow.split"));
  assert.ok(response.result.tools.some((tool) => tool.name === "devflow.explain_term"));
  assert.ok(response.result.tools.some((tool) => tool.name === "devflow.rewrite_prompt"));
  assert.ok(response.result.tools.some((tool) => tool.name === "devflow.sessions_codex"));
  assert.ok(response.result.tools.some((tool) => tool.name === "devflow.sessions_attach_plan"));
  assert.ok(response.result.tools.some((tool) => tool.name === "devflow.sessions_attach"));
  assert.ok(response.result.tools.some((tool) => tool.name === "devflow.sessions_list"));
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
