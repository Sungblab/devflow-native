---
name: gates
description: Run configured Devflow Native verification gates and record pass or fail evidence for a work item.
---

# Devflow Gates

Use when verification evidence is needed before review, finish, handoff, or
release.

## Workflow

1. Run `devflow status --json` to inspect configured gates and work context.
2. Run `devflow gates run <gate-id> --work <id> --json` for each relevant gate.
3. Treat failures as evidence. Do not hide or relabel a failed command as
   passed.
4. After gate runs, re-check `devflow status --json` so finish and review
   surfaces see the recorded evidence.

## Output

Report each gate id, command, exit status, pass/fail state, linked work item,
and any next repair or rerun action.
