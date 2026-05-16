# `@devflow/mcp`

`packages/mcp` exposes agent-neutral Devflow tools. The handler layer calls
`packages/core`, and the stdio entrypoint exposes those handlers over a minimal
JSON-RPC transport for MCP-capable hosts.

## Initial Tools

- `devflow.doctor`
- `devflow.finish`
- `devflow.next_prompt`

Handlers call `packages/core` and return structured content plus a short text
summary for agent hosts.

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
