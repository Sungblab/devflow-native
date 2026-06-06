---
description: Rewrite a vague maintainer request into an agent-ready Devflow prompt.
argument-hint: "<raw request>"
---

Use the Devflow Rewrite workflow.

Run `devflow status --json`, then run `devflow prompt rewrite --request
"$ARGUMENTS" --context <compact status/context> --json`. Treat the rewrite as
an interpretation aid, not a replacement for the user's original request.
