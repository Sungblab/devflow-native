---
description: Finish work only after gate, review, risk, and handoff evidence.
argument-hint: "--work <id> [--guided]"
---

Use the Devflow Finish workflow.

Run `devflow status --json`, satisfy required review and gate evidence, then
run `devflow finish $ARGUMENTS`. If finish reports review commands, run those
before claiming completion.
