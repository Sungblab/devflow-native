# `@devflow/cli`

`packages/cli` owns the `devflow` command surface. It should stay thin:
parse arguments, call core services, render text or JSON, and return clear exit
codes. `devflow status --simple` includes branch, work filter, agent filter,
dirty-file count, recorded session count, latest session work item, session id,
observed time, agent, kind, summary, changed-file count, latest handoff, next
check, and next step. Pass `--work <id>` or `--agent <name>` to focus status
session evidence.

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
- `devflow init`
- `devflow health`
- `devflow work create`
- `devflow work start`
- `devflow work list`
- `devflow split`
- `devflow finish`
- `devflow doctor`
- `devflow prompt next`
- `devflow prompt rewrite`
- `devflow sessions codex`
- `devflow sessions attach-plan`
- `devflow sessions attach`
- `devflow sessions list`
- `devflow sessions note`

`devflow init` currently renders a scaffold plan by default and writes the
minimum project contract only when `--confirm` is provided. The first scaffold
includes `.devflow/config.json`, `AGENTS.md`, a docs router, workflow notes,
testing strategy, and an architecture map index. Existing files are skipped
instead of overwritten. `devflow health` checks that the same scaffold files
and at least one configured gate are present. `devflow work create`,
`devflow work start`, and `devflow work list` provide the first local work item
registry over append-only `.devflow/state/events.jsonl` events. `devflow split`
currently renders the first local worktree-session plan. The
`devflow sessions codex` is read-only and requires an explicit
`--codex-home <path>` before it reads local Codex session candidates.
`devflow sessions attach-plan` is a dry-run planner over an explicit JSON input
file and does not write `.devflow` state. `devflow sessions attach` consumes a
selected proposal from a plan file and writes a `session.attached` event only
when `--confirm` is present. `devflow sessions list` reads local state and
renders attached sessions without probing private agent history, optionally
filtered by `--agent <name>`, `--work <id>`, `--since <iso-date>`, sorted by
`--sort observedAt:asc|observedAt:desc`, and limited by positive-integer
`--limit <n>`. Explicit sorting orders matches before `--limit`; without
`--sort`, the default recorded order and recent-match limit behavior stay
unchanged. Use `--json` for the stable agent contract or omit it for a short
terminal summary with active filters, attached session ids, changed-file counts,
observed times, limit totals, sort choice, or manual note summaries. The text
summary also surfaces a compact warning count when local state has warnings. `devflow
sessions note` records manual or external session context as local state. The
future `devflow init` command can reuse the same rendering and config
infrastructure once the MVP loop is stable.
