# `@devflow/mcp`

`packages/mcp` exposes agent-neutral Devflow tools. The handler layer calls
`packages/core`, and the stdio entrypoint exposes those handlers over a minimal
JSON-RPC transport for MCP-capable hosts.

## Initial Tools

- `devflow.doctor`
- `devflow.status`
- `devflow.health`
- `devflow.harness_inspect`
- `devflow.harness_plan`
- `devflow.harness_health`
- `devflow.harness_repair`
- `devflow.split`
- `devflow.explain_term`
- `devflow.rewrite_prompt`
- `devflow.sessions_codex`
- `devflow.sessions_attach_plan`
- `devflow.sessions_attach`
- `devflow.sessions_list`
- `devflow.sessions_note`
- `devflow.work_create`
- `devflow.work_start`
- `devflow.work_update`
- `devflow.work_rename`
- `devflow.work_ready`
- `devflow.work_block`
- `devflow.work_unblock`
- `devflow.work_list`
- `devflow.review_request`
- `devflow.review_record`
- `devflow.finish`
- `devflow.record_gate`
- `devflow.gates_run`
- `devflow.next_prompt`
- `devflow.handoff_latest`

Handlers call `packages/core` or `packages/adapters` and return structured
content plus a short text summary for agent hosts.

`devflow.status` reads repo state, gate evidence, handoffs, and attached
session evidence. Pass `work` or `workItemId` to focus attached sessions on one
work item, and `agent` to focus sessions from one recorded agent/manual source,
while preserving the same core JSON contract used by the CLI. When configured
review is required, focused status returns a `review` recommendation with the
matching `devflow review request` command until passing review evidence exists.
Without a work filter, status uses the first ready-to-finish work item, then
the first active work item, so native hosts still get the required review
command from a plain status call.

`devflow.health` checks the local project scaffold. It reports required files,
missing files, configured gates, invalid gate definitions, and recommendations
without reading private agent history. A gate is invalid when its id is missing,
its command is missing, or its id duplicates another configured gate.

`devflow.harness_inspect`, `devflow.harness_plan`, and
`devflow.harness_health` expose the native harness read path to MCP-capable
hosts. They accept `repo` plus optional `targets` as an array or comma-separated
string. The inspect and plan tools are read-only, and health validates installed
plugin manifests, MCP config, hook scripts, `review.required`, and configured
gates without running install or repair writes. When health finds a repairable
failure such as a missing required-review setting, the structured result and
text include a `nextAction.command` such as `devflow harness repair --confirm`;
the health tool still does not perform the write itself. `devflow.harness_repair`
is the confirmed write step for MCP hosts; it requires `confirm: true` before
repairing built-in harness files or mergeable required-review config.

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

`devflow.work_create`, `devflow.work_start`, `devflow.work_update`,
`devflow.work_rename`, `devflow.work_ready`, `devflow.work_block`,
`devflow.work_unblock`, and `devflow.work_list` expose the local work item
registry to agent hosts. The write tools append `work.created`, `work.started`,
`work.updated`, `work.ready`, `work.blocked`, and `work.unblocked` events; the
list tool derives current item status from local
state without reading agent history. Repeated create or start calls for the
same id return the existing event with `existing: true` instead of appending
duplicate lines. `devflow.work_rename` is a title-only alias over
`work.updated`.

`devflow.split` accepts `register: true` to append generated sessions as
`work.created` events. When `start: true` is also provided, it appends matching
`work.started` events so agent hosts can make split tasks visible in
`devflow.work_list` and `devflow.status` without re-entering work item details.
Repeated split registration reuses existing work events by id.

`devflow.review_request` creates the copy-paste prompt for a separate reviewer
agent or reviewer persona. It returns the work item, changed files supplied by
the host, recorded gate evidence, a strict blocker-first checklist, and the
follow-up `devflow review record` command. The tool's text content also prints
that follow-up as `Record command` so agent hosts can continue without parsing
structured JSON.

`devflow.review_record` writes local `review.completed` evidence for a work
item. Use it after a separate reviewer agent or reviewer persona has inspected
the work. It records reviewer, status, summary, and source; it does not perform
the review itself.

`devflow.finish` returns the same false-completion guard contract as the CLI.
It reads configured gates, recorded `gate.finished` events, and configured
review requirements before returning `canClaimDone`, `doneBlockers`, gate
classifications, review evidence, `structuredHandoff`, and `nextPrompt`. If
`.devflow/config.json` sets `review.required` to `true`, finish requires a
passing `review.completed` record for the work item and includes
`review.nextAction.command` and `review.nextAction.recordCommand` when the
required review still needs to be requested and then recorded.

`devflow.finish` also appends the canonical `work.completed` event to
`.devflow/state/events.jsonl` and rewrites `.devflow/next-prompt.md` as the
latest human-readable prompt projection. `devflow.handoff_latest` reads the
latest derived handoff metadata plus that persisted prompt so a new MCP-backed
session can resume without regenerating an ad hoc prompt.

`devflow.gates_run` reads `.devflow/config.json`, finds a configured gate by
`id`, executes its command without a shell, and appends a `gate.finished` event
with status, command, exit code, and stdout/stderr summaries. Hosts can pass
`work` or `workItemId` to associate the evidence with a work item.

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
