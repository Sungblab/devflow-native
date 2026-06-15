# Architecture

## System Overview

Devflow Native is a local workflow continuity harness with repo-aware plugin
hooks, a CLI fallback, local state, a local MCP server, agent integrations,
generated artifact views, and project scaffolding templates.

```text
             AI tools / terminals / IDEs
        Codex   Claude   Hermes   shell   future MCP hosts
             \     |       |       |      /
       MCP tools / plugins / session adapters / hooks
                       |
                    ingest
                       |
      git + checks + reviews + docs scanners
                       |
                  core event store
                       |
     plugin hooks      MCP server      CLI fallback
                       |
             repo scaffold + handoff docs
```

## Recommended Stack

- Language: TypeScript
- Runtime: Node.js first, Bun optional
- CLI: `commander` or `cac`
- Storage: SQLite
- Visual artifacts: single-file HTML generated from structured state on demand
- Graphs: Mermaid first, React Flow later
- Git: direct `git` process calls first, library later if useful
- GitHub: `gh` CLI first, Octokit later if needed

This stack keeps Windows PowerShell support practical while still working well
on WSL, macOS, and Linux.

## Packages

```text
packages/core
  project model, event store, gate runner, git scanner, handoff generator
  shared JSON schemas for handoff and gate evidence

packages/cli
  devflow harness/init/status/split/finish/doctor/gates/session/review

packages/mcp
  devflow.init/status/split/finish/doctor/next_prompt/rewrite_prompt/session/work/review/gate/harness tools

packages/integrations
  Claude Code plugin, Codex plugin and MCP config, editor hooks

plugins/devflow
  repo-local Codex and Claude Code plugin drafts with hooks, skills, and MCP
  config over the same core contracts

packages/adapters
  Codex, Claude, Copilot, OpenCode, Goose, Aider, GitHub,
  generic shell, test output parsers

templates
  AGENTS.md, docs index, architecture maps, testing strategy, health scripts
```

Initial implementation boundaries are documented in:

- [`../packages/core/README.md`](../packages/core/README.md)
- [`../packages/cli/README.md`](../packages/cli/README.md)
- [`../packages/mcp/README.md`](../packages/mcp/README.md)
- [`../packages/adapters/README.md`](../packages/adapters/README.md)

## Data Model

Primary entities:

- Project
- WorkItem
- Session
- Event
- Gate
- GateRun
- ChangedFile
- ReviewThread
- Handoff
- MapNode
- MapEdge

Events are append-only. Derived views can be rebuilt. Session attach planning
is separate from `session.attached` persistence: core may propose attach-ready
or confirmation-required links from discovered sessions and work items, but a
later command must perform the actual state write.
The initial write path is `devflow sessions attach --confirm`, which consumes a
selected attach-plan proposal and appends a `session.attached` event. MCP hosts
use `devflow.sessions_attach` with `confirm: true` for the same write. Repeated
attach requests for the same session/work item return the existing event rather
than appending duplicates.

## Event Types

- `work.created`
- `work.started`
- `work.updated`
- `work.ready`
- `work.blocked`
- `work.unblocked`
- `session.attached`
- `session.message`
- `git.status.captured`
- `git.diff.captured`
- `gate.started`
- `gate.finished`
- `review.imported`
- `handoff.generated`
- `work.completed`

## CLI Commands

```text
devflow init
devflow harness inspect
devflow harness plan
devflow harness install
devflow harness health
devflow harness repair
devflow status
devflow work create
devflow work start
devflow work update
devflow work rename
devflow work ready
devflow work block
devflow work unblock
devflow work list
devflow session attach
devflow gates run
devflow review import
devflow finish
devflow prompt next
devflow doctor
```

## MCP Tools

The MCP server exposes the same core contracts to agent hosts. It should be
usable from Codex, Claude Code, and any future MCP-capable coding agent
without granting those hosts extra credentials.

Initial tools:

```text
devflow.status
devflow.init
devflow.split
devflow.finish
devflow.doctor
devflow.next_prompt
devflow.record_gate
devflow.gates_run
devflow.explain_term
devflow.rewrite_prompt
devflow.sessions_codex
devflow.sessions_attach_plan
devflow.sessions_attach
devflow.sessions_list
devflow.sessions_note
devflow.work_create
devflow.work_start
devflow.work_update
devflow.work_rename
devflow.work_ready
devflow.work_block
devflow.work_unblock
devflow.work_list
```

Rules:

- MCP tools call `packages/core`; they do not reimplement CLI behavior.
- Shared option parsing and validation for agent-facing contracts lives in
  `packages/core` so CLI and MCP adapters reject the same inputs.
- Tools should return structured JSON plus short human-readable summaries.
- Tools must not reuse Codex or Claude authentication tokens.
- Host-specific plugins may wrap these tools in slash commands or skills.
- The first implementation is a testable handler layer. Stdio or HTTP MCP
  transport can wrap the same handlers later.

## Agent Integrations

Agent integrations are distribution and UX layers over the same core and MCP
contracts.

- Codex: native plugin, lifecycle hooks, MCP configuration, session discovery,
  resume metadata, and local history import. Codex authentication remains owned
  by Codex.
- Codex plugin: repo-local `plugins/devflow` package with `.codex-plugin`,
  skills, hooks, and optional bundled MCP config that call the same local
  CLI/MCP contracts.
- Claude Code: plugin with slash commands, skills, hooks, and optional bundled
  MCP server configuration. Claude authentication remains owned by Claude Code.
- Claude Code plugin draft: repo-local `plugins/devflow/.claude-plugin`
  manifest sharing the same `plugins/devflow/skills` contracts as the Codex
  plugin.
- Hermes Agent: adapter target for persistent-agent session records, memories,
  and tool events when exposed locally.
- Generic shell: manual command and note capture for work that has no agent
  host.

The goal is for a maintainer to run `/devflow:finish` or equivalent inside the
agent they already use, while the same state remains available through
`devflow finish` in a terminal.

Plugin skills should also be able to call `devflow doctor` or the future
`devflow.doctor` MCP tool before command-heavy work. That output carries the
local execution contract and repeated-mistake memory so Codex, Claude Code,
Hermes, and profile-driven workflows do not relearn the same shell,
path, encoding, transport, or setup rules every session.

Repeated-mistake memory is layered. Public product templates should describe
general failure categories. Project-local state may contain repo-specific
corrections. Private maintainer memory may contain personal paths, preferred
tools, or historical examples. The core model stores the category and scope so
public scaffolds do not leak personal workflow details.

Superpowers is a methodology/profile input, not a required runtime. CodeGraph
and similar systems are optional context providers whose freshness must be
reported when used. The core finish path should rely on explicit status,
session, gate, review, and handoff evidence rather than assuming a methodology
plugin or graph index is current.

## Agent Adapters

Agent adapters normalize different tool histories and runtime behavior into the
same devflow model.

Initial adapter targets:

- Codex: sessions, exec/resume metadata, tool calls, changed files.
- Claude Code: project JSONL history, hooks, todos, subagent activity.
- GitHub Copilot CLI: command-driven coding sessions and PR context.
- OpenCode: local database/session history.
- Goose: local database/session history.
- Aider: git-backed coding sessions and commit history.
- Generic shell: manual notes, commands, and output capture.

Adapters should emit normalized events. The rest of the product should not care
which agent produced the work.

## Platform Adapters

Platform adapters handle shell and path differences.

- Windows: PowerShell 7, Windows paths, `gh`, `git`, Node, pnpm, uv, Docker
  Desktop, optional WSL bridge.
- Linux: POSIX shell, tmux-friendly orchestration, native Docker.
- macOS: POSIX shell, Homebrew conventions, native terminal agent workflows.

The core model stores normalized paths and commands with platform metadata.
Command generation should produce platform-specific variants when necessary.

## Generated Artifact Views

Devflow should not maintain a persistent dashboard in the MVP. When the state is
too dense for compact text, plugin skills or MCP tools may generate single-file
HTML artifacts from structured `.devflow` state:

- review sheets for changed files, gate evidence, skipped checks, and risks
- split boards for worktree/session planning
- timeline views for session, gate, review, and handoff events
- handoff views for next-session prompts and unresolved risks

## Research Boundary

Private research harnesses may evaluate Devflow state, but they do not replace
the product model. Research notes, experiment fixtures, conditions, scoring
logic, and non-public reports live in the private `devflow-native-research`
repository. Product code should not depend on private experiment runners.

Generated artifacts are views. They must not become the source of truth, and
agents should not read full HTML back into context by default.

## Project Scaffold

Each initialized project can receive:

```text
AGENTS.md
docs/README.md
docs/architecture/maps/
docs/testing/strategy.md
docs/contributing/workflow.md
scripts/project-health.*
.devflow/config.json
.devflow/state/
.github/workflows/devflow.yml
plugins/devflow/
```

## Boundaries

The core must not depend on generated artifact rendering. CLI, MCP, and plugin
hooks depend on core. Adapters are replaceable and should emit normalized events
rather than leaking provider-specific formats through the system.

## Security

- Local-first by default.
- No cloud sync unless explicitly enabled.
- Redact secrets from captured command output.
- Do not store API keys.
- GitHub access should use the user's existing `gh` authentication first.
- Dangerous commands should be recorded, not silently replayed.
