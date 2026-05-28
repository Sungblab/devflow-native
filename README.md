# Devflow Native

[한국어 문서](README.ko.md)

Devflow Native is a local-first workflow continuity tool for AI coding agents
such as Claude Code and Codex. It records, verifies, and hands off development
state inside the repository.

It is not another coding agent. Codex, Claude Code, shell sessions, and human
reviewers still do the work. Devflow keeps the surrounding project truth,
verification evidence, review state, and next-session prompt from being lost.

## Install

```powershell
npm install -g devflow-native
devflow --help
devflow --version
```

## Recommended Setup

Devflow is not meant to make users manually wire MCP, plugin, and hook settings
one by one. The intended path is to ask the coding agent you already use to
install and verify the harness.

Open Codex or Claude Code in the repository you want to equip, then paste:

```text
Install Devflow Native for this repository.

Use the published npm package `devflow-native` when possible. Do not replace
existing project instructions. Inspect the current repo first, install only the
missing Devflow harness pieces, configure MCP/plugin/hook integration when the
host supports it, verify the result, and tell me exactly whether I need to
restart Codex or Claude Code.

Expected verification:
- `devflow --help` works.
- `devflow doctor` and `devflow status` work for this repo.
- `devflow harness health` is ok, or the remaining host limitation is explicit.
- Existing AGENTS.md, CLAUDE.md, README, tests, and project rules are preserved.
```

## Manual Checks

```powershell
devflow doctor --platform windows-powershell --json
devflow status --simple
devflow harness inspect --json
devflow harness plan --json
devflow harness install --confirm --json
devflow harness health
```

## What Devflow Does

- Records active work, agent/manual sessions, gate evidence, risks, and handoffs locally.
- Installs and checks repo-local plugin, hook, and MCP harnesses for Codex and Claude Code.
- Connects short maintainer prompts such as `ㄱㄱ`, `이어가`, `끝내`, or `pr ㄱㄱ` to the right workflow.
- Checks gate and review evidence before a task is claimed done.
- Maintains a handoff prompt so the next session can continue immediately.

## What Devflow Does Not Do

- It is not an autonomous coding agent.
- It does not replace Codex, Claude Code, Superpowers, git, tests, or PR review.
- It does not treat HTML dashboards or generated artifacts as source of truth.
- It is not tied to one agent runtime or one workflow methodology.

## Core Loop

```text
Codex or Claude Code opens the repo
  -> Devflow session-start hook injects compact repo context

Maintainer says "ㄱㄱ" or "이어가"
  -> Devflow prompt hook classifies workflow intent
  -> the agent starts from status, active work, and handoff state

Maintainer says "끝내" or "pr ㄱㄱ"
  -> Devflow finish flow checks docs impact, gates, risks, and next prompt
  -> completion evidence is recorded in .devflow/state/events.jsonl
```

## Common Commands

```powershell
devflow --help
devflow doctor --platform windows-powershell --json
devflow status --simple
devflow finish --guided
devflow prompt latest
devflow harness health
npm run mcp:stdio
```

## Documentation

- [Quickstart](docs/quickstart.md)
- [Release Checklist](docs/release.md)
- [Product Plan](docs/product-plan.md)
- [Architecture](docs/architecture.md)
- [Harness](docs/harness.md)
- [Research Boundary](docs/research/README.md)
- [Roadmap](docs/roadmap.md)

## Repository Structure

```text
packages/core     shared product model, local state, gates, handoff contracts
packages/cli      terminal command surface over core contracts
packages/mcp      MCP handler and stdio transport over the same contracts
packages/adapters agent/session history adapters
plugins/devflow   repo-local Codex and Claude Code plugin drafts
docs              product, architecture, roadmap, examples, and public notes
.devflow          dogfood project contract; runtime state is gitignored
```

## Status

The current MVP includes the npm package, CLI, MCP handler, repo-local
Codex/Claude plugin drafts, hooks, and finish guard. Hosted sync, richer
artifact generation, and broader adapter coverage are later work.

Research notes, paper drafts, evaluation fixtures, and non-public data live in
a separate private repository. This public repository contains product
implementation and public product documentation only.
