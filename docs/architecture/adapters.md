# Adapters

Solo Devflow OS should support many agent tools and operating systems without
making any one of them mandatory.

## Integration Strategy

Solo Devflow OS should integrate with coding agents through the narrowest
stable surface each host provides:

- MCP tools when the host supports MCP.
- Host plugins or slash commands when they improve daily UX.
- Read-only session discovery when direct execution control is unnecessary.
- CLI launch/resume only when the user explicitly asks Devflow to start an
  agent session.

Devflow should not replace Codex, Claude Code, Gemini, Hermes, or other agents.
It should give them a shared project truth layer: status, split plans, gate
evidence, handoffs, next prompts, and beginner-friendly term explanations.

Authentication remains owned by the host agent. Codex OAuth tokens, Claude
account state, Gemini credentials, and Hermes provider keys must not be reused
by Devflow as if they were Devflow credentials.

## Agent Adapter Contract

An agent adapter converts tool-specific data into normalized devflow events.

Required capabilities:

- discover sessions
- identify project/repo path
- read prompts and assistant outputs when available
- identify tool/command usage when available
- identify busy/idle/completed state when available
- attach a session to a work item
- export a compact handoff summary

Optional capabilities:

- launch a new session
- resume an existing session
- send follow-up input
- receive approval requests
- stream live events

Normalized session discovery output:

```json
{
  "adapter": "codex",
  "sessionId": "019c6e27-e55b-73d1-87d8-4e01f1f75043",
  "agent": "Codex",
  "project": {
    "absolutePath": "C:\\Users\\Sungbin\\Documents\\GitHub\\solo-devflow-os",
    "confidence": "high"
  },
  "startedAt": "2026-05-15T10:00:00+09:00",
  "updatedAt": "2026-05-15T10:42:00+09:00",
  "state": "idle",
  "signals": {
    "hasToolCalls": true,
    "hasFileEdits": true,
    "hasPendingApproval": false
  },
  "source": {
    "kind": "local-history",
    "path": "%USERPROFILE%\\.codex\\sessions\\..."
  },
  "events": [
    {
      "type": "session.attached",
      "confidence": "high"
    }
  ],
  "warnings": []
}
```

`confidence` should be `high`, `medium`, or `low`. A low-confidence session can
be shown to the maintainer, but it should not be auto-attached to work without
confirmation.

## Initial Agents

| Agent | Priority | Notes |
| --- | --- | --- |
| Claude Code | P0 | Rich hooks, project history, todos, subagents. |
| Codex | P0 | Current maintainer workflow; JSONL sessions and resume model. |
| Gemini CLI | P1 | Useful second reviewer and alternate model. |
| GitHub Copilot CLI | P1 | Common enterprise/dev workflow target. |
| OpenCode | P1 | Local DB/session model, useful cross-provider target. |
| Goose | P2 | Local session DB and tool workflow. |
| Aider | P2 | Git-native coding workflow; useful for commit-based tracking. |
| Generic shell | P0 | Manual work must still be recordable. |

## Host Integration Drafts

### Codex

Preferred integration:

- MCP config pointing Codex at the local Devflow MCP server.
- Session discovery from Codex local history and resume metadata.
- Optional launch helpers that call the installed Codex CLI rather than
  embedding OpenAI credentials.

Useful commands/tools:

```text
devflow.status
devflow.split
devflow.finish
devflow.next_prompt
devflow.explain_term
devflow.rewrite_prompt
devflow.sessions_codex
```

Codex may support ChatGPT account login or API key login in its own CLI. Devflow
should treat that as Codex-owned authentication.

### Claude Code

Preferred integration:

- Claude Code plugin containing slash commands, skills, optional hooks, and MCP
  configuration.
- Read-only import of Claude Code project history, todos, hook outputs, and
  subagent activity.

Candidate slash commands:

```text
/devflow:status
/devflow:split
/devflow:finish
/devflow:next
/devflow:explain
```

Plugin commands should call Devflow CLI or MCP tools. They should not fork a
separate project model.

The repo-local plugin currently ships shared `start`, `split`, `next`,
`explain`, `rewrite`, `sessions`, and `finish` skills under `plugins/devflow/skills/`. Claude Code
exposes plugin skills under the plugin namespace, so these are the first
slash-like daily workflow surface.

### Gemini CLI

Preferred integration:

- MCP config when available.
- Transcript or session export import when available.
- Review/audit session classification even when no files changed.

Gemini can be a strong secondary reviewer. Devflow should preserve that as a
session role rather than forcing every session to be an implementation session.

Initial project-scoped MCP settings live at
[`../../templates/gemini/settings.json`](../../templates/gemini/settings.json).
Copy them to `.gemini/settings.json` in a target repo to point Gemini CLI at the
local Devflow stdio server.

### Hermes Agent

Preferred integration:

- Adapter for locally exposed Hermes session, memory, skill, and tool records
  when available.
- Optional MCP tools so Hermes can query project status and write finish
  evidence.

Hermes is closer to a persistent personal agent than a one-shot coding CLI.
Devflow should treat it as an agent host and state source, not as a workflow
methodology dependency.

## Initial Session Discovery Drafts

### Codex

Discovery inputs:

- Codex home directory, usually `%USERPROFILE%\.codex` on Windows and
  `$HOME/.codex` on POSIX systems.
- Local session or rollout JSONL files when present.
- Current repo path, git root, branch, and recent changed files.

Discovery rules:

- Match sessions by explicit cwd metadata first.
- If cwd metadata is absent, match by mentioned absolute paths, repo name, or
  changed-file paths.
- Treat tool calls, shell commands, and file edits as evidence events.
- Preserve Codex resume/session ids when available.
- Do not assume Codex is the only active agent. Multiple adapters can discover
  sessions for the same repo.

Initial emitted events:

- `session.discovered`
- `session.message`
- `session.tool_call`
- `git.diff.captured` when a session references changed files
- `handoff.generated` when a final answer contains a next-session prompt

Current implementation starts with read-only helpers in
`packages/adapters/src/index.js`. `findCodexSessionFiles` locates `.jsonl`
candidates under an explicit `codexHome/sessions` directory and returns file
metadata only. `parseCodexSessionJsonl` extracts safe metadata from
caller-provided JSONL content without auto-reading private histories.
`discoverCodexSessions` accepts Codex-like session records and a target repo
path, then returns normalized discovery records with confidence, signals,
source paths, and warnings. Automatic import from `%USERPROFILE%\.codex`
history contents is a later slice.

### Claude Code

Discovery inputs:

- Claude project history directories under the user's home directory.
- JSONL transcript files, todo state, hook outputs, and subagent records when
  available.
- Current repo path and project slug variants used by Claude Code.

Discovery rules:

- Match by project directory metadata or encoded path names first.
- Import todos as session-local planning evidence, not as core work items until
  the maintainer or a command links them.
- Import subagent activity as child session events with parent session ids.
- Capture hook-derived command evidence, but keep hook configuration as a
  profile/reference concern.

Initial emitted events:

- `session.discovered`
- `session.message`
- `session.todo.updated`
- `session.child.started`
- `gate.finished` when hook output clearly maps to a configured gate

### Gemini CLI

Discovery inputs:

- Gemini CLI export/history locations when configured.
- Shell history or explicit exported transcript files when no stable local
  store is available.
- Current repo path, prompt text, command output, and git evidence.

Discovery rules:

- Prefer explicit transcript export over shell-history inference.
- Mark repo matching as `medium` unless the transcript contains cwd metadata,
  absolute paths, or repo-specific changed files.
- Treat Gemini reviewer sessions as first-class review/audit sessions even when
  they make no file edits.
- Do not require Gemini-specific runtime features for core workflows.

Initial emitted events:

- `session.discovered`
- `session.message`
- `review.imported` for audit-style findings
- `gate.finished` only when command output includes enough evidence

## Platform Adapter Contract

A platform adapter generates commands and path handling for the user's OS.

Required capabilities:

- detect shell and OS
- normalize repo paths
- generate worktree commands
- generate gate commands
- locate common session directories
- redact shell-specific secret patterns

Command generation must start from structured descriptors produced by core.
Rendered command strings are platform views over the descriptor.

## Initial Platforms

| Platform | Priority | Notes |
| --- | --- | --- |
| Windows PowerShell 7 | P0 | Maintainer's primary environment. |
| WSL/Linux | P0 | Needed for tmux-heavy tools and Linux-native agent workflows. |
| macOS | P1 | Common Claude/Codex/Gemini development environment. |

## Platform Command Rules

### Windows PowerShell 7

- Render native PowerShell commands first.
- Use single quotes for literal paths.
- Keep Windows paths as Windows paths unless the command explicitly targets
  WSL.
- Do not emit `tmux`, Bash arrays, process substitution, or GNU-only shell
  assumptions.
- Prefer readable multi-line commands when a sequence has failure handling.

### WSL/Linux

- Render POSIX shell commands.
- Convert Windows paths to `/mnt/<drive>/...` only when the adapter can prove
  the command will run inside WSL.
- `tmux` support is optional and profile-driven.
- Prefer `&&` for dependent setup chains.

### macOS

- Render POSIX shell commands.
- Avoid Linux-only flags when a portable equivalent exists.
- Detect Homebrew paths instead of assuming them.
- Keep macOS behavior distinct from Linux only when path, process, or tool
  discovery differs.

## Rule

The core model should never require a specific agent or platform. If an adapter
is missing, the project should still support manual sessions and git/gate state.
