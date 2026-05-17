# Solo Devflow OS

Solo Devflow OS is a local-first continuity layer for solo developers using AI
coding agents.

It is not another coding agent and it is not a dashboard-first app. Codex,
Claude Code, Gemini, Superpowers, and shell sessions do the work. Devflow keeps
the shared project truth they need to start, finish, and hand off work without
losing context.

## Primary UX

The primary surface is the repo-local plugin at `plugins/devflow`.

When enabled in Codex or Claude Code, the plugin is expected to:

- load compact `doctor` and `status` context at session start
- detect fast maintainer prompts such as `ㄱㄱ`, `이어가`, `끝내`, or `pr ㄱㄱ`
- preserve local execution rules, active work, gate evidence, and latest
  handoff state
- use Superpowers as an optional workflow profile when available, not as a core
  dependency
- avoid generating HTML unless the maintainer asks for a visual artifact or the
  state is too dense for text

The CLI and MCP server are the local engine behind that plugin. They remain
useful for debugging, tests, and hosts that do not support plugin hooks yet.

## First Plugin Loop

```text
Codex or Claude Code opens the repo
  -> Devflow SessionStart hook injects compact repo context

Maintainer says "ㄱㄱ" or "이어가"
  -> Devflow UserPromptSubmit hook classifies the workflow intent
  -> the agent uses status, active work, and handoff state before editing

Maintainer says "끝내" or "pr ㄱㄱ"
  -> Devflow finish skill checks docs impact, gates, risks, and next prompt
  -> completion evidence is recorded in .devflow/state/events.jsonl
```

## Local Engine

The local engine still exposes direct commands for development and fallback
use:

```powershell
node packages/cli/src/index.js doctor --platform windows-powershell --json
node packages/cli/src/index.js status --simple
node packages/cli/src/index.js finish --json
node packages/cli/src/index.js prompt next
npm run mcp:stdio
```

`devflow finish` records local evidence in `.devflow/state/events.jsonl`.
`devflow prompt next` emits a compact handoff prompt for the next session.

## Product Thesis

Most AI coding tools optimize for code generation or agent orchestration. Solo
Devflow OS optimizes for continuity:

- What is this project supposed to be?
- What task is active now?
- Which agent sessions touched it?
- Which files changed?
- Which checks passed or failed?
- Which reviews are unresolved?
- What should the next session do?

## First-Class Concepts

- Project contract: durable repo rules, architecture boundaries, docs index,
  test strategy, and quality gates.
- Work item: a feature, fix, audit, cleanup, research task, or release slice.
- Session: a Codex, Claude, Gemini, or manual terminal session attached to a
  work item.
- Gate: a command or external review that proves a slice is ready.
- Handoff: a generated next-session prompt plus evidence from the last run.
- Artifact: an optional generated HTML or text view for dense reviews, split
  plans, timelines, or handoffs. Artifacts are views, not source of truth.

## Documentation

- [Product Plan](docs/product-plan.md)
- [Architecture](docs/architecture.md)
- [Research Notes](docs/research.md)
- [Roadmap](docs/roadmap.md)

## Current MVP

The current MVP is plugin-first and MCP-backed:

- `plugins/devflow/.codex-plugin/plugin.json`
- `plugins/devflow/.claude-plugin/plugin.json`
- `plugins/devflow/hooks/hooks.json`
- `plugins/devflow/skills/start/SKILL.md`
- `plugins/devflow/skills/finish/SKILL.md`
- `packages/mcp/src/stdio.js`
- `packages/cli/src/index.js`

The MCP package exposes the same core contracts through `devflow.doctor`,
`devflow.status`, `devflow.finish`, `devflow.record_gate`,
`devflow.gates_run`, and `devflow.next_prompt`, plus work, split, prompt,
session, and health tools.

## Positioning

Solo Devflow OS should feel like a repo-local black box recorder and
single-developer workflow layer for AI-assisted development. A future visual UI
can be added when the local state is large enough to justify it, but the first
durable value is automatic context restoration inside the agent the maintainer
already uses.
