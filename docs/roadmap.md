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
- health status can detect missing docs, workflow files, and malformed gates

Current implementation note: `devflow init` has a first confirmation-gated
scaffold path. The CLI renders a scaffold plan by default and writes
`.devflow/config.json`, `AGENTS.md`, docs router, workflow, testing strategy,
and architecture map index only with `--confirm`, skipping existing files
instead of overwriting them. `devflow health` and MCP `devflow.health` can now
report missing scaffold files, configured gates, and invalid gate definitions
with missing ids, missing commands, or duplicate ids. Template customization
remains later Phase 2 work.

## Phase 3: Split Planning

Build:

- `devflow split`
- work item registry
- `devflow work create/start/ready/block/list`

Exit criteria:

- split output can produce platform-specific worktree commands and one
  self-contained prompt per session
- work items can be registered and listed from local state

Current implementation note: `devflow work create`, `devflow work start`,
`devflow work ready`, `devflow work block`, and `devflow work list` now append
and derive local work item state from
`.devflow/state/events.jsonl`. MCP exposes the same contract as
`devflow.work_create`, `devflow.work_start`, `devflow.work_ready`,
`devflow.work_block`, and `devflow.work_list`, and `devflow status` now reads
active, blocked, and ready-to-finish work items from derived state.
`devflow split --register --start` and MCP `devflow.split` with
`register: true` and `start: true` can also register generated split sessions
as active work items. Repeated create/start and split registration writes are
idempotent by work item id. Richer work item fields and update/rename commands
remain later Phase 3 work.

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

Current implementation note: `devflow gates run <id>` and MCP
`devflow.gates_run` can execute a configured `.devflow/config.json` gate as a
single process command, capture stdout/stderr summaries, record exit code and
pass/fail status in `.devflow/state/events.jsonl`, and surface that evidence
through `devflow status`. Shell-operator support, richer output redaction, and
multi-step gate descriptors remain later Phase 4 work.

## Phase 5: MCP And Agent Integrations

Build:

- local Devflow MCP server
- `devflow.doctor` MCP tool
- `devflow.status` MCP tool
- `devflow.split` MCP tool
- `devflow.finish` MCP tool
- `devflow.record_gate` MCP tool
- `devflow.gates_run` MCP tool
- `devflow.next_prompt` MCP tool
- `devflow.rewrite_prompt` MCP tool
- `devflow.sessions_codex` MCP tool
- `devflow.sessions_attach_plan` MCP tool
- `devflow.sessions_attach` MCP tool
- `devflow.sessions_list` MCP tool
- `devflow.sessions_note` MCP tool
- `devflow.work_create` MCP tool
- `devflow.work_start` MCP tool
- `devflow.work_ready` MCP tool
- `devflow.work_block` MCP tool
- `devflow.work_list` MCP tool
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
`devflow.finish`, `devflow.record_gate`, `devflow.gates_run`,
`devflow.next_prompt`, and `devflow.rewrite_prompt`, plus adapter-backed
`devflow.sessions_codex` and
dry-run `devflow.sessions_attach_plan`, confirmed-write
`devflow.sessions_attach`, read-only `devflow.sessions_list`, manual
`devflow.sessions_note`, local work item tools `devflow.work_create`,
`devflow.work_start`, `devflow.work_ready`, `devflow.work_block`, and
`devflow.work_list`, and a
minimal stdio JSON-RPC transport. The CLI also has `devflow split --json` with
optional work registration and `devflow explain` renderers, plus `devflow prompt rewrite` for converting
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
to append an approved `session.attached` event to local state; MCP exposes the
same confirmed write as `devflow.sessions_attach`. Duplicate session/work item
links return the existing event without appending another JSONL line. Attached
session links are visible through `devflow sessions list --json` and MCP
`devflow.sessions_list`. Manual or external session context can be recorded via
`devflow sessions note --work <id> --summary <text> --json` or MCP
`devflow.sessions_note`, and appears in the same session list. Session list
supports work item filtering through CLI `--work <id>` and MCP `work` or
`workItemId`, agent filtering through CLI `--agent <name>` and MCP `agent`, plus
timestamp filtering through CLI `--since <iso-date>` and MCP `since`, and
recent-match limiting through CLI `--limit <n>` and MCP `limit`. Explicit
chronological ordering is available before limiting through CLI
`--sort observedAt:asc|observedAt:desc` and MCP `sort`. The CLI also has a
human-readable default renderer for quick terminal inspection while `--json`
keeps the agent contract stable.

## Phase 7: Beginner Guidance Profile

Build:

- `devflow status --simple` (implemented as a CLI renderer, including work
  filter, agent filter, session evidence counts, latest session work item,
  session id, observed time, agent, kind, summary, and changed-file count)
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

- `devflow dashboard` local summary contract
- active work view
- timeline
- gates view
- maps view
- sessions view
- handoffs view

Exit criteria:

- the maintainer can open one local dashboard and understand project state

Current implementation note: `devflow dashboard` and MCP `devflow.dashboard`
now render the first local dashboard contract: active, blocked, and
ready-to-finish work counts, item lists, latest gate evidence, latest handoff
state, stale handoff counts, attached/manual session counts, recent sessions,
agent breakdown, recent timeline events, architecture map entries, and one
next-action recommendation from `.devflow/state/events.jsonl` plus
`docs/architecture/maps/*.md`. `devflow dashboard --html <path>` now writes a
static browser shell from the same summary, and `devflow dashboard serve`
serves that shell plus `/dashboard.json` over local HTTP. The server also
includes dedicated `/gates`, `/sessions`, `/handoffs`, and `/maps` HTML views
plus `/gates.json`, `/sessions.json`, `/handoffs.json`, and `/maps.json`
slices. A richer Vite/React dashboard and linked detail pages remain later
Phase 8 work.

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
