---
description: Manage Devflow work items.
argument-hint: "list|create|start|ready|block|unblock [extra args]"
---

Use the Devflow Work workflow.

Inspect current state with `devflow status --json` and `devflow work list
--json` before changing work state. Run the relevant `devflow work ... --json`
command from `$ARGUMENTS`, then report the resulting work item status and next
verification or review action.
