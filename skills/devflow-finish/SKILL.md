---
name: devflow-finish
description: Use at the end of a Solo Devflow OS task to record changed files, verification evidence, unresolved risks, PR or review recommendation, and the next-session prompt.
---

# Devflow Finish

Use this skill before calling work complete.

## Required Checks

1. Inspect changed files.
2. Include prompt intent analysis: state how the maintainer's natural-language
   request was interpreted, what missing requirements were inferred, and whether
   examples represented a broader class of rules.
3. Summarize what changed by product intent, not only file names.
4. Record commands run and whether they passed or failed.
5. Identify skipped checks and why.
6. Decide whether PR/review is needed. If review is required, run
   `devflow review request --work <id> --target <codex|claude-code|reviewer> --persona strict-reviewer`,
   hand that prompt to the reviewer, then record the result with
   `devflow review record --work <id> --reviewer <name> --status <passed|changes-requested> --summary <text>`.
7. Decide whether documentation needs an update. Update docs or skills before
   finishing when product behavior, workflow policy, plugin behavior, or
   repeated agent rules changed.
8. If Codex goal support is available, compare the completed work against the
   active Codex goal before claiming completion.
9. Prefer `gh` CLI for GitHub PR operations. Use connector tools only when
   `gh` is unavailable, unauthenticated, or explicitly requested.
10. Generate a platform-appropriate next-session prompt.
11. If `devflow finish` returns `review.nextAction.command`,
    `review.nextAction.recordCommand`, or `finish --guided` prints
    `Review next` / `Review record`, follow both commands before claiming
    completion.

## Completion Output

Return:

- changed files
- verification evidence
- known gaps
- review/PR recommendation
- review request and review record evidence when required
- platform assumptions
- suggested agent/profile for the next session
- next task
- copy-paste prompt for the next session
- a closing question asking whether to commit, PR, continue, or next-session prompt, when relevant

Never claim a gate passed unless command output was observed.
