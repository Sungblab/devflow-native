# `@devflow/adapters`

`packages/adapters` owns provider and platform boundaries. Adapters translate
external tools into normalized core events and render core command descriptors
into platform-specific shell commands.

## Initial File Boundary

```text
packages/adapters/
  src/
    index.js
    agents/
      codex.ts
      claude-code.ts
      generic-shell.ts
    platforms/
      powershell.ts
      posix.ts
      macos.ts
      wsl.ts
    discovery/
      session-dirs.ts
      project-match.ts
    commands/
      worktree.ts
      gates.ts
      redaction.ts
    contracts.ts
  test/
    agents/
    platforms/
    fixtures/
```

Current implementation starts with `src/index.js` and read-only session helpers:

- `findCodexSessionFiles` locates `.jsonl` candidates under an explicit
  `codexHome/sessions` directory and returns file metadata only.
- `parseCodexSessionJsonl` extracts safe metadata from caller-provided JSONL
  content: session id, cwd, timestamps, tool-call signals, file-edit signals,
  changed files, and parser warnings.
- `discoverCodexSessions` maps Codex-like session metadata supplied by callers
  into normalized `session.discovered` events, confidence levels, source paths,
  and warnings.
- `findAgentSessionFiles` locates Claude Code, OpenCode, and Cline candidates
  under an explicit caller-provided history path. It does not guess default
  host directories.
- `parseClaudeSessionJsonl` and `discoverClaudeSessions` apply the same safe
  metadata contract to explicit Claude Code project history JSONL.
- `parseOpenCodeSessionRecord`, `parseClineSessionJson`,
  `discoverOpenCodeSessions`, and `discoverClineSessions` normalize explicit
  OpenCode and Cline records supplied by callers.
- `discoverAgentSessions` dispatches supported adapters into the shared
  normalized discovery shape.

These helpers do not read private history contents by default or write Devflow
state. Hosts must provide explicit history paths, files, or records, then use the shared
attach-plan and confirmed attach contracts to persist links.

## Agent Adapter Rules

- Discover sessions without requiring the agent to be installed in the project.
- Prefer read-only history import before launch/resume automation.
- Emit normalized events; do not leak provider-specific JSON through core.
- Mark confidence for discovered repo paths, timestamps, and active state.
- Support manual sessions when no known agent adapter matches.

## Platform Adapter Rules

- Render commands for Windows PowerShell 7, WSL/Linux POSIX shells, and macOS.
- Keep path conversion explicit. A Windows path, WSL path, and POSIX path are
  not interchangeable strings.
- Do not assume `tmux` exists on Windows.
- Redact secrets using shell-aware patterns before output is persisted.
