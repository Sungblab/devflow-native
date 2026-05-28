---
name: next
description: Generate the next Devflow Native session prompt from latest status, changed files, evidence commands, risks, and the requested next task.
---

# Devflow Next

Use this when the maintainer asks for the next prompt, a handoff prompt, or a
copy-paste prompt for another Codex, Claude Code, Hermes, or shell
session.

## Workflow

1. Read latest status with `devflow status --json`. If the executable is not
   installed, use `node packages/cli/src/index.js status --json`.
2. Identify the objective from the maintainer's latest request and the latest
   status. Do not use stale completed-work claims as the objective.
3. Collect concrete changed files, evidence commands, known risks, and the next
   task.
4. Run `devflow prompt next` with explicit `--objective`, repeated `--command`,
   repeated `--risk`, and `--next-task` values. If needed, use
   `node packages/cli/src/index.js prompt next`.
5. Return the generated copy-paste prompt without adding hidden assumptions.

## Output

Include:

- latest status basis
- generated copy-paste prompt
- evidence commands that the next session should trust or rerun
- known risks and stale assumptions to avoid

The next prompt should be self-contained enough for a fresh agent session to
start without asking the maintainer to reconstruct project context.
