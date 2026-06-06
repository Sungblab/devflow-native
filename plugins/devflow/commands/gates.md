---
description: Run configured verification gates and record evidence.
argument-hint: "run <gate-id> --work <id>"
---

Use the Devflow Gates workflow.

Run `devflow status --json`, then run `devflow gates $ARGUMENTS --json` when a
specific gate command was supplied. Treat failed commands as evidence and
surface the failure directly.
