---
name: status
description: Inspect Devflow Native project truth, including repo state, work items, sessions, gates, review requirements, and latest handoff context.
---

# Devflow Status

Use when the maintainer asks what is implemented, what is active, what is
blocked, what changed, or how to continue from current repo state.

## Workflow

1. Run `devflow doctor --json` first when command-heavy work may follow.
2. Run `devflow status --json`.
3. Use `devflow status --simple` only when the maintainer wants a compact
   human summary.
4. Treat the JSON as the project-truth snapshot. Do not infer completion from
   chat alone.
5. If status recommends review, gate, or handoff work, surface that next action
   before claiming the repo is ready.

## Output

Return the branch, dirty state, active or ready work items, latest sessions,
gate evidence, review requirement, latest handoff, and one concrete next action.
