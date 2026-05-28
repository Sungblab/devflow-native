# Roadmap

## Phase 0: Product Contract

Deliverables:

- product plan
- architecture
- roadmap
- initial command contract
- plugin-first information architecture

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
- `devflow prompt latest`
- repo-local Codex/Claude plugin hooks for start, prompt intent, and finish
  guard context
- local `.devflow/` state files
- git dirty-file capture
- gate evidence capture
- platform execution contract and repeated-mistake memory capture
- repo-local Codex plugin wrappers for the start/status/doctor and finish
  evidence loops
- Markdown next-session handoff output and latest prompt projection

Exit criteria:

- the maintainer can see the current repo/work/gate state before starting work
- the maintainer can inspect Windows/PowerShell, WSL/Linux, or macOS execution
  rules before asking an agent to run commands
- a completed task can record changed files, commands run, skipped checks,
  risks, and a next-session prompt
- the product's first daily loop works from plugin skills, CLI, or future MCP
  tools without a dashboard or hosted sync

## Private Research Track

Active research notes, reports, paper drafts, pilot fixtures, and scoring
scripts are maintained outside this public repository in the private
`devflow-native-research` repository. This public roadmap tracks product work.

## Phase 2: Repo Scaffold And Health

Build:

- `devflow init`
- `devflow harness inspect`
- `devflow harness plan`
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

Current implementation note: `devflow harness inspect --targets
codex,claude,superpowers,codegraph` reports native plugin readiness, MCP launch
readiness, hook presence, Superpowers evidence availability, CodeGraph-style
provider signals, gate availability, and install/repair recommendations.
`devflow harness plan` converts that inspection into a dry-run adoption plan
without writing files. Native Codex/Claude gaps become `create-if-missing`
actions, Superpowers is treated as optional profile adoption, and CodeGraph is
treatable as optional context unless an existing provider needs freshness
checks. `devflow harness install --confirm` executes only native
`create-if-missing` actions, skips existing files, and ignores optional
Superpowers/CodeGraph actions. `devflow harness health` validates installed
native harness files by parsing plugin manifests and MCP config, executing hook
scripts with a synthetic payload, accepting Claude Stop decision payloads, and
checking configured gates and required review config. `devflow harness repair
--confirm` now restores broken installed harness files with built-in canonical
content and mergeable required-review config, limited to malformed plugin
manifests, malformed MCP config, hook scripts that fail the health contract,
and missing `review.required`. Gate command repair remains a reported issue
rather than an automatic rewrite.

## Phase 3: Split Planning

Build:

- `devflow split`
- work item registry
- `devflow work create/start/update/rename/ready/block/unblock/list`

Exit criteria:

- split output can produce platform-specific worktree commands and one
  self-contained prompt per session
- work items can be registered and listed from local state

Current implementation note: `devflow work create`, `devflow work start`,
`devflow work update`, `devflow work rename`, `devflow work ready`,
`devflow work block`, `devflow work unblock`, and `devflow work list` now append and derive local work
item state from
`.devflow/state/events.jsonl`. MCP exposes the same contract as
`devflow.work_create`, `devflow.work_start`, `devflow.work_update`,
`devflow.work_rename`, `devflow.work_ready`, `devflow.work_block`, and
`devflow.work_unblock`, and `devflow.work_list`, and `devflow status` now reads active, blocked, and
ready-to-finish work items from derived state. `work.updated` changes title,
description, and owned paths without changing lifecycle status; rename is a
title-only alias. `work.unblocked` returns a blocked item to active status.
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
- `devflow.harness_inspect` MCP tool
- `devflow.harness_plan` MCP tool
- `devflow.harness_health` MCP tool
- `devflow.harness_repair` MCP tool
- `devflow.split` MCP tool
- `devflow.finish` MCP tool
- `devflow.record_gate` MCP tool
- `devflow.gates_run` MCP tool
- `devflow.next_prompt` MCP tool
- `devflow.handoff_latest` MCP tool
- `devflow.rewrite_prompt` MCP tool
- `devflow.sessions_codex` MCP tool
- `devflow.sessions_attach_plan` MCP tool
- `devflow.sessions_attach` MCP tool
- `devflow.sessions_list` MCP tool
- `devflow.sessions_note` MCP tool
- `devflow.work_create` MCP tool
- `devflow.work_start` MCP tool
- `devflow.work_update` MCP tool
- `devflow.work_rename` MCP tool
- `devflow.work_ready` MCP tool
- `devflow.work_block` MCP tool
- `devflow.work_unblock` MCP tool
- `devflow.work_list` MCP tool
- `devflow.review_request` MCP tool
- `devflow.review_record` MCP tool
- Codex native plugin readiness and install surface
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
`devflow.status`, `devflow.harness_inspect`, `devflow.harness_plan`,
`devflow.harness_health`, confirmed-write `devflow.harness_repair`,
`devflow.split`, `devflow.explain_term`,
`devflow.doctor`, `devflow.finish`, `devflow.record_gate`, `devflow.gates_run`,
`devflow.next_prompt`, `devflow.handoff_latest`, and `devflow.rewrite_prompt`,
plus adapter-backed `devflow.sessions_codex` and
dry-run `devflow.sessions_attach_plan`, confirmed-write
`devflow.sessions_attach`, read-only `devflow.sessions_list`, manual
`devflow.sessions_note`, local work item tools `devflow.work_create`,
`devflow.work_start`, `devflow.work_update`, `devflow.work_rename`,
`devflow.work_ready`, `devflow.work_block`, `devflow.work_unblock`, and
`devflow.work_list`, local review request tool `devflow.review_request`, local
review evidence tool `devflow.review_record`, and a minimal stdio JSON-RPC
transport. The CLI also has `devflow split --json` with
optional work registration and `devflow explain` renderers, plus `devflow prompt rewrite` for converting
vague maintainer intent into agent-ready requirements. Host-specific Codex and
Gemini MCP config templates are present. Project-specific split discovery can now read
`.devflow/config.json` `split.tasks`; richer docs/code map inference remains
later work. `devflow finish` now honors `.devflow/config.json`
`review.required` by requiring a passing `review.completed` record before
`canClaimDone` becomes true, and `devflow review request` generates the strict
reviewer prompt that should precede `devflow review record`. Finish and Stop
surfaces now show both the request and record follow-up commands. The repo-local plugin ships shared `start`, `split`, `next`,
`explain`, `rewrite`, `sessions`, and `finish` skills for Codex and Claude Code style plugin
workflows. `devflow finish` keeps `.devflow/state/events.jsonl` as canonical
handoff history and rewrites `.devflow/next-prompt.md` as the latest
human-readable projection; CLI `devflow prompt latest` and MCP
`devflow.handoff_latest` read that projection for the next session. Repo-local
and installed SessionStart hooks now include the same latest prompt projection
when present, so a new agent session receives the handoff automatically.

## Phase 6: Session Import

Build:

- Codex session adapter
- Claude session adapter
- Gemini session adapter
- manual session notes
- session-to-work-item linking

Exit criteria:

- active and historical agent sessions can be attached to a task
- compact status and optional artifacts can show what each session did and
  where it stopped

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

## Phase 8: Generated Artifacts

Build:

- on-demand HTML/text artifact generation from structured `.devflow` state
- review sheet artifacts for changed files, gates, skipped checks, and risks
- split board artifacts for parallel work planning
- timeline artifacts for sessions, gates, and handoffs
- handoff artifacts for next-session prompts and unresolved risks

Exit criteria:

- the maintainer can request a visual artifact only when the state is too dense
  for compact text
- generated HTML is never the source of truth and is not fed back to agents by
  default
- artifact templates are local, deterministic, and cheap compared with asking
  the model to regenerate layout every turn

Current implementation note: the earlier dashboard package was removed from
the MVP. Phase 8 is now an on-demand artifact layer rather than a persistent
web app.

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
