# Devflow Native

[한국어 문서](README.ko.md)

Devflow Native is a local-first workflow harness for AI coding agents such as
Codex and Claude Code.

It does not write code for you. Instead, it helps the repository remember what
the agents did, what they verified, what still looks risky, and what the next
session should pick up.

## Why This Exists

AI coding agents are getting better at generating code. The next bottleneck is
often continuity:

- What changed in the last session?
- Which tests, typechecks, builds, or reviews actually ran?
- What failed or was skipped?
- Which repo docs and project rules should the next agent trust?
- Is it really safe to say the task is done?

Long context, chat history, and session compaction help, but they are not the
same as project-local workflow state. Devflow keeps that state in the repo so a
new Codex, Claude Code, shell, or human review session can resume without
rediscovering everything from scratch.

## How It Fits

Devflow is not trying to replace the tools around it.

```text
Superpowers: agent development habits and workflow skills
CodeGraph:   codebase structure and context navigation
Codex/Claude: execution hosts for coding agents
Devflow:    work state, verification records, review state, and next-session prompts
```

In plain terms: Devflow asks the repo to remember enough that the next agent
does not have to guess where the previous one stopped.

## What It Does

- Creates a `.devflow/config.json` project contract with gates and review policy.
- Installs and checks local Codex/Claude plugin, hook, and MCP harness files.
- Shows repo status, changed files, work/session state, gates, and latest handoff.
- Records review evidence and gate evidence before work is called done.
- Provides `finish --dry-run` to check whether a task can honestly be claimed complete.
- Generates the prompt the next agent session should continue from.

## Quick Try

The intended path is agent-native setup: open Codex or Claude Code in the target
repo and ask it to install Devflow safely.

```text
Install Devflow Native for this repository.

Inspect the repo first. Preserve existing AGENTS.md, CLAUDE.md, README, tests,
and project rules. Use npx devflow-native@latest if devflow is not already
installed.

Initialize the Devflow scaffold when missing, install only missing Codex/Claude
harness files, run doctor/status/harness health, and tell me exactly what files
changed and whether I need to restart the agent host.
```

## Manual Fallback

```powershell
npx devflow-native@latest --help
npx devflow-native@latest init --confirm
npx devflow-native@latest harness install --confirm
npx devflow-native@latest harness health
npx devflow-native@latest status --simple
```

`harness install --confirm` keeps generated `plugins/devflow/` harness files
local by default by adding them to `.gitignore`. Use `--repo-visible` only when
the target repository should commit those plugin files as part of its public
development workflow.

For repeated local use, a global install is still fine:

```powershell
npm install -g devflow-native
devflow harness health
```

## What Devflow Does Not Do

- It is not an autonomous coding agent.
- It does not replace Codex, Claude Code, Superpowers, git, tests, or PR review.
- It does not treat HTML dashboards or generated artifacts as source of truth.
- It is not tied to one agent runtime or one workflow methodology.

## Core Loop

```text
Codex or Claude Code opens the repo
  -> Devflow session-start hook injects compact repo context

Maintainer says "continue" or "next"
  -> Devflow prompt hook classifies workflow intent
  -> the agent starts from status, active work, and handoff state

Maintainer says "finish" or "review"
  -> Devflow finish flow checks docs impact, gates, risks, and next prompt
  -> completion evidence is recorded in .devflow/state/events.jsonl
```

Runtime state such as `.devflow/state/` and `.devflow/next-prompt.md` is local
by default. Public project contracts such as `.devflow/config.json` can be
committed when a repository wants to adopt Devflow as part of its workflow.

## Common Commands

```powershell
devflow --help
devflow doctor --platform windows-powershell --json
devflow status --simple
devflow finish --guided
devflow prompt latest
devflow harness health
devflow mcp stdio
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
plugins/devflow   dogfood Codex and Claude Code plugin drafts
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
