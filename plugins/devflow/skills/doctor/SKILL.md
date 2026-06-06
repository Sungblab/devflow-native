---
name: doctor
description: Load Devflow Native execution rules and repeated-mistake memory before running shell, browser, MCP, or test commands.
---

# Devflow Doctor

Use before command-heavy work, debugging, browser automation, MCP transport
work, or any task likely to hit platform-specific tooling issues.

## Workflow

1. Run `devflow doctor --json`.
2. Apply `executionContract` exactly. On Windows PowerShell, keep commands
   PowerShell-compatible and avoid Bash-only syntax unless the task targets
   WSL.
3. Read repeated mistake memory and incorporate corrections before trying a
   command that matches a known failure category.
4. If a new repeated failure appears, run `devflow mistakes detect --json` and
   record high-confidence candidates only when appropriate.
5. When the same high-confidence mistake repeats, use
   `devflow mistakes promote --id <id> --target agents|skill|hook|config --dry-run --json`
   to inspect patch candidates. Record maintainer evidence with
   `devflow mistakes review --id <id> --status approved|rejected --summary <text> --json`
   before applying any durable rule.
6. Apply durable promotion only with repo-local evidence:
   `devflow mistakes promote --id <id> --target <target> --apply --json`.
   Use `devflow mistakes rules --json` to confirm the active promoted rule.

## Output

State platform assumptions, required command style, available tools, repeated
mistakes, active promoted rules, and any command forms to avoid.
