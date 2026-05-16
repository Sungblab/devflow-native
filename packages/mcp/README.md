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
- `devflow.sessions_attach`
- `devflow.sessions_list`
- `devflow.sessions_note`
- `devflow.finish`
- `devflow.record_gate`
- `devflow.next_prompt`

Handlers call `packages/core` or `packages/adapters` and return structured
content plus a short text summary for agent hosts.

`devflow.status` reads repo state, gate evidence, handoffs, and attached
session evidence. Pass `work` or `workItemId` to focus attached sessions on one
work item, and `agent` to focus sessions from one recorded agent/manual source,
while preserving the same core JSON contract used by the CLI.

`devflow.sessions_codex` is read-only and requires an explicit `codexHome`
argument before it reads local Codex session candidates.

`devflow.sessions_attach_plan` is also read-only. It accepts explicit
`workItems`, `sessions`, and optional `warnings` JSON arguments, then returns a
dry-run plan for which sessions are attach-ready or confirmation-gated. It does
not write `.devflow` state.

`devflow.sessions_attach` is the write step. It accepts `repo`, `confirm: true`,
and a selected `proposal`, then appends a `session.attached` event to local
`.devflow` state.

`devflow.sessions_list` reads local `.devflow` state and returns attached
sessions without probing any agent history. Pass `work` or `workItemId` to
limit the list to one work item, `agent` to limit by agent name, `since` to
limit by observation timestamp, `sort` with `observedAt:asc` or
`observedAt:desc` to order matches by observation time before limiting, and
`limit` to return only matching sessions after filtering or sorting. Without
`sort`, the default recorded order and recent-match limit behavior stay
unchanged. `limit` must be a positive integer, `since` must parse as a date, and
`sort` must be one of the two supported observed-time values.

`devflow.sessions_note` writes a manual session note as a local
`session.message` event so external work can appear beside agent sessions.

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
