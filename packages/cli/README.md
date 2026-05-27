# `@devflow/cli`

`packages/cli` owns the `devflow` command surface. It should stay thin:
parse arguments, call core services, render text or JSON, and return clear exit
codes. `devflow status --simple` includes branch, work filter, agent filter,
dirty-file count, recorded session count, latest session work item, session id,
observed time, agent, kind, summary, changed-file count, latest handoff, next
check, and next step. Pass `--work <id>` or `--agent <name>` to focus status
session evidence. When `.devflow/config.json` requires review, `devflow status
--work <id>` recommends the matching `devflow review request` command until a
passing `review.completed` record exists for that work item.

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
- `devflow harness inspect`
- `devflow harness plan`
- `devflow harness install`
- `devflow harness health`
- `devflow harness repair`
- `devflow work create`
- `devflow work start`
- `devflow work update`
- `devflow work rename`
- `devflow work ready`
- `devflow work block`
- `devflow work unblock`
- `devflow work list`
- `devflow split`
- `devflow finish`
- `devflow review request`
- `devflow review record`
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
and at least one configured gate are present. `devflow harness inspect` reports
native Codex and Claude Code readiness, MCP config presence, instruction files,
Superpowers signals, CodeGraph-style provider signals, configured gates, and
the smallest install or repair recommendations without writing files.
`devflow harness plan` converts that inspection into a dry-run adoption plan:
native Codex/Claude gaps become create-if-missing actions, Superpowers remains
an optional profile adoption action, and CodeGraph-style context remains
optional unless an existing provider needs freshness checks.
`devflow harness install --confirm` executes only the native
`create-if-missing` actions from the plan. It writes missing Codex/Claude plugin
manifests, hook config, hook scripts, MCP config, and start/finish skills, skips
existing files, and ignores optional Superpowers/CodeGraph actions.
`devflow harness health` validates installed native harness files by checking
plugin manifest JSON, MCP config JSON, executable hook scripts, and configured
gates. Stop hooks may return Claude decision payloads while context-injection
hooks must return structured hook context.
`devflow harness repair --confirm` restores only broken installed files that
have built-in canonical content, such as malformed plugin manifests, malformed
MCP config, or hook scripts that fail the health contract. It does not rewrite
project instructions or auto-edit gate definitions.
`devflow work create`,
`devflow work start`, `devflow work update`, `devflow work rename`,
`devflow work ready`, `devflow work block`, `devflow work unblock`, and
`devflow work list` provide the first local work item registry over append-only
`.devflow/state/events.jsonl` events. Work create and start writes are
idempotent by id, returning the existing event instead of appending duplicates.
`devflow split` renders local worktree-session plans, and `devflow split
--register --start` can append the generated sessions as active work items
without manual re-entry. The
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

`devflow finish --json` returns a false-completion guard contract in addition
to the original evidence summary. It reads configured gates from
`.devflow/config.json` and recorded `gate.finished` events from
`.devflow/state/events.jsonl`, then returns `canClaimDone`, `doneBlockers`,
`skippedGates`, `failedGates`, `unknownGates`, `remainingRisks`,
`structuredHandoff`, `review`, and `nextPrompt`. Missing, failed, skipped, or
unknown required gates block `canClaimDone`. When `.devflow/config.json` sets
`review.required` to `true`, `devflow finish` also requires a matching
`review.completed` event for the work item. `devflow review record --work <id>
--reviewer <name> --status passed --summary <text>` records that local review
evidence. `devflow review request --work <id> --target claude-code --persona
strict-reviewer` creates the copy-paste prompt for that separate review. It
includes the work item, dirty files, recorded gate evidence, a blocker-first
checklist, and the follow-up `devflow review record` command. When the review
gate blocks finish, `finish --guided` prints the next review request command so
the required review is harder to skip.
