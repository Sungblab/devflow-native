# Session List Filter Examples

These examples show how to inspect recorded session evidence without reading
private agent transcript history. All commands read only local Devflow state
from `.devflow/state/events.jsonl`.

## Recent Recorded Sessions

Use this when resuming a project and you only need the latest local evidence:

```powershell
devflow sessions list --repo C:\Users\Sungbin\Documents\GitHub\solo-devflow-os --sort observedAt:desc --limit 5
```

Expected text shape:

```text
Sessions
Filter: all
Count: 5
Sort: observedAt:desc
Limit: 5
Total: 12
manual-note phase-6-session-import manual Reviewed local context.
attached phase-6-session-import Codex high-confidence files:3
```

Use `--json` when another tool or agent needs the stable structured contract.

## One Work Item

Use this when a handoff references a specific work item and you need only its
recorded sessions:

```powershell
devflow sessions list --repo C:\Users\Sungbin\Documents\GitHub\solo-devflow-os --work phase-6-session-import --json
```

Important JSON fields:

```json
{
  "command": "session_list",
  "filters": {
    "workItemId": "phase-6-session-import"
  },
  "count": 2,
  "sessions": []
}
```

## One Agent After A Time Boundary

Use this when filtering a long project history down to a single agent after a
known review, merge, or handoff timestamp:

```powershell
devflow sessions list --repo C:\Users\Sungbin\Documents\GitHub\solo-devflow-os --agent Codex --since 2026-05-16T00:00:00.000Z --sort observedAt:asc --json
```

This orders matches from oldest to newest after applying the agent and time
filters. It is useful when reconstructing the sequence of work inside one day.

## Work Item, Agent, Sort, And Limit

Use this when the maintainer asks what happened most recently for one work item
and one agent:

```powershell
devflow sessions list --repo C:\Users\Sungbin\Documents\GitHub\solo-devflow-os --work phase-6-session-import --agent Codex --sort observedAt:desc --limit 1 --json
```

Filter order:

1. Agent
2. Work item
3. Since timestamp, when provided
4. Explicit observed-time sort, when provided
5. Limit

Without `--sort`, `--limit` keeps the existing recent-match behavior over the
recorded order. With `--sort`, limit is applied to the sorted result.

## MCP Equivalent

In an MCP host, call `devflow.sessions_list` with equivalent arguments:

```json
{
  "repo": "C:\\Users\\Sungbin\\Documents\\GitHub\\solo-devflow-os",
  "work": "phase-6-session-import",
  "agent": "Codex",
  "sort": "observedAt:desc",
  "limit": 1
}
```

Use `workItemId` instead of `work` when a host prefers the full field name.
