---
description: Initialize or bootstrap a repository with Devflow Native presets.
argument-hint: "[--preset solo-product|research|content-site] [--targets codex,claude] [--ci github] [--review required] [--confirm]"
---

Use the Devflow Init workflow.

Default to a dry run when `$ARGUMENTS` does not include `--confirm`:

```powershell
devflow init $ARGUMENTS --json
```

If `$ARGUMENTS` is empty, inspect the repo and choose the preset before running:

```powershell
devflow init --preset solo-product --targets codex,claude --ci github --review required --json
```

Explain planned files, inferred gates, review policy, CI workflow, and native
harness targets. Run a confirmed write only when the maintainer has asked to
proceed, then verify with `devflow health --json` and, for native agent targets,
`devflow harness health --targets codex,claude --json`.
