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
7. To persist an approved proposal, use
   `devflow sessions attach --input "<jsonFile>" --session "<sessionId>" --confirm --json`.
   In MCP hosts, use `devflow.sessions_attach` with `confirm: true` and the
   selected `proposal`. If the link already exists, treat the `existing: true`
   response as a no-op success.
8. To inspect recorded links later, use `devflow sessions list --repo "<repo>" --json`.
   Add `--work "<workId>"` when only one work item should be shown. In MCP
   hosts, use `devflow.sessions_list` with the same `repo` argument and optional
   `work` or `workItemId`. For maintainer-facing terminal checks, omit `--json`
   to render a short text summary.
9. When useful work happened outside a supported adapter, record it with
   `devflow sessions note --repo "<repo>" --work "<workId>" --agent manual --summary "<text>" --json`.
   In MCP hosts, use `devflow.sessions_note` with `work`, `agent`, and `summary`.
10. Treat low-confidence sessions as visible evidence only. Attach proposals must
   remain confirmation-gated unless the planner marks them attach-ready and the
   maintainer accepts the link.

## Output

Return:

- candidate session files
- normalized session ids, repo match confidence, timestamps, and signals
- source paths and warnings
- clear note that the probe is read-only and explicit opt-in
- dry-run attach proposals when work item inputs are available
- persisted `session.attached` event only when an approved proposal is confirmed
- existing attachment response when the link was already recorded
- attached session list with session id, work item id, agent, confidence, and
  observed time
- manual note evidence when no adapter transcript exists
- recommended next action, such as inspect one session, accept an attach-ready
  proposal, request confirmation for a low-confidence proposal, or ignore stale
  records
