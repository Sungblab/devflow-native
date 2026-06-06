---
description: Inspect Devflow project truth and current next action.
argument-hint: "[--simple] [--work <id>]"
---

Use the Devflow Status workflow.

Run `devflow doctor --json` if command-heavy work may follow, then run
`devflow status --json` or `devflow status --simple` when `$ARGUMENTS`
contains `--simple`.

Summarize branch, dirty files, active/ready work, session evidence, gate
evidence, review requirements, latest handoff, and one concrete next action.
