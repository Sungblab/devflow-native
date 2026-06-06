# Repeated Mistake Loop

Devflow Native should treat repeated agent mistakes as repo-local evidence, not
as generic memory. The product goal is:

```text
tool failure -> mistake candidate -> reviewed rule -> repo-local gate -> next-session context
```

This keeps Devflow different from memory-only projects. Memory tools remember
what happened. Devflow should decide whether the repo has enough evidence to
let an agent continue, finish, or repeat a risky action.

## Position

The target product category is:

```text
repo-local evidence gate for repeated agent mistakes across Codex, Claude Code, and shell sessions
```

Adjacent projects already cover parts of this:

| Project family | Useful reference | Devflow boundary |
| --- | --- | --- |
| `claude-antimem` | repeated Claude mistake checks before response | Devflow must be host-neutral and evidence-gated |
| `memory-toolkit` | hook-captured corrections and rule candidates | Devflow should connect candidates to gates, review, and handoff |
| Munin-style memory | error catalog and solution reuse | Devflow should stay local-first and repo-owned |
| Adaptive skill projects | memory-to-skill improvement loop | Devflow should generate reviewed rule changes, not silently mutate skills |
| Codex/Claude memory plugins | local memory and MCP continuity | Devflow should specialize in mistakes, completion blocking, and next-session context |

The narrow promise is not "remember everything." It is "do not let an agent
repeat, hide, or finish past a known repo-local mistake without evidence."

## Current State

Implemented today:

- `devflow mistakes detect`
- `devflow mistakes add`
- `devflow mistakes list`
- `.devflow/mistakes.json` repeated-mistake memory
- `devflow doctor` mistake and platform context
- `PreToolUse` hook blocking for known command mistakes
- `PostToolUse` and failure hook detection for tool-output mistakes
- native Codex and Claude plugin surfaces
- finish, review, gate, and handoff evidence

Current detectors include:

- Windows PowerShell Bash heredoc misuse
- PowerShell `Select-Object -Index 108..156` range misuse
- Playwright package or module unavailable failures

The missing part is promotion: Devflow can record and inject mistake memory, but
it does not yet turn repeated mistakes into reviewed repo rules or skill edits.

## Completion Contract

The loop is complete when Devflow can do all of this:

1. Detect mistake candidates from command text, stderr, stdout, exit code, and
   hook payload metadata.
2. Store candidates with stable ids, category, applies-to hosts/platforms,
   evidence snippets, first/last observed times, count, and confidence.
3. Show active mistake memory in `devflow doctor`, `status`, and native start
   context without bloating prompts.
4. Block high-confidence known mistakes in `PreToolUse` when the correction is
   unambiguous.
5. Suggest promotion after repeated observations or explicit maintainer request.
6. Generate reviewed patch candidates for `AGENTS.md`, `.devflow/config.json`,
   plugin skill files, or hook rules.
7. Record promotion review evidence before applying durable rule changes.
8. Connect promoted rules to finish gates and next-session handoff context.
9. Keep Codex, Claude Code, shell, and manual sessions on the same repo-local
   state contract.
10. Avoid silent self-modification. The maintainer or a review gate must approve
    durable rule promotion.

## Data Model Additions

Extend mistake records with these fields:

```json
{
  "id": "powershell-bash-heredoc-redirection",
  "category": "shell-file-io-friction",
  "scope": "project",
  "symptom": "Agent used Bash heredoc redirection in Windows PowerShell.",
  "correction": "Use a PowerShell here-string piped to stdin.",
  "appliesTo": ["windows-powershell", "codex", "claude"],
  "confidence": "high",
  "observations": {
    "count": 3,
    "firstObservedAt": "2026-06-06T00:00:00.000Z",
    "lastObservedAt": "2026-06-06T00:00:00.000Z"
  },
  "promotion": {
    "status": "candidate",
    "targets": ["agents", "skill", "hook"],
    "reason": "Repeated high-confidence failure."
  }
}
```

The existing `.devflow/mistakes.json` can stay the storage file for now. SQLite
can wait until the schema needs query performance or cross-project sync.

## Implemented CLI Surface

The repo-local promotion loop exposes these commands:

```text
devflow mistakes promote --id <id> --target agents|skill|hook|config --dry-run --json
devflow mistakes promote --id <id> --target agents --apply --json
devflow mistakes review --id <id> --status approved|rejected --summary <text> --json
devflow mistakes rules --json
```

Expected behavior:

- `promote --dry-run` returns patch candidates and never writes.
- `promote --apply` requires existing approved review evidence unless
  `--confirm-reviewed` is supplied by the maintainer.
- `review` records local promotion evidence.
- `rules` shows active promoted rules and which hook/skill/doc target owns them.
- `status` surfaces unresolved promotion candidates as recommendations.
- `finish` includes active rules and unresolved candidates in the next prompt;
  repos can opt into blocking unreviewed promotions with
  `mistakes.blockUnreviewedPromotions`.

## Promotion Targets

Use conservative targets:

| Target | Writes | When to use |
| --- | --- | --- |
| `agents` | `AGENTS.md` or configured agent guide | Durable repo-wide operating rule |
| `skill` | `plugins/devflow/skills/doctor/SKILL.md` or host-specific skill | Agent-facing procedural correction |
| `hook` | `.devflow/config.json` rule entry or generated hook rule | Machine-blockable command mistake |
| `config` | `.devflow/config.json` detector/gate config | Gate or detector policy |

Public docs should use generic categories such as shell mismatch, transport
mismatch, file I/O friction, framework version drift, and unsafe fallback
patching. Maintainer-specific incidents belong in repo-local state or private
memory, not public examples.

## Detector Expansion

Add focused detectors before adding generic LLM classification:

1. Windows shell and file I/O:
   - Bash heredoc in PowerShell
   - unparenthesized PowerShell ranges
   - CRLF/LF or encoding mismatch when it affects generated files
2. Browser automation:
   - Playwright module unavailable
   - browser executable missing
   - localhost target not running
3. GitHub and release transport:
   - `gh` auth missing or wrong account
   - npm publish already-published version
   - npm token lacks publish permission
   - GitHub Release exists but workflow tries to recreate it
4. Dependency drift:
   - package command not found
   - official docs or host CLI changed command surface

Each detector needs at least one unit test and one hook-level contract test.

## Native Host Behavior

Claude Code can use lifecycle hooks directly. Codex support should stay more
defensive:

- Prefer skills, CLI, MCP, and repo-local state as the reliable base.
- Use Codex hooks when available, but do not make completion safety depend on
  hook parity.
- Keep `devflow finish`, `doctor`, `harness smoke`, and `mistakes promote`
  runnable from a plain shell.

This prevents Devflow from becoming dependent on a single host runtime.

## Implemented MVP

The current MVP closes the repeated-mistake promotion loop without turning
Devflow into an autonomous self-modifying agent:

- `.devflow/mistakes.json` keeps backward-compatible records and now aggregates
  repeated observations with `observations.count`, `firstObservedAt`,
  `lastObservedAt`, confidence, evidence snippets, and promotion metadata.
- `mistakes promote --dry-run` generates patch candidates only.
- `mistakes review` records maintainer approval or rejection in
  `.devflow/state/events.jsonl`.
- `mistakes promote --apply` requires approved review evidence unless the
  maintainer passes `--confirm-reviewed`.
- `mistakes rules` shows active promoted rules and pending candidates.
- PreToolUse hooks read config-backed active mistake rules from
  `.devflow/config.json`.
- `status`, `finish`, and next-session prompts include repeated mistake
  candidates and active rules.

## Remaining Detector Backlog

### Release And Transport Detectors

- Add detectors for npm/GitHub release failures observed in this repo:
  already-published version, npm publish permission 404, release workflow
  double-publish, and tag/package mismatch.
- Add fixture tests using redacted logs.

## Verification

Minimum verification for this feature:

```text
npm test
npm run docs:check
node packages/cli/src/index.js mistakes detect --platform windows-powershell --command "node x << 'EOF'" --stderr "Missing file specification after redirection operator." --json
node packages/cli/src/index.js mistakes promote --id powershell-bash-heredoc-redirection --target agents --dry-run --json
node packages/cli/src/index.js harness health --json
node packages/cli/src/index.js finish --dry-run --json
```

The feature is not complete until the finish dry-run can show no missing review
or gate evidence for the implemented slice.

## Non-Goals

- Do not build a hosted memory service.
- Do not silently edit `AGENTS.md`, `CLAUDE.md`, or skill files.
- Do not turn every failure into a blocking rule.
- Do not require Superpowers, Claude-only memory plugins, or Codex-only MCP
  memory plugins.
- Do not store private transcript content beyond bounded evidence snippets.
