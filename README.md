# Solo Devflow OS

Solo Devflow OS is a local-first operating layer for solo developers who build
with AI coding agents. It is not another coding agent. It records, verifies,
visualizes, and resumes the development process around agents.

The core idea: AI can write code quickly, but solo maintainers still need an
external memory system for project contracts, active work, quality gates,
review feedback, and next-session handoffs.

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
node packages/cli/src/index.js status --json
node packages/cli/src/index.js doctor --platform windows-powershell --json
node packages/cli/src/index.js finish --json
node packages/cli/src/index.js prompt next
npm run mcp:stdio
```

The repo also contains a local Codex plugin draft at `plugins/devflow`. Its
start skill loads `devflow doctor` and `devflow status` before command-heavy
work. Its finish skill records evidence, checks documentation impact, respects
Codex goal state when available, and asks whether to commit, PR, continue, or
generate a next-session prompt.

The MCP package exposes the same core contracts through `devflow.doctor`,
`devflow.finish`, and `devflow.next_prompt` handlers, plus a minimal stdio
JSON-RPC transport for host integration experiments.

The Codex plugin manifest points to `plugins/devflow/.mcp.json`, which launches
the local stdio transport with `node packages/mcp/src/stdio.js`.

## Initial Positioning

Solo Devflow OS should feel closer to a black box recorder and project control
room than to an IDE. It can eventually launch agents, but the first durable
value is knowing what happened, what is blocked, and what comes next.
