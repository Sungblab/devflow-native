# `@devflow/cli`

`packages/cli` owns the `devflow` command surface. It should stay thin:
parse arguments, call core services, render text or JSON, and return clear exit
codes. `devflow status --simple` includes branch, work filter, agent filter,
dirty-file count, recorded session count, latest session work item, session id,
observed time, agent, kind, summary, changed-file count, latest handoff, next
check, and next step. Pass `--work <id>` or `--agent <name>` to focus status
session evidence. When `.devflow/config.json` requires review, `devflow status
--work <id>` recommends the matching `devflow review request` command until a
passing `review.completed` record exists for that work item. Without `--work`,
status uses the first ready-to-finish work item, then the first active work
item, so a plain status check still surfaces the required review command.

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
- `devflow sessions claude`
- `devflow sessions opencode`
- `devflow sessions cline`
- `devflow sessions attach-plan`
- `devflow sessions attach`
- `devflow sessions list`
- `devflow sessions note`
- `devflow mistakes add`
- `devflow mistakes list`
- `devflow mistakes detect`

`devflow init` renders a scaffold plan by default and writes only when
`--confirm` is provided. It now supports `--preset solo-product|research|content-site`,
`--targets codex,claude`, `--ci github`, and `--review required|optional`.
The scaffold includes `.devflow/config.json`, `AGENTS.md`, a docs router,
workflow notes, testing strategy, and an architecture map index. With native
targets, it also installs canonical `plugins/devflow/*` files for Codex and
Claude and ignores them as local harness files unless `--repo-visible` is
passed. With `--ci github`, it creates `.github/workflows/devflow.yml` from
inferred package scripts. `AGENTS.md` is appended with a Devflow section when
it already exists instead of being replaced. `solo-product` defaults to
`review.required: true`; `research` and `content-site` default to risk-based
or direct-docs-main review policy unless `--review required` is passed. Existing
non-AGENTS files are skipped instead of overwritten. `devflow health` checks
that the same scaffold files and at least one configured gate are present.
`devflow harness inspect` reports
native Codex and Claude Code readiness, MCP config presence, instruction files,
Superpowers signals, CodeGraph-style provider signals, configured gates, and
the smallest install or repair recommendations without writing files.
`devflow harness plan` converts that inspection into a dry-run adoption plan:
native Codex/Claude gaps become create-if-missing actions, Superpowers remains
an optional profile adoption action, and CodeGraph-style context remains
optional unless an existing provider needs freshness checks.
`devflow harness install --confirm` executes only the native
`create-if-missing` actions from the plan plus the required-review config
action. It writes missing Codex/Claude plugin manifests, hook config, hook
scripts, MCP config, and start/finish skills, skips existing files, enables
`review.required` in `.devflow/config.json` without dropping existing gates,
and ignores optional Superpowers/CodeGraph actions.
`devflow harness health` validates installed native harness files by checking
plugin manifest JSON, MCP config JSON, executable hook scripts, configured
gates, and `review.required`. Stop hooks may return Claude decision payloads
while context-injection hooks must return structured hook context. When health
finds a repairable failure, JSON output includes `nextAction.command` and text
output prints a next action such as `devflow harness repair --confirm`.
`devflow harness repair --confirm` restores only broken installed files that
have built-in canonical content, such as malformed plugin manifests, malformed
MCP config, hook scripts that fail the health contract, or missing
`review.required` config that can be merged without dropping existing gates. It
does not rewrite project instructions or auto-edit gate definitions.
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
`devflow sessions claude`, `devflow sessions opencode`, and
`devflow sessions cline` are also read-only; they accept either `--input
<json-file>` with caller-provided `records` or `--history <path>` pointing to
an explicit exported file/directory. They normalize those records into the
same discovery contract without guessing or probing private host history
directories.
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
summary also surfaces a compact warning count when local state has warnings.
`devflow sessions note` records manual or external session context as local
state.

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
checklist, and the follow-up `devflow review record` command. The non-JSON
renderer prints that follow-up as `Record command` before the full reviewer
prompt. When the review
gate blocks finish, `finish --guided` prints the next review request command so
the required review is harder to skip, plus the follow-up review record command
needed to unblock finish after the separate review.
