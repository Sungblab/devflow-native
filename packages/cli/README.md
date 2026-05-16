# `@devflow/cli`

`packages/cli` owns the `devflow` command surface. It should stay thin:
parse arguments, call core services, render text or JSON, and return clear exit
codes.

## Initial File Boundary

```text
packages/cli/
  src/
    index.js
    commands/
      init.ts
      status.ts
      split.ts
      finish.ts
      prompt-next.ts
      doctor.ts
    renderers/
      json.ts
      text.ts
      markdown.ts
    io/
      cwd.ts
      config.ts
      files.ts
    errors.ts
  test/
    commands/
    fixtures/
```

## Command Rules

- Every state-reading command supports `--json`.
- Commands default to the current working directory unless `--repo <path>` is
  provided.
- Windows PowerShell 7 is a first-class shell target, not a fallback.
- Shell command output should be rendered from platform adapter descriptors,
  not from hard-coded inline strings.
- CLI failures should distinguish contract errors, missing dependencies,
  failing gates, and unexpected internal errors.

## Initial Commands

- `devflow status`
- `devflow split`
- `devflow finish`
- `devflow doctor`
- `devflow prompt next`
- `devflow prompt rewrite`
- `devflow sessions codex`
- `devflow sessions attach-plan`

`devflow split` currently renders the first local worktree-session plan. The
`devflow sessions codex` is read-only and requires an explicit
`--codex-home <path>` before it reads local Codex session candidates.
`devflow sessions attach-plan` is a dry-run planner over an explicit JSON input
file and does not write `.devflow` state. The future `devflow init` command can
reuse the same rendering and config infrastructure once the MVP loop is stable.
