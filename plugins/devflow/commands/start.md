---
description: Load Devflow start context before command-heavy work.
argument-hint: "[--work <id>] [--agent <name>]"
---

Use the Devflow Start workflow.

Run `devflow doctor --json`, then run `devflow status --json $ARGUMENTS`.
Apply the execution contract before shell commands, surface repeated mistake
memory, summarize active work, gate/review state, latest handoff, and the first
safe next action.
