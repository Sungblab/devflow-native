#!/usr/bin/env node
import { createRequire } from "node:module";
import { callTool, listTools } from "./index.js";

const require = createRequire(import.meta.url);
const packageJson = require("../../../package.json");
const serverInfo = {
  name: "devflow-native",
  version: packageJson.version,
};

let buffer = "";
let pending = Promise.resolve();

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  const lines = buffer.split("\n");
  buffer = lines.pop() ?? "";

  for (const line of lines) {
    enqueueRequestLine(line);
  }
});
process.stdin.on("end", async () => {
  if (buffer.trim()) {
    enqueueRequestLine(buffer);
    buffer = "";
  }
});

function enqueueRequestLine(line) {
  if (!line.trim()) {
    return;
  }

  pending = pending.then(async () => {
    const response = await handleRequestLine(line);
    if (response) {
      process.stdout.write(`${JSON.stringify(response)}\n`);
    }
  });
}

async function handleRequestLine(line) {
  let request;
  try {
    request = JSON.parse(line);
  } catch {
    return errorResponse(null, -32700, "Parse error");
  }

  try {
    if (request.method === "initialize") {
      return successResponse(request.id, {
        protocolVersion: request.params?.protocolVersion ?? "2024-11-05",
        capabilities: {
          tools: {},
        },
        serverInfo,
      });
    }

    if (request.method === "notifications/initialized") {
      return null;
    }

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
