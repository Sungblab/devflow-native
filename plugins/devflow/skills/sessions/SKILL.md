---
name: sessions
description: Discover Codex sessions for a Solo Devflow OS repo through the read-only adapter probe when the maintainer asks what sessions exist, what Codex did, or how to resume context.
---

# Devflow Sessions

Use this when the maintainer asks to inspect Codex session history, find recent
agent sessions, connect session context to the current repo, or understand what
an agent did before resuming work.

## Workflow

1. Keep discovery read-only. Do not attach sessions to work items or write
   `.devflow` state from this skill.
2. Require an explicit Codex home path before reading local session candidates.
   Common Windows value: `%USERPROFILE%\.codex`.
3. Prefer the CLI surface:
   `devflow sessions codex --repo "<repo>" --codex-home "<codexHome>" --json`.
   If the executable is not installed, use
   `node packages/cli/src/index.js sessions codex`.
4. If an MCP host is already configured, the equivalent tool is
   `devflow.sessions_codex` with `repo` and `codexHome` arguments.
5. Treat low-confidence sessions as visible evidence only. Do not auto-attach
   them without maintainer confirmation.

## Output

Return:

- candidate session files
- normalized session ids, repo match confidence, timestamps, and signals
- source paths and warnings
- clear note that the probe is read-only and explicit opt-in
- recommended next action, such as inspect one session, attach later, or ignore
  low-confidence records
