---
name: work
description: Create, start, update, ready, block, unblock, rename, or list Devflow Native work items from local repo state.
---

# Devflow Work

Use when the maintainer asks to define a task slice, track active work, mark
work ready, block a task, or inspect current work items.

## Workflow

1. Run `devflow status --json` to see current work state.
2. Use `devflow work list --json` or `devflow work list --status
   active|ready|blocked --json` before modifying existing work.
3. For new work, run `devflow work create --id <id> --title <title> --json`.
4. Start work with `devflow work start <id> --json`.
5. Mark state changes explicitly with `devflow work ready <id> --json`,
   `devflow work block <id> --reason <text> --json`, or
   `devflow work unblock <id> --json`.

## Output

Return the work item id, title, status, owned paths when known, and the next
verification or review action.
