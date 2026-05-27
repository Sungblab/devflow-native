---
name: finish
description: Use when finishing a Solo Devflow OS task from Codex; records evidence, checks documentation impact, respects Codex goal state, and asks the maintainer for commit/PR/continue direction.
---

# Devflow Finish

Use this skill before claiming implementation work is done in a devflow-managed
repository.

## Steps

1. Inspect the current changed files and latest `devflow status --json` output.
   If the executable is not installed yet, run
   `node packages/cli/src/index.js status --json` from this repository.
2. Perform prompt intent analysis. State how the maintainer's natural-language
   request was interpreted, which missing requirements were inferred, and
   whether examples indicated a broader category.
3. Decide whether documentation needs an update. Update docs, skills, maps, or
   examples before finishing when product behavior, workflow policy, plugin
   behavior, or repeated agent rules changed.
4. If Codex goal support is available, inspect the active Codex goal and verify
   completion against the goal objective before claiming the work is complete.
5. Run the relevant gates. Never mark a gate as passed unless command output was
   observed.
6. If review is required or the work should get a second agent pass, run
   `devflow review request --work <id> --target <codex|claude-code|reviewer>
   --persona strict-reviewer` and hand that prompt to the reviewer. After the
   reviewer responds, record the outcome with `devflow review record --work
   <id> --reviewer <name> --status <passed|changes-requested> --summary
   <text>`.
7. Prefer gh CLI (`gh`) for GitHub PR operations. Use connector tools only when
   `gh` is unavailable, unauthenticated, or explicitly requested by the
   maintainer.
8. Record the task with `devflow finish`. If the executable is not installed
   yet, use `node packages/cli/src/index.js finish` with explicit `--work`,
   `--title`, `--intent`, `--gate`, `--risk`, and `--next-task` values.
   Use `--guided` when the maintainer wants a plain checklist in addition to
   the local evidence record.
9. If `devflow finish` returns `review.nextAction.command`,
   `review.nextAction.recordCommand`, or `finish --guided` prints `Review next`
   / `Review record`, follow both commands before claiming the task is done.
10. Final output must include changed files, verification evidence, known gaps,
   and the next recommended implementation slice.
11. End with a closing question asking whether to commit, PR, continue, or
   next-session prompt, when relevant.

## Output

Return:

- prompt intent analysis
- changed files by product intent
- documentation update decision
- Codex goal completion check when available
- verification evidence
- review request and review record evidence when required
- known gaps or risks
- next implementation slice
- `devflow finish` record status
- closing question for commit, PR, continue, or next-session prompt

Do not close a task solely because tests passed. Completion requires matching
the maintainer's intent and recording the handoff evidence.
