#!/usr/bin/env node
import { callTool, listTools } from "./index.js";

let input = "";

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  input += chunk;
});
process.stdin.on("end", async () => {
  const lines = input.split("\n").filter((line) => line.trim());

  for (const line of lines) {
    const response = await handleRequestLine(line);
    process.stdout.write(`${JSON.stringify(response)}\n`);
  }
});

async function handleRequestLine(line) {
  let request;
  try {
    request = JSON.parse(line);
  } catch {
    return errorResponse(null, -32700, "Parse error");
  }

  try {
    if (request.method === "tools/list") {
      return successResponse(request.id, { tools: listTools() });
    }

    if (request.method === "tools/call") {
      const result = await callTool(
        request.params?.name,
        request.params?.arguments ?? {},
      );
      return successResponse(request.id, result);
    }

    return errorResponse(request.id, -32601, `Method not found: ${request.method}`);
  } catch (error) {
    return errorResponse(request.id, -32000, error.message);
  }
}

function successResponse(id, result) {
  return {
    jsonrpc: "2.0",
    id,
    result,
  };
}

function errorResponse(id, code, message) {
  return {
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
    },
  };
}
