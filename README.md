# Devflow Native

Devflow Native is a repo-local workflow companion for Claude Code, Codex, and
other AI coding agents.

Codex, Claude Code, Gemini, Superpowers, and shell sessions do the work.
Devflow records the shared project truth they need to start, finish, and hand
off work without losing context.

## What It Is

- A local-first state layer for active work, agent sessions, gate evidence,
  risks, and handoffs.
- A plugin-first workflow surface for Codex and Claude Code, backed by the same
  CLI and MCP contracts.
- A repo-local record of what changed, what was verified, what is still risky,
  and what the next session should do.
- A research harness for measuring whether structured handoff plus gate
  evidence improves multi-session coding-agent reliability.

## What It Is Not

- It is not another autonomous coding agent.
- It is not a dashboard-first app.
- It is not a replacement for Codex, Claude Code, Gemini, Superpowers, Hermes,
  git, tests, or PR review.
- It is not an HTML artifact generator as source of truth. Generated artifacts
  are optional views over structured local state.

## Why Continuity Matters

AI coding agents make implementation faster, but long-running development still
breaks at session boundaries:

- the next session repeats exploration that already happened
- failing or skipped checks get flattened into confident summaries
- active work, changed files, and review state scatter across chat history,
  terminals, git, and local notes
- a maintainer cannot tell whether a task is actually done or only claimed done

Devflow's job is to keep that workflow state compact, local, inspectable, and
usable by the next agent session.

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

## Core Loop

Most AI coding tools optimize for code generation or agent orchestration.
Devflow optimizes for continuity:

- What is this project supposed to be?
- What task is active now?
- Which agent sessions touched it?
- Which files changed?
- Which checks passed or failed?
- Which reviews are unresolved?
- What should the next session do?

The durable source of truth is structured `.devflow` state and append-only
events. CLI, MCP, and plugin skills are different ways to read or write that
same state.

## Research Framing

Devflow Native can also be used as a research harness for studying
multi-session AI coding agents.

The core research question is:

> Does structured workflow-state handoff with gate evidence improve
> continuation success and reduce false completion compared with no handoff,
> raw transcript handoff, token-matched free-form summary, static repository
> context, gate-only evidence, and human oracle handoff?

The product remains a local-first continuity layer. The research harness
evaluates whether that layer measurably improves coding-agent reliability at
session boundaries.

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
- [Research Harness](docs/research/README.md)
- [Related Work Notes](docs/research.md)
- [Roadmap](docs/roadmap.md)

## Repository Structure

```text
packages/core     shared product model, local state, gates, handoff contracts
packages/cli      terminal command surface over core contracts
packages/mcp      MCP handler and stdio transport over the same contracts
packages/adapters agent/session history adapters
plugins/devflow   repo-local Codex and Claude Code plugin drafts
docs              product, architecture, roadmap, examples, research notes
experiments       research conditions, schemas, scorer skeletons, fixtures
templates         future project scaffold templates
```

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

`devflow finish --json` now returns a false-completion guard contract with
`canClaimDone`, `doneBlockers`, changed files, gate evidence, skipped or failed
gates, remaining risks, a structured handoff, and the next-session prompt.

## Status

This repository is still an MVP and research prototype. The local CLI, MCP
handler layer, repo-local plugin drafts, research docs, schemas, and experiment
skeleton are present. Richer artifact generation, hosted sync, and automated
experiment execution are later work.
