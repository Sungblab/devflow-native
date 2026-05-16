# Roadmap

## Phase 0: Product Contract

Deliverables:

- product plan
- architecture
- research notes
- roadmap
- initial command contract
- dashboard information architecture

Exit criteria:

- the product is clearly not just another coding agent
- the first implementation slice can be built without redesigning the whole
  concept

## Phase 1: Plugin-Friendly Status, Finish, Doctor, And Next Prompt MVP

Build:

- `devflow status`
- `devflow finish`
- `devflow doctor`
- `devflow prompt next`
- local `.devflow/` state files
- git dirty-file capture
- gate evidence capture
- platform execution contract and repeated-mistake memory capture
- repo-local Codex plugin wrappers for the start/status/doctor and finish
  evidence loops
- Markdown next-session handoff output

Exit criteria:

- the maintainer can see the current repo/work/gate state before starting work
- the maintainer can inspect Windows/PowerShell, WSL/Linux, or macOS execution
  rules before asking an agent to run commands
- a completed task can record changed files, commands run, skipped checks,
  risks, and a next-session prompt
- the product's first daily loop works from plugin skills, CLI, or future MCP
  tools without dashboard or hosted sync

## Phase 2: Repo Scaffold And Health

Build:

- `devflow init`
- template installer
- `.devflow/config.json`
- docs/maps/testing/workflow templates
- project health scanner

Exit criteria:

- a new repo can get a complete development workflow scaffold
- health status can detect missing docs, gates, and workflow files

## Phase 3: Split Planning

Build:

- `devflow split`
- work item registry
- `devflow work create/start/list`

Exit criteria:

- split output can produce platform-specific worktree commands and one
  self-contained prompt per session
- work items can be registered and listed from local state

## Phase 4: Gate Runner

Build:

- gate definitions
- command execution and output capture
- pass/fail history
- dirty-file based recommendations
- secret redaction

Exit criteria:

- project-specific verification can be run and recorded
- skipped or failing gates remain visible

## Phase 5: MCP And Agent Integrations

Build:

- local Devflow MCP server
- `devflow.doctor` MCP tool
- `devflow.status` MCP tool
- `devflow.split` MCP tool
- `devflow.finish` MCP tool
- `devflow.record_gate` MCP tool
- `devflow.next_prompt` MCP tool
- `devflow.rewrite_prompt` MCP tool
- `devflow.sessions_codex` MCP tool
- `devflow.sessions_attach_plan` MCP tool
- Claude Code plugin draft with slash commands
- Codex MCP config template
- Gemini MCP config template
- Superpowers profile instructions that treat Devflow as a continuity layer,
  not a replacement methodology

Exit criteria:

- Codex, Claude Code, or another MCP-capable host can read the same project
  state as the CLI
- agent-host authentication remains owned by the host
- plugin/slash-command UX calls the same core contracts as the CLI

Current implementation note: `packages/mcp` has testable handler functions for
`devflow.status`, `devflow.split`, `devflow.explain_term`, `devflow.doctor`,
`devflow.finish`, `devflow.record_gate`, `devflow.next_prompt`, and
`devflow.rewrite_prompt`, plus adapter-backed `devflow.sessions_codex` and
dry-run `devflow.sessions_attach_plan`, and a
minimal stdio JSON-RPC transport. The CLI also has thin `devflow split --json`
and `devflow explain` renderers, plus `devflow prompt rewrite` for converting
vague maintainer intent into agent-ready requirements. Host-specific Codex and
Gemini MCP config templates are present. Project-specific split discovery can now read
`.devflow/config.json` `split.tasks`; richer docs/code map inference remains
later work. The repo-local plugin ships shared `start`, `split`, `next`,
`explain`, `rewrite`, `sessions`, and `finish` skills for Codex and Claude Code style plugin
workflows.

## Phase 6: Session Import

Build:

- Codex session adapter
- Claude session adapter
- Gemini session adapter
- manual session notes
- session-to-work-item linking

Exit criteria:

- active and historical agent sessions can be attached to a task
- dashboard can show what each session did and where it stopped

Current implementation note: `packages/adapters` has first read-only Codex
session discovery helpers. `findCodexSessionFiles` locates candidate JSONL
files under an explicit `codexHome/sessions` directory without parsing private
contents. `parseCodexSessionJsonl` extracts safe metadata from caller-provided
JSONL content. `discoverCodexSessions` accepts caller-supplied Codex-like records and
normalizes them into discovery events with confidence, source, and warning
fields. The CLI exposes this as `devflow sessions codex --codex-home <path>
--json`; MCP exposes the same read-only probe as `devflow.sessions_codex`. It
does not attach sessions to work items. Core has a pure
`createSessionAttachPlan` contract that proposes attach candidates and keeps
low-confidence sessions confirmation-gated before any future state write. The
CLI exposes this dry-run planner as `devflow sessions attach-plan --input
<json-file> --json`; MCP exposes the same dry-run planner as
`devflow.sessions_attach_plan`. The CLI also exposes
`devflow sessions attach --input <json-file> --session <id> --confirm --json`
to append an approved `session.attached` event to local state.

## Phase 7: Beginner Guidance Profile

Build:

- `devflow status --simple` (implemented as a CLI renderer)
- `devflow finish --guided` (implemented as a CLI renderer)
- `devflow explain <term>`
- glossary seed for common UI, web, git, testing, deployment, and agent terms
- prompt rewrite helper that turns vague intent into agent-ready requirements
  (implemented as `devflow prompt rewrite`)

Exit criteria:

- a beginner can understand common terms such as sidebar, toast, modal,
  responsive layout, route, state, middleware, branch, test, and deploy in the
  context of the current project
- simple/guided output remains a renderer over the same core state, not a
  separate product model

## Phase 8: Local Dashboard

Build:

- active work view
- timeline
- gates view
- maps view
- sessions view
- handoffs view

Exit criteria:

- the maintainer can open one local dashboard and understand project state

## Phase 9: GitHub Review Integration

Build:

- `gh`-based PR metadata import
- review comment/thread import
- review resolution state
- PR readiness summary

Exit criteria:

- solo PR review flow is visible without manually browsing GitHub comments

## Phase 10: Controlled Orchestration

Build:

- launch templates
- one primary session plus one reviewer session
- optional parallel worktree tasks
- stuck-session detection

Exit criteria:

- orchestration improves continuity rather than increasing cognitive load

## Phase 11: Cross-Project Memory

Build:

- global project index
- reusable workflow profiles
- reusable gate profiles
- reusable prompt profiles
- searchable decisions and lessons

Exit criteria:

- starting a new serious project reuses proven workflow structure immediately
