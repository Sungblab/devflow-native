---
name: harness
description: Inspect, install, verify, or repair native Devflow harness files for Codex, Claude Code, MCP, hooks, skills, gates, and review requirements.
---

# Devflow Harness

Use when adopting Devflow in a repository, checking whether Codex or Claude Code
is native-ready, or repairing plugin, hook, MCP, gate, or review configuration.

## Workflow

1. Run `devflow harness inspect --targets codex,claude --json`.
2. If installation is needed, run `devflow harness plan --targets codex,claude
   --json` and explain the write plan before installing.
3. Install only after confirmation with `devflow harness install --targets
   codex,claude --confirm --json`.
4. Verify with `devflow harness health --json`.
5. Use `devflow harness repair --confirm --json` only for narrow canonical
   repairs reported by health.

## Output

Report target readiness, missing files, hook/MCP health, review requirement,
repair actions, and the smallest safe next step.
