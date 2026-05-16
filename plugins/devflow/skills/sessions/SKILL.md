---
name: sessions
description: Discover Codex sessions and produce confirmation-gated attach plans for a Solo Devflow OS repo through read-only CLI or MCP probes.
---

# Devflow Sessions

Use this when the maintainer asks to inspect Codex session history, find recent
agent sessions, connect session context to the current repo, plan which session
belongs to which work item, or understand what an agent did before resuming
work.

## Workflow

1. Keep discovery and attach planning read-only. Do not attach sessions to work
   items or write `.devflow` state from this skill.
2. Require an explicit Codex home path before reading local session candidates.
   Common Windows value: `%USERPROFILE%\.codex`.
3. For discovery, prefer the CLI surface:
   `devflow sessions codex --repo "<repo>" --codex-home "<codexHome>" --json`.
   If the executable is not installed, use
   `node packages/cli/src/index.js sessions codex`.
4. If an MCP host is already configured, the equivalent discovery tool is
   `devflow.sessions_codex` with `repo` and `codexHome` arguments.
5. For linking, build an explicit JSON input with `workItems`, `sessions`, and
   optional `warnings`, then run
   `devflow sessions attach-plan --input "<jsonFile>" --json`. If the
   executable is not installed, use
   `node packages/cli/src/index.js sessions attach-plan --input "<jsonFile>" --json`.
6. If an MCP host is already configured, the equivalent attach planner is
   `devflow.sessions_attach_plan` with explicit `workItems`, `sessions`, and
   optional `warnings` arguments.
7. Treat low-confidence sessions as visible evidence only. Attach proposals must
   remain confirmation-gated unless the planner marks them attach-ready and the
   maintainer accepts the link.

## Output

Return:

- candidate session files
- normalized session ids, repo match confidence, timestamps, and signals
- source paths and warnings
- clear note that the probe is read-only and explicit opt-in
- dry-run attach proposals when work item inputs are available
- recommended next action, such as inspect one session, accept an attach-ready
  proposal, request confirmation for a low-confidence proposal, or ignore stale
  records
