# Command Contract

This document defines the intended CLI shape before implementation.

## Package Ownership

- `packages/cli`: argument parsing, exit codes, and text/JSON rendering.
- `packages/core`: command contracts, state derivation, split planning, finish
  planning, gate evidence, and next-session prompt generation.
- `packages/adapters`: agent session discovery and platform-specific command
  rendering.

## Core Commands

```text
devflow init
devflow health
devflow harness inspect
devflow harness plan
devflow harness install
devflow harness health
devflow harness repair
devflow gates run
devflow work create
devflow work start
devflow work update
devflow work rename
devflow work ready
devflow work block
devflow work unblock
devflow work list
devflow status
devflow split
devflow explain
devflow finish
devflow prompt next
devflow prompt rewrite
devflow sessions codex
devflow sessions attach-plan
devflow sessions attach
devflow sessions list
devflow sessions note
devflow doctor
```

## MVP Loop

The first implementation slice is deliberately narrow:

```text
devflow status
devflow split
devflow finish
devflow doctor
devflow prompt next
```

This loop should answer three daily questions before larger surfaces exist:

- What is the current repo/work/gate state?
- What evidence closes this task?
- What exact prompt should the next session use?
- What local shell, path, tool, and repeated-mistake rules should the agent
  follow before running commands?

`devflow split` now has a CLI renderer over the core split contract, can read
project-specific split tasks, and can register generated sessions into the
local work item registry. `devflow init` now has a first guarded scaffold implementation:
without `--confirm`, it renders the plan only; with `--confirm`, it writes the
minimum project contract and skips existing files instead of overwriting them.
`devflow health` checks those scaffold files and configured gates.
`devflow gates run` executes one configured gate and records pass/fail
evidence.
`devflow work create/start/update/rename/ready/block/unblock/list` provides the first
local work item registry.
`doctor` is included early because plugin/skill-first workflows need a cheap
way to avoid repeated local-environment mistakes.
`devflow harness inspect/plan/install/health/repair` is the native adoption
surface for existing repos using Codex, Claude Code, Superpowers, optional
CodeGraph-style context providers, and git/finish guards.
`devflow sessions codex` is included as a read-only adapter probe. It requires
an explicit `--codex-home <path>` and should not read private agent history by
default. `devflow sessions attach-plan` is a dry-run proposal command and does
not write `session.attached` events. `devflow sessions attach` is the explicit
write step and requires `--confirm`. `devflow sessions list` shows attached
session evidence from local state. `devflow sessions note` records manual or
external session context without requiring an agent transcript.

## MVP State Persistence

The MVP loop stores local evidence in an append-only JSONL event log:

```text
.devflow/state/events.jsonl
```

`devflow finish` appends one `work.completed` event containing the finish JSON
contract. `devflow gates run` and agent hosts may also record standalone
`gate.finished` evidence before a work item is closed. `devflow status` reads
the same log and derives the latest handoff and latest gate evidence from it.
The event log is local-first project state and is ignored by git by default in
this repository.
`devflow work create` appends `work.created`, `devflow work start` appends
`work.started`, `devflow work update` and `devflow work rename` append
`work.updated`, `devflow work ready` appends `work.ready`, `devflow work block`
appends `work.blocked`, `devflow work unblock` appends `work.unblocked`, and
`devflow work list` derives current work item state from the same log. Work
item create/start writes are idempotent by id: creating or starting an already
recorded work item returns the existing event with `existing: true` instead of
appending another line.

## Shared CLI Rules

- Commands default to the current working directory.
- `--repo <path>` overrides the repository path.
- `--profile <name>` selects a workflow profile such as `plain`, `standard`,
  `superpowers`, `gstack`, `openharness`, or `hermes`.
- Profiles are references. The core must not require Superpowers or any other
  profile runtime to be installed.
- `--platform <name>` accepts `powershell`, `wsl`, `linux`, or `macos`.
- `--agent <name>` may be repeated when a command should prefer specific
  adapters.
- `--json` prints the JSON contract exactly enough for another tool to parse.
- Text output is a renderer over the same contract, not a separate behavior.
- Timestamps use ISO 8601 strings with offsets when known.
- Paths in JSON use repo-relative POSIX-style strings unless the field name
  explicitly says `absolutePath`.

## Command Descriptor Contract

Core returns command descriptors. Platform adapters render them to shell text.

```json
{
  "id": "create-worker-worktree",
  "intent": "createWorktree",
  "cwd": ".",
  "args": {
    "branch": "codex/worker-static-quality",
    "path": ".worktrees/worker-static-quality",
    "base": "origin/main"
  },
  "variants": {
    "powershell": "git fetch origin; git worktree add .worktrees/worker-static-quality -b codex/worker-static-quality origin/main",
    "posix": "git fetch origin && git worktree add .worktrees/worker-static-quality -b codex/worker-static-quality origin/main"
  }
}
```

Command descriptors are durable evidence. Rendered commands are convenience
output for a chosen platform.

## `devflow init`

Creates or updates a project contract.

The MVP implementation is confirmation-gated:

```powershell
devflow init --repo C:\path\to\repo --profile standard --platform windows-powershell --json
devflow init --repo C:\path\to\repo --profile standard --platform windows-powershell --confirm --json
```

Inputs:

- profile
- platform
- docs template
- gate profile

Outputs:

- `AGENTS.md`
- docs router
- architecture maps
- testing strategy
- `.devflow/config.json`

Safety rules:

- without `--confirm`, no files are written
- with `--confirm`, missing scaffold files are created
- existing files are skipped, not overwritten

## `devflow health`

Checks whether the local project has the minimum Devflow scaffold and at least
one valid configured verification gate.

Example:

```powershell
devflow health --repo C:\path\to\repo --json
```

Outputs:

- required scaffold files and whether they are present
- missing scaffold files
- configured gates from `.devflow/config.json`
- invalid gates with missing ids, missing commands, or duplicate ids
- recommendations for missing files, missing gates, or invalid gates

Health status values:

- `ok`: scaffold files are present and configured gates are valid
- `missing`: required scaffold files or gates are missing
- `invalid`: at least one configured gate is malformed

## `devflow harness`

Inspects, plans, installs, verifies, and repairs the repo-local native harness
for agent hosts.

Examples:

```powershell
devflow harness inspect --targets codex,claude,superpowers,codegraph --json
devflow harness plan --targets codex,claude --json
devflow harness install --targets codex,claude,git-hooks --confirm --json
devflow harness health --json
devflow harness repair --json
```

Targets:

- `codex`: `.codex-plugin`, skills, hooks, optional `.mcp.json`, repo-local
  `.codex/config.toml`, and `AGENTS.md` readiness
- `claude`: `.claude-plugin`, skills, hooks, optional `.mcp.json`, project
  `.claude/` files, and `CLAUDE.md` compatibility
- `superpowers`: installed/enabled methodology profile and visible skill usage
  that can count as workflow evidence
- `codegraph`: optional graph context provider availability and freshness
- `git-hooks`: local finish or commit guards when configured

Responsibilities:

- `inspect`: read the current repo and report readiness without writing files
- `plan`: propose the smallest safe adoption or repair plan
- `install`: write only confirmed missing harness pieces and avoid overwriting
  rich project instructions
- `health`: verify hook paths, MCP launchers, plugin manifests, gates, and the
  status/review/finish/next-prompt loop
- `repair`: restore confirmed broken installed files that have built-in
  canonical content, such as malformed plugin manifests, malformed MCP config,
  or hook scripts that fail the health contract

The harness command group is adoption-first. Mature repos should keep their
existing instructions; Devflow should add the minimum bridge needed for native
Codex and Claude Code workflow continuity.

## `devflow gates run`

Runs one configured gate from `.devflow/config.json` and records the command
result as local gate evidence.

Example:

```powershell
devflow gates run docs-check --repo C:\path\to\repo --json
```

Inputs:

- gate id
- repository path
- configured `.devflow/config.json` gates

Outputs:

- `passed` or `failed` status
- configured command
- process exit code
- stdout/stderr summaries with truncation flags
- append-only `.devflow/state/events.jsonl` `gate.finished` event

The MVP runner intentionally executes only a single process command. It parses
the configured command into executable plus arguments and calls it without a
shell. Shell operators such as pipes, redirection, `&&`, and `;` are rejected
instead of being passed through. On Windows, common package-manager commands
such as `npm` are resolved to their `.cmd` launcher so PowerShell-first projects
can still use gates such as `npm run docs:check`.

JSON output:

```json
{
  "schemaVersion": "0.1",
  "command": "gates_run",
  "repo": {
    "absolutePath": "C:\\path\\to\\repo"
  },
  "gate": {
    "id": "docs-check",
    "command": "npm run docs:check"
  },
  "status": "passed",
  "exitCode": 0,
  "stdout": {
    "summary": "Documentation links OK.\n",
    "truncated": false
  },
  "stderr": {
    "summary": "",
    "truncated": false
  }
}
```

## `devflow status`

Reads current project state.

Example:

```powershell
devflow status --repo C:\Users\Sungbin\Documents\GitHub\solo-devflow-os --profile standard --platform powershell --json
```

Beginner-friendly renderer:

```powershell
devflow status --simple
devflow status --work phase-6-session-import --simple
devflow status --agent Codex --simple
```

For a sample renderer output and field guide, see
[Simple Status Output Example](../examples/simple-status-output.md).

Inputs:

- repository path
- profile
- platform
- optional agents to probe
- optional work item id through `--work <id>` to focus attached session evidence
- optional agent name through `--agent <name>` to focus attached session evidence

Outputs:

- branch and dirty files
- active work and agent filters in `--simple` output and JSON `filters`
- attached/manual session count, latest session work item, session id, observed
  time, agent, kind, summary, and changed-file count in `--simple` output
- active work items
- latest handoffs from `.devflow/state/events.jsonl`
- attached/manual session evidence from `.devflow/state/events.jsonl`
- configured gates
- latest gate evidence from `.devflow/state/events.jsonl`
- recommended next checks

JSON output:

```json
{
  "schemaVersion": "0.1",
  "command": "status",
  "filters": {
    "workItemId": "phase-6-session-import",
    "agent": "Codex"
  },
  "repo": {
    "absolutePath": "C:\\Users\\Sungbin\\Documents\\GitHub\\solo-devflow-os",
    "root": ".",
    "branch": "main",
    "head": null,
    "dirty": true
  },
  "profile": {
    "name": "standard",
    "source": "cli",
    "requiredRuntime": false
  },
  "platform": {
    "name": "powershell",
    "shell": "pwsh",
    "pathStyle": "windows"
  },
  "git": {
    "changedFiles": [
      {
        "path": "docs/contributing/commands.md",
        "status": "modified",
        "ownedBy": null
      }
    ],
    "worktrees": []
  },
  "work": {
    "active": [],
    "blocked": [],
    "readyToFinish": []
  },
  "sessions": {
    "discovered": [],
    "attached": []
  },
  "gates": [
    {
      "id": "docs-check",
      "command": "npm run docs:check",
      "lastRun": null,
      "recommended": true,
      "reason": "Documentation files changed."
    }
  ],
  "handoffs": {
    "latest": {
      "workItemId": "worker-static-quality",
      "title": "Worker static-quality cleanup",
      "observedAt": "2026-05-15T14:36:00+09:00",
      "prompt": "Continue OpenCairn from worker-static-quality..."
    },
    "stale": []
  },
  "recommendations": [
    {
      "kind": "gate",
      "message": "Run npm run docs:check before finishing."
    }
  ],
  "warnings": []
}
```

## `devflow work create`

Creates a local work item in `.devflow/state/events.jsonl`.

Example:

```powershell
devflow work create --id phase-3-work-registry --title "Phase 3 work registry" --owned-path packages/core/** --owned-path packages/cli/** --json
```

Inputs:

- work item id
- title
- optional description
- optional repeated `--owned-path <glob>`

Outputs:

- `work_create` JSON wrapper
- created work item payload
- appended `work.created` event

If the id already has a `work.created` event, the command returns that existing
event with `existing: true` and does not append another event.

## `devflow work start`

Marks a local work item as active.

Example:

```powershell
devflow work start phase-3-work-registry --json
```

Inputs:

- work item id as the first positional argument, or `--id <id>`

Outputs:

- `work_start` JSON wrapper
- started work item payload
- appended `work.started` event

If the id already has a `work.started` event, the command returns that existing
event with `existing: true` and does not append another event.

## `devflow work update`

Updates local work item metadata without changing lifecycle status.

Example:

```powershell
devflow work update phase-3-work-registry --title "Phase 3 work registry" --owned-path "packages/core/**" --json
```

Inputs:

- work item id as the first positional argument, or `--id <id>`
- optional `--title <title>`
- optional `--description <description>`
- optional repeated `--owned-path <glob>`

Outputs:

- `work_update` JSON wrapper
- updated work item metadata payload
- appended `work.updated` event

Updated metadata is visible in `devflow status` and `devflow work list`, while
the work item's current lifecycle status is preserved.

## `devflow work rename`

Renames a local work item without changing description, owned paths, or
lifecycle status.

Example:

```powershell
devflow work rename phase-3-work-registry --title "Phase 3 local work registry" --json
```

Inputs:

- work item id as the first positional argument, or `--id <id>`
- required `--title <title>`

Outputs:

- `work_rename` JSON wrapper
- title-only work item metadata payload
- appended `work.updated` event

Use `devflow work update` when changing description or owned paths too.

## `devflow work ready`

Marks a local work item as ready to finish.

Example:

```powershell
devflow work ready phase-3-work-registry --json
```

Outputs:

- `work_ready` JSON wrapper
- ready work item payload
- appended `work.ready` event

Ready items appear under `work.readyToFinish` in `devflow status`.

## `devflow work block`

Marks a local work item as blocked.

Example:

```powershell
devflow work block phase-3-work-registry --reason "Waiting for review." --json
```

Outputs:

- `work_block` JSON wrapper
- blocked work item payload, including the optional reason
- appended `work.blocked` event

Blocked items appear under `work.blocked` in `devflow status`.

## `devflow work unblock`

Returns a blocked local work item to active status.

Example:

```powershell
devflow work unblock phase-3-work-registry --json
```

Outputs:

- `work_unblock` JSON wrapper
- unblocked work item payload
- appended `work.unblocked` event

Unblocked items appear under `work.active` in `devflow status` and no longer
carry `blockedReason`.

## `devflow work list`

Lists local work items derived from the append-only event log.

Example:

```powershell
devflow work list --json
devflow work list --status active --json
```

Outputs:

- `work_list` JSON wrapper
- optional `filters.status`
- work item ids, titles, descriptions, owned paths, status, and lifecycle
  timestamps

Without `--json`, the command renders a compact terminal list with status, id,
and title. `devflow status` uses the same derived work state to populate active
work items.

## `devflow split`

Generates non-overlapping parallel sessions.

Example:

```powershell
devflow split --sessions 4 --goal "next OpenCairn development slices" --profile standard --platform powershell --json
devflow split --register --start --json
```

Inputs:

- goal
- session count
- profile
- platform
- optional `.devflow/config.json` `split.tasks`
- optional preferred agents
- optional base branch
- optional worktree root
- optional paths to include or avoid
- optional `--register` to append `work.created` events for generated sessions
- optional `--start` with `--register` to append `work.started` events for the
  same sessions

Outputs:

- branch/worktree commands
- one prompt per session
- owned paths
- paths to avoid
- verification commands
- merge/review order
- optional `registration` evidence when `--register` is provided

When `split.tasks` exists in `.devflow/config.json`, `devflow split` uses those
project-specific tasks unless explicit tasks are supplied by an MCP caller.
This lets a project define stable ownership boundaries and verification gates
without hard-coding them into an agent prompt.
When `--register` is present, each generated session id becomes a work item id,
the session goal becomes the work item title, and owned paths are copied into
the registry. `--start` marks those generated work items active in the same
local event log so `devflow work list` and `devflow status` can see them without
manual re-entry. Re-running the same split registration reuses existing
`work.created` and `work.started` events instead of appending duplicates.

JSON output:

```json
{
  "schemaVersion": "0.1",
  "command": "split",
  "runId": "2026-05-15-opencairn-next",
  "goal": "next OpenCairn development slices",
  "profile": {
    "name": "standard",
    "requiredRuntime": false
  },
  "platform": {
    "name": "powershell",
    "shell": "pwsh"
  },
  "base": {
    "branch": "main",
    "ref": "origin/main"
  },
  "sessions": [
    {
      "id": "worker-static-quality",
      "role": "implementation",
      "agent": {
        "preferred": "Codex",
        "fallback": "generic-shell"
      },
      "branch": "codex/worker-static-quality",
      "worktreePath": ".worktrees/worker-static-quality",
      "ownedPaths": ["apps/worker/**"],
      "avoidPaths": ["apps/web/**", "apps/api/**", "packages/db/**"],
      "readFirst": [
        "AGENTS.md",
        "docs/README.md",
        "docs/testing/strategy.md"
      ],
      "goal": "Reduce worker static-quality failures without mixing unrelated refactors.",
      "commands": [
        {
          "id": "create-worker-worktree",
          "intent": "createWorktree",
          "variants": {
            "powershell": "git fetch origin; git worktree add .worktrees/worker-static-quality -b codex/worker-static-quality origin/main",
            "posix": "git fetch origin && git worktree add .worktrees/worker-static-quality -b codex/worker-static-quality origin/main"
          }
        }
      ],
      "verification": [
        {
          "id": "worker-ruff",
          "command": "uv run ruff check .",
          "cwd": "apps/worker"
        }
      ],
      "prompt": "You are working in OpenCairn..."
    }
  ],
  "collisionRisks": [
    {
      "paths": ["packages/db/**"],
      "reason": "Database schema changes can affect web, api, worker, and tests."
    }
  ],
  "mergeOrder": [
    "docs-health-registry-audit",
    "worker-static-quality",
    "hocuspocus-smoke-stability",
    "e2e-gate-seed-hardening"
  ],
  "registration": {
    "schemaVersion": "0.1",
    "command": "split_register",
    "runId": "2026-05-15-opencairn-next",
    "created": ["work.created events"],
    "started": ["work.started events"]
  },
  "warnings": []
}
```

## `devflow explain`

Explains beginner-facing development terms in plain language at the point of
work.

Example:

```powershell
devflow explain "toast notification" --context "The save action should show a toast notification." --json
```

Inputs:

- term
- optional project or agent-output context

Outputs:

- plain language explanation
- project context
- why it matters
- verification steps
- related terms
- warnings when the term is not in the built-in glossary seed

## `devflow prompt rewrite`

Turns a vague maintainer request into an agent-ready prompt with inferred
intent, requirements, missing details, and verification expectations.

Example:

```powershell
devflow prompt rewrite --request "알아서 다음 구현 계속해" --context "Phase 7 still needs prompt rewrite helper." --json
```

Inputs:

- raw maintainer request
- optional project context

Outputs:

- inferred intent
- requirements checklist
- missing details to resolve from local context
- copy-paste agent-ready prompt

## `devflow sessions codex`

Discovers Codex sessions from an explicitly supplied Codex home directory.

Example:

```powershell
devflow sessions codex --repo C:\Users\Sungbin\Documents\GitHub\solo-devflow-os --codex-home C:\Users\Sungbin\.codex --json
```

The command composes the adapter helpers:

- locate JSONL candidates under `codexHome/sessions`
- parse safe metadata from caller-selected JSONL content
- normalize records into `session.discovered` events

Privacy boundary:

- it is read-only
- it requires explicit `--codex-home`
- it returns metadata, confidence, signals, source paths, and warnings
- it does not attach sessions to work items
- it should not become a Codex authentication or credential reader

## `devflow sessions attach-plan`

Builds dry-run proposals for linking discovered sessions to work items.

Example:

```powershell
devflow sessions attach-plan --input .devflow/attach-plan-input.json --json
```

Input JSON:

```json
{
  "workItems": [
    {
      "id": "phase-6-session-import",
      "title": "Phase 6 session import",
      "ownedPaths": ["packages/adapters/**"]
    }
  ],
  "sessions": [
    {
      "sessionId": "example",
      "agent": "Codex",
      "project": { "confidence": "high" },
      "events": [
        {
          "type": "git.diff.captured",
          "changedFiles": ["packages/adapters/src/index.js"]
        }
      ]
    }
  ]
}
```

Outputs:

- attach-ready or confirmation-required proposals
- recommended work item id when path ownership matches
- confidence and changed-file evidence
- warnings copied from discovered sessions

This command does not write state. `devflow sessions attach` creates
`session.attached` events only after confirmation rules are satisfied.

## `devflow sessions attach`

Writes an approved attach-plan proposal as a `session.attached` event.

Example:

```powershell
devflow sessions attach --repo C:\Users\Sungbin\Documents\GitHub\solo-devflow-os --input .devflow/attach-plan.json --session high-confidence --confirm --json
```

Inputs:

- repository path
- attach-plan JSON containing `proposals`
- selected session id
- explicit `--confirm`

Outputs:

- `session_attach` JSON wrapper
- appended `.devflow/state/events.jsonl` `session.attached` event
- status-visible attached session evidence

Safety boundary:

- it refuses to run without `--confirm`
- it requires a proposal with `sessionId` and `recommendedWorkItemId`
- it reports an existing attachment instead of appending a duplicate event
- it records the selected proposal; it does not rediscover or infer sessions
  during the write step
- low-confidence proposals should still be treated as maintainer-approved
  decisions before this command is run

## `devflow sessions list`

Lists attached sessions from local `.devflow` state.

For copy-paste filter combinations, see
[Session List Filter Examples](../examples/session-list-filters.md).

Example:

```powershell
devflow sessions list --repo C:\Users\Sungbin\Documents\GitHub\solo-devflow-os --json
devflow sessions list --repo C:\Users\Sungbin\Documents\GitHub\solo-devflow-os --agent Codex --work phase-6-session-import --json
devflow sessions list --repo C:\Users\Sungbin\Documents\GitHub\solo-devflow-os --work phase-6-session-import --since 2026-05-15T12:00:00.000Z --limit 1
devflow sessions list --repo C:\Users\Sungbin\Documents\GitHub\solo-devflow-os --sort observedAt:desc --limit 5
```

Outputs:

- `session_list` JSON wrapper
- attached session id, work item id, agent, confidence, changed files, and
  observed time
- `filters.agent` when `--agent <name>` is used
- `filters.since` when `--since <iso-date>` is used
- `filters.sort` when `--sort observedAt:asc|observedAt:desc` is used
- `filters.limit`, `totalCount`, and limited `count` when `--limit <n>` is used
- warning entries from the local state reader

Without `--json`, the command renders a short human-readable list with the
active filter, count, and one line per session. Session lines include kind,
work item, agent, observed time, and either the session id plus changed-file
count or the manual note summary. If local state warnings are present, the text
output includes a compact warning count.

This command does not read Codex, Claude, or Gemini history. It only renders
links already recorded in `.devflow/state/events.jsonl`. Use `--work <id>` to
limit the list to one work item. Use `--agent <name>` to limit the list to one
agent before the work item filter is applied. Use `--limit <n>` to show only the
most recent matching sessions after the filters are applied. Use
`--since <iso-date>` to show sessions observed at or after that timestamp. Limit
values must be positive integers, and since values must parse as dates. Use
`--sort observedAt:asc|observedAt:desc` to order matching sessions by
observation time before applying `--limit`. Without `--sort`, the default
recorded order and recent-match limit behavior remain unchanged.

## `devflow sessions note`

Records a manual or external session note as local session evidence.

Example:

```powershell
devflow sessions note --repo C:\Users\Sungbin\Documents\GitHub\solo-devflow-os --work phase-6-session-import --agent manual --summary "Reviewed local session context outside an agent transcript." --json
```

Inputs:

- repository path
- work item id
- agent label, defaulting to `manual`
- summary text

Outputs:

- `session_note` JSON wrapper
- appended `.devflow/state/events.jsonl` `session.message` event
- session list/status-visible manual note evidence

Use this when work happened in a browser, terminal, IDE, meeting, or agent host
that does not have a stable adapter yet.

## `devflow doctor`

Inspects the local execution contract that agent hosts should respect before
running commands.

Example:

```powershell
devflow doctor --repo C:\Users\Sungbin\Documents\GitHub\solo-devflow-os --platform windows-powershell --json
```

Inputs:

- repository path
- platform
- optional `.devflow/mistakes.json` repeated-mistake memory
- local tool availability

Outputs:

- platform shell and path style
- preferred read/search commands
- shell patterns to avoid
- local tool availability
- repeated mistakes and corrections
- recommendations that plugin skills or MCP tools can inject into the next
  session

Repeated mistakes are stored as local project memory:

```json
{
  "mistakes": [
    {
      "id": "powershell-literal-path",
      "symptom": "Agent used Bash-style path handling in PowerShell.",
      "correction": "Use Get-Content -LiteralPath and quote Windows paths.",
      "appliesTo": ["windows-powershell"]
    }
  ]
}
```

JSON output:

```json
{
  "schemaVersion": "0.1",
  "command": "doctor",
  "platform": {
    "name": "windows-powershell",
    "shell": "pwsh",
    "pathStyle": "windows"
  },
  "executionContract": {
    "preferredReadCommand": "Get-Content -LiteralPath",
    "preferredSearchCommand": "rg",
    "pathQuoting": "single-quote literal Windows paths",
    "avoid": ["bash-specific syntax", "tmux assumptions", "unquoted paths with spaces"]
  },
  "memory": {
    "source": ".devflow/mistakes.json",
    "repeatedMistakes": []
  },
  "recommendations": [
    {
      "kind": "platform",
      "message": "Use Get-Content -LiteralPath for file reads and keep commands PowerShell-compatible."
    }
  ],
  "warnings": []
}
```

## `devflow finish`

Closes a work item with evidence.

Example:

```powershell
devflow finish --work worker-static-quality --profile standard --platform powershell --json
```

Guided renderer:

```powershell
devflow finish --work worker-static-quality --guided
```

Inputs:

- work item
- changed files
- gate results
- review state
- skipped checks and reason
- optional PR URL
- optional next task

Outputs:

- completion summary
- unresolved risks
- PR/review recommendation
- next-session prompt
- append-only `.devflow/state/events.jsonl` `work.completed` event

JSON output:

```json
{
  "schemaVersion": "0.1",
  "command": "finish",
  "workItem": {
    "id": "worker-static-quality",
    "title": "Worker static-quality cleanup",
    "status": "completed"
  },
  "summary": {
    "intent": "Reduced worker lint failures in the owned worker boundary.",
    "changedFiles": [
      {
        "path": "apps/worker/src/ingest/drive_activities.py",
        "status": "modified",
        "reason": "Removed unused imports and tightened payload typing."
      }
    ]
  },
  "evidence": {
    "gates": [
      {
        "id": "worker-ruff",
        "command": "uv run ruff check .",
        "cwd": "apps/worker",
        "status": "passed",
        "observedAt": "2026-05-15T14:35:00+09:00",
        "summary": "No ruff failures."
      }
    ],
    "skipped": [
      {
        "id": "full-e2e",
        "reason": "Worker-only lint cleanup did not touch browser paths."
      }
    ]
  },
  "review": {
    "recommendation": "pull-request",
    "reason": "Touches worker runtime code and should receive review before merge.",
    "prUrl": null
  },
  "risks": [
    {
      "severity": "low",
      "message": "No live ingest smoke was run."
    }
  ],
  "nextSession": {
    "recommendedAgent": "Codex",
    "profile": "standard",
    "platform": "powershell",
    "prompt": "Continue OpenCairn from worker-static-quality..."
  }
}
```

## Platform Command Generation

Platform adapters render the same command descriptor differently.

### Windows PowerShell 7

- Use PowerShell syntax as the primary Windows output.
- Prefer `;` only when the next command may still be useful after a successful
  setup command. Use `if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }` when
  failure must stop the sequence.
- Quote paths with single quotes unless interpolation is required.
- Use Windows paths for native tools and explicit WSL paths only when the
  command is rendered for WSL.
- Do not assume `tmux`, Bash, or GNU-only utilities.

Example:

```powershell
git fetch origin
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
git worktree add '.worktrees/worker-static-quality' -b 'codex/worker-static-quality' 'origin/main'
```

### WSL/Linux

- Use POSIX shell syntax.
- Prefer `&&` for dependent command chains.
- Use repo-relative paths when possible.
- `tmux` commands may be offered only when the user requests orchestration or a
  profile explicitly needs it.
- Do not emit Windows drive paths unless the adapter has converted them to
  `/mnt/<drive>/...`.

Example:

```sh
git fetch origin && git worktree add .worktrees/worker-static-quality -b codex/worker-static-quality origin/main
```

### macOS

- Use POSIX shell syntax.
- Assume common developer tools may come from Homebrew, but do not hard-code
  Homebrew paths unless detection found them.
- Prefer commands that also work on Linux unless macOS needs a distinct path or
  process rule.

Example:

```sh
git fetch origin && git worktree add .worktrees/worker-static-quality -b codex/worker-static-quality origin/main
```

## Generated artifacts

The MVP no longer exposes a persistent `devflow dashboard` command. Visual
surfaces should be generated on demand from structured state when a maintainer
asks for a review sheet, split board, timeline, or handoff view. HTML artifacts
are views, not state, and should not be fed back into agent context by default.
