# Solo Devflow OS

Solo Devflow OS is a local-first black box recorder for AI-assisted
development.

It is not another coding agent. Codex, Claude Code, Gemini, and shell sessions
do the work. Devflow records the project truth they need to share: what changed,
what was verified, what was skipped, what risk remains, and what the next
session should do.

## First Loop

The first useful loop is intentionally small:

```powershell
node packages/cli/src/index.js doctor --platform windows-powershell --json
node packages/cli/src/index.js status --simple

# Work in Codex, Claude Code, Gemini, or a terminal.

node packages/cli/src/index.js finish `
  --work readme-first-loop `
  --title "README first loop" `
  --intent "Make the first Devflow loop obvious from the repo entrypoint." `
  --gate "docs:npm run docs:check:passed" `
  --risk "No dashboard demo exists yet." `
  --next-task "Add a captured example of finish output and next prompt." `
  --guided

node packages/cli/src/index.js prompt next `
  --objective "Continue Solo Devflow OS from the recorded first loop." `
  --command "npm run docs:check" `
  --risk "No dashboard demo exists yet." `
  --next-task "Add a captured example of finish output and next prompt."
```

That loop answers the daily questions a solo maintainer loses across agent
tabs:

- What local shell, path, and tool rules should the agent follow?
- What is the current repo/work/gate state?
- What evidence closes this slice?
- What exact prompt should the next session start with?

## Example Handoff Shape

`devflow finish` records local evidence in `.devflow/state/events.jsonl`.
`devflow prompt next` emits a copy-paste handoff that should include:

```text
Objective: Continue Solo Devflow OS from the recorded first loop.

Changed files:
- README.md

Commands run:
- npm run docs:check

Risks:
- No dashboard demo exists yet.

Next task: Add a captured example of finish output and next prompt.
```

For a fuller terminal walkthrough, see the
[first loop demo](docs/examples/first-loop-demo.md).

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
- Map: a visual route from docs to code ownership to verification.

## Documentation

- [Product Plan](docs/product-plan.md)
- [Architecture](docs/architecture.md)
- [Research Notes](docs/research.md)
- [Roadmap](docs/roadmap.md)

## Current MVP

```powershell
node packages/cli/src/index.js init --json
node packages/cli/src/index.js init --confirm --json
node packages/cli/src/index.js health --json
node packages/cli/src/index.js status --json
node packages/cli/src/index.js status --simple
node packages/cli/src/index.js doctor --platform windows-powershell --json
node packages/cli/src/index.js finish --json
node packages/cli/src/index.js prompt next
npm run mcp:stdio
```

The repo also contains local Codex and Claude Code plugin drafts at
`plugins/devflow`. The start skill loads `devflow doctor` and `devflow status`
before command-heavy work. The finish skill records evidence, checks
documentation impact, respects host goal state when available, and asks whether
to commit, PR, continue, or generate a next-session prompt.

The MCP package exposes the same core contracts through `devflow.doctor`,
`devflow.status`, `devflow.finish`, `devflow.record_gate`, and
`devflow.next_prompt` handlers, plus a minimal stdio JSON-RPC transport for
host integration experiments.

The Codex plugin manifest points to `plugins/devflow/.mcp.json`, which launches
the local stdio transport with `node packages/mcp/src/stdio.js`.

## Initial Positioning

Solo Devflow OS should feel closer to a black box recorder and project control
room than to an IDE. It can eventually launch agents, but the first durable
value is knowing what happened, what is blocked, and what comes next.
