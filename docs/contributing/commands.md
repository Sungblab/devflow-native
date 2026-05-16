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
devflow status
devflow split
devflow explain
devflow finish
devflow prompt next
devflow dashboard
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

`devflow split` now has a first thin CLI renderer over the core split contract,
but work-item persistence and project-specific split discovery remain later
slices. `devflow init` and `devflow dashboard` stay in the broad contract.
`doctor` is included early because plugin/skill-first workflows need a cheap
way to avoid repeated local-environment mistakes.

## MVP State Persistence

The MVP loop stores local evidence in an append-only JSONL event log:

```text
.devflow/state/events.jsonl
```

`devflow finish` appends one `work.completed` event containing the finish JSON
contract. Agent hosts may also record standalone `gate.finished` evidence
through the MCP layer before a work item is closed. `devflow status` reads the
same log and derives the latest handoff and latest gate evidence from it. The
event log is local-first project state and is ignored by git by default in this
repository.

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

## `devflow status`

Reads current project state.

Example:

```powershell
devflow status --repo C:\Users\Sungbin\Documents\GitHub\solo-devflow-os --profile standard --platform powershell --json
```

Beginner-friendly renderer:

```powershell
devflow status --simple
```

Inputs:

- repository path
- profile
- platform
- optional agents to probe
- optional work item id

Outputs:

- branch and dirty files
- active work items
- latest handoffs from `.devflow/state/events.jsonl`
- configured gates
- latest gate evidence from `.devflow/state/events.jsonl`
- recommended next checks

JSON output:

```json
{
  "schemaVersion": "0.1",
  "command": "status",
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

## `devflow split`

Generates non-overlapping parallel sessions.

Example:

```powershell
devflow split --sessions 4 --goal "next OpenCairn development slices" --profile standard --platform powershell --json
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

Outputs:

- branch/worktree commands
- one prompt per session
- owned paths
- paths to avoid
- verification commands
- merge/review order

When `split.tasks` exists in `.devflow/config.json`, `devflow split` uses those
project-specific tasks unless explicit tasks are supplied by an MCP caller.
This lets a project define stable ownership boundaries and verification gates
without hard-coding them into an agent prompt.

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

## `devflow dashboard`

Starts the local dashboard.

Initial views:

- active work
- gates
- parallel sessions
- maps
- handoffs
- sessions
