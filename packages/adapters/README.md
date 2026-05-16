# `@devflow/adapters`

`packages/adapters` owns provider and platform boundaries. Adapters translate
external tools into normalized core events and render core command descriptors
into platform-specific shell commands.

## Initial File Boundary

```text
packages/adapters/
  src/
    index.ts
    agents/
      codex.ts
      claude-code.ts
      gemini-cli.ts
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
