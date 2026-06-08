# Devflow Native

<img width="2048" height="768" alt="Devflow Native README banner" src="https://github.com/user-attachments/assets/96578d16-e1a4-4d1f-8444-f6bfe3c9519d" />

[한국어 문서](./README.ko.md)

Stop AI coding agents from saying "done" when your repo has no evidence.

Devflow Native is a repo-local evidence gate and handoff layer for Codex,
Claude Code, and shell sessions. It does not write code for you. It records what
agents changed, what they actually verified, what still looks risky, and what
the next session should pick up.

## Why This Exists

AI coding agents are getting better at generating code. The next bottleneck is
often trust and continuity:

- What changed in the last session?
- Which tests, typechecks, builds, or reviews actually ran?
- What failed or was skipped?
- Which repo docs and project rules should the next agent trust?
- Is it really safe to say the task is done?
- Did a short maintainer command such as `ㄱㄱ` or `끝내` mean continue,
  finish, review, or hand off?

Long context, chat history, and session compaction help, but they are not the
same as project-local workflow state. Devflow keeps that state in the repo so a
new Codex, Claude Code, shell, or human review session can resume without
rediscovering everything from scratch.

## How It Fits

Devflow is not trying to replace the tools around it.

| Tool layer | What it owns |
| --- | --- |
| Codex / Claude Code | Run coding agents inside the repo. |
| Claude hooks / Codex skills | Add host-specific automation and instructions. |
| Superpowers | Teach workflow habits such as TDD, debugging, planning, and review. |
| TaskMaster-style tools | Track tasks and agent work queues. |
| Devflow Native | Record repo-local evidence, block unsafe finish claims, and generate next-session handoffs. |

In plain terms: Devflow asks the repo to remember enough evidence that the next
agent does not have to guess where the previous one stopped, and the current
agent cannot honestly claim "done" without proof.

## What It Does

- Creates a `.devflow/config.json` project contract with gates and review policy.
- Installs and checks local Codex/Claude plugin, hook, and MCP harness files.
- Shows repo status, changed files, work/session state, gates, and latest handoff.
- Records review evidence and gate evidence before work is called done.
- Provides `finish --dry-run` to check whether a task can honestly be claimed complete.
- Generates the prompt the next agent session should continue from.
- Captures repeated agent mistakes, aggregates repeated observations, and promotes
  durable repo-local rules only after review evidence.

## Quick Try

The important path is agent-native setup. Devflow ships local harness files for
both Codex and Claude Code: plugin manifests, skills/commands, hooks, and MCP
configuration. A global npm install gives you the `devflow` CLI; the agent
experience starts when a target repo has the Devflow harness installed and the
agent host is restarted or reloaded if required.

Open Codex or Claude Code in the target repo and paste:

```text
Install Devflow Native for this repository.

Inspect the repo first. Preserve existing AGENTS.md, CLAUDE.md, README, tests,
and project rules. Use npx devflow-native@latest if devflow is not already
installed.

Initialize the Devflow scaffold when missing, install only missing Codex/Claude
harness files, run doctor/status/harness health, and tell me exactly what files
changed and whether I need to restart the agent host.
```

Maintainer shorthand is part of the intended workflow. The prompt hook maps
short commands into workflow intent and gives the agent the next Devflow actions
to run:

- `ㄱㄱ`, `진행해`, `계속`, `continue`, `next`, `go` -> continue/start from
  `devflow status --json` and `devflow prompt latest`.
- `끝내`, `마무리`, `완료`, `finish`, `done` -> run `devflow finish --guided`
  and follow any review or gate blockers before claiming completion.
- `다음 세션 프롬프트 줘`, `여기까지`, `handoff` -> create a handoff with
  `devflow status --json` and `devflow prompt next`.
- `리뷰`, `pr`, `pull request` -> request and record review evidence.
- `html`, `리포트`, `보드` -> inspect status first and generate an artifact only
  when it is explicitly useful.

When a prompt contains mixed signals, Devflow uses this priority:
`finish > handoff > review/pr > artifact > continue`. The agent still has to
inspect repo state, run required gates, and record review evidence before
claiming that work is complete.

What to expect after Quick Try:

- `devflow` works as a CLI through `npx` or a global npm install.
- The target repo gets local `.devflow/` project state and, when confirmed,
  local `plugins/devflow/` harness files for Codex and Claude Code.
- Codex can load Devflow through its plugin/MCP/hook surfaces when the local
  plugin is registered in that Codex environment.
- Claude Code can load the same Devflow workflow through its Claude plugin,
  command, and hook surfaces when the local plugin is registered in that Claude
  Code environment.
- Future sessions in that repo receive compact Devflow context automatically.

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

Global npm install is not the same thing as registering an agent plugin. It
only makes the `devflow` command available everywhere. Each Codex or Claude Code
environment still needs the Devflow harness/plugin registration that the Quick
Try prompt or `devflow harness install --confirm` verifies.

To update an existing install:

```powershell
devflow update
npm install -g devflow-native@latest
devflow --version
devflow harness health
```

For one-off use without changing a global install, run:

```powershell
npx devflow-native@latest --version
npx devflow-native@latest update
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

An agent repeats a repo-specific mistake
  -> Devflow detects or records the mistake in .devflow/mistakes.json
  -> repeated high-confidence observations become promotion candidates
  -> promote --dry-run shows patch candidates without editing durable files
  -> review evidence gates promote --apply into AGENTS.md, a Devflow skill, or a hook/config rule
```

Runtime state such as `.devflow/state/` and `.devflow/next-prompt.md` is local
by default. Public project contracts such as `.devflow/config.json` can be
committed when a repository wants to adopt Devflow as part of its workflow.

## Dogfood Smoke

Devflow Native is dogfooded against OpenCairn, a larger Windows/PowerShell
monorepo, to keep the product honest on mature-repo adoption instead of only
greenfield demos.

Latest local smoke, run from `C:\Users\Sungbin\Documents\GitHub\opencairn-monorepo`:

```powershell
devflow harness inspect --json
devflow harness health --json
devflow gates run docs-check --work local-work --json
devflow finish --json
```

Observed result on 2026-05-29:

- Codex and Claude harness targets reported `ready`.
- Harness health reported `status: ok`; plugin manifests, MCP config, hook
  scripts, and `review.required` passed.
- `docs-check` passed when recorded against `local-work`.
- `finish` kept `canClaimDone: false` until review evidence was recorded, which
  is the intended guardrail.

This is a smoke record, not a performance benchmark. It proves the current
harness can install, inspect, run hooks, record gate evidence, and block unsafe
finish claims in a real repository.

## Common Commands

```powershell
devflow --help
devflow update
devflow doctor --platform windows-powershell --json
devflow status --simple
devflow finish --guided
devflow prompt latest
devflow mistakes detect --platform windows-powershell --command "node script.mjs << 'EOF'" --stderr "ParserError: Missing file specification after redirection operator." --record --json
devflow mistakes promote --id powershell-bash-heredoc-redirection --target agents --dry-run --json
devflow mistakes review --id powershell-bash-heredoc-redirection --status approved --summary "Repeated PowerShell heredoc correction is repo-relevant." --json
devflow mistakes promote --id powershell-bash-heredoc-redirection --target skill --apply --json
devflow mistakes rules --json
devflow harness health
devflow mcp stdio
```

## Documentation

- [Quickstart](docs/quickstart.md)
- [Release Checklist](docs/release.md)
- [Product Plan](docs/product-plan.md)
- [Architecture](docs/architecture.md)
- [Repeated Mistake Loop](docs/architecture/repeated-mistake-loop.md)
- [Harness](docs/harness.md)
- [Research Boundary](docs/research/README.md)
- [Open Source Promotion Plan](docs/marketing/open-source-promotion.md)
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

The current v0.1 foundation release includes the npm package, CLI, MCP handler,
repo-local Codex/Claude plugin drafts, hooks, finish guard, and the first
review-gated repeated-mistake promotion loop. Hosted sync, richer artifact
generation, broader adapter coverage, and more detector families are later work.

Research notes, paper drafts, evaluation fixtures, and non-public data live in
a separate private repository. This public repository contains product
implementation and public product documentation only.
