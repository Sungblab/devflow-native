---
description: Generate or read the next-session Devflow prompt.
argument-hint: "[--objective <text>] [--latest]"
---

Use the Devflow Next workflow.

Run `devflow prompt latest` when `$ARGUMENTS` contains `--latest`; otherwise
run `devflow prompt next $ARGUMENTS`. Include changed files, evidence, risks,
and the next concrete task in the handoff.
