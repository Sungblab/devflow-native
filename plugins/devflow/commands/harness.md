---
description: Inspect, install, verify, or repair Codex and Claude Devflow harness files.
argument-hint: "inspect|plan|install|health|repair [extra args]"
---

Use the Devflow Harness workflow.

Default to `devflow harness inspect --targets codex,claude --json` when
`$ARGUMENTS` is empty. For install or repair, explain the planned writes before
running a `--confirm` command. Always verify with `devflow harness health
--json`.
