# `@devflow/mcp`

`packages/mcp` exposes agent-neutral Devflow tools. The handler layer calls
`packages/core`, and the stdio entrypoint exposes those handlers over a minimal
JSON-RPC transport for MCP-capable hosts.

## Initial Tools

- `devflow.doctor`
- `devflow.status`
- `devflow.split`
- `devflow.explain_term`
- `devflow.rewrite_prompt`
- `devflow.sessions_codex`
- `devflow.sessions_attach_plan`
- `devflow.finish`
- `devflow.record_gate`
- `devflow.next_prompt`

Handlers call `packages/core` or `packages/adapters` and return structured
content plus a short text summary for agent hosts.

`devflow.sessions_codex` is read-only and requires an explicit `codexHome`
argument before it reads local Codex session candidates.

`devflow.sessions_attach_plan` is also read-only. It accepts explicit
`workItems`, `sessions`, and optional `warnings` JSON arguments, then returns a
dry-run plan for which sessions are attach-ready or confirmation-gated. It does
not write `.devflow` state.

## Stdio Transport

Run:

```powershell
npm run mcp:stdio
```

The current transport accepts newline-delimited JSON-RPC requests on stdin and
writes one JSON-RPC response per line on stdout.

Supported methods:

- `tools/list`
- `tools/call`

Example request:

```json
{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}
```

The transport is intentionally small. Host-specific config templates and richer
protocol features are follow-up slices.

## Codex Plugin Config

The repo-local Codex plugin at `plugins/devflow` includes `.mcp.json`:

```json
{
  "mcpServers": {
    "devflow": {
      "command": "node",
      "args": ["packages/mcp/src/stdio.js"]
    }
  }
}
```

This keeps the plugin and direct MCP integration pointed at the same local
transport.
