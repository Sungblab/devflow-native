# Solo Devflow OS Docs

This is the documentation router for Solo Devflow OS.

## Read First

| Need | Document |
| --- | --- |
| Product thesis and user problem | [product-plan.md](./product-plan.md) |
| System structure and technical boundaries | [architecture.md](./architecture.md) |
| Agent and platform adapter strategy | [architecture/adapters.md](./architecture/adapters.md) |
| MCP handler package | [../packages/mcp/README.md](../packages/mcp/README.md) |
| Research harness framing | [research/README.md](./research/README.md) |
| Korean research index | [research/ko/README.md](./research/ko/README.md) |
| Korean research primer | [research/ko/primer.md](./research/ko/primer.md) |
| Research decision log | [research/ko/decision-log.md](./research/ko/decision-log.md) |
| Research related-work map | [research/related-work.md](./research/related-work.md) |
| Research paper outline | [research/paper-outline.md](./research/paper-outline.md) |
| Long-context and cold-start cost notes | [research/ko/long-context-and-cost.md](./research/ko/long-context-and-cost.md) |
| Existing tool and related-work notes | [research.md](./research.md) |
| Research experiment design | [research/experiment-design.md](./research/experiment-design.md) |
| Research metrics and rubrics | [research/metrics.md](./research/metrics.md) |
| Build order | [roadmap.md](./roadmap.md) |
| Development workflow for this repo | [contributing/workflow.md](./contributing/workflow.md) |
| Context and handoff rules | [contributing/context-rules.md](./contributing/context-rules.md) |
| CLI command contract | [contributing/commands.md](./contributing/commands.md) |
| Architecture map index | [architecture/maps/README.md](./architecture/maps/README.md) |
| First local black-box-recorder loop | [examples/first-loop-demo.md](./examples/first-loop-demo.md) |
| OpenCairn split example | [examples/opencairn-parallel-split.md](./examples/opencairn-parallel-split.md) |
| Simple status output example | [examples/simple-status-output.md](./examples/simple-status-output.md) |
| Session list filter examples | [examples/session-list-filters.md](./examples/session-list-filters.md) |
| Gemini CLI MCP template | [../templates/gemini/README.md](../templates/gemini/README.md) |
| Repo-local Codex plugin start skill | [../plugins/devflow/skills/start/SKILL.md](../plugins/devflow/skills/start/SKILL.md) |
| Repo-local Codex/Claude plugin split skill | [../plugins/devflow/skills/split/SKILL.md](../plugins/devflow/skills/split/SKILL.md) |
| Repo-local Codex/Claude plugin next skill | [../plugins/devflow/skills/next/SKILL.md](../plugins/devflow/skills/next/SKILL.md) |
| Repo-local Codex/Claude plugin explain skill | [../plugins/devflow/skills/explain/SKILL.md](../plugins/devflow/skills/explain/SKILL.md) |
| Repo-local Codex/Claude plugin rewrite skill | [../plugins/devflow/skills/rewrite/SKILL.md](../plugins/devflow/skills/rewrite/SKILL.md) |
| Repo-local Codex/Claude plugin sessions skill | [../plugins/devflow/skills/sessions/SKILL.md](../plugins/devflow/skills/sessions/SKILL.md) |
| Repo-local Codex plugin finish skill | [../plugins/devflow/skills/finish/SKILL.md](../plugins/devflow/skills/finish/SKILL.md) |

## Core Terms

- Project contract: durable docs, instructions, gates, and boundaries for a
  repository.
- Work item: a task slice that can be assigned to one human or agent session.
- Session: a Codex, Claude, Gemini, shell, or manual work session.
- Gate: a command or review step that produces evidence.
- Handoff: a next-session prompt plus summary of changed files, checks, and
  risks.
- Gate evidence: a recorded verification result tied to a work item, changed
  files, and remaining risk, not just raw test output.
- Profile: a workflow style such as plain, Superpowers, gstack, OpenHarness, or
  Hermes.
- Mistake memory: local records of repeated agent failures such as shell
  mismatch, path handling, encoding, setup, or unsafe command issues.

## First Skills

The initial skill pack is intentionally focused on the maintainer's highest
token-cost loops:

- [`devflow-start`](../skills/devflow-start/SKILL.md)
- [`devflow-split`](../skills/devflow-split/SKILL.md)
- [`devflow-finish`](../skills/devflow-finish/SKILL.md)
