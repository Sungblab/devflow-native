---
name: review
description: Request, perform, or record Devflow Native review evidence before a task can be claimed done.
---

# Devflow Review

Use when review is required, when the maintainer asks for review or PR
readiness, or when `devflow status` or `devflow finish` recommends review.

## Workflow

1. Run `devflow status --json`.
2. Generate a strict review prompt with `devflow review request --work <id>
   --target reviewer --persona strict-reviewer`.
3. Give the reviewer the generated prompt. Review findings are evidence, not
   automatic truth.
4. Record the result with `devflow review record --work <id> --reviewer <name>
   --status <passed|changes-requested> --summary <summary> --json`.
5. Re-run focused verification when accepted review findings change behavior.

## Output

Return the review request command, review record command, reviewer summary,
accepted/dismissed findings, and remaining finish blockers.
