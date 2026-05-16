# Simple Status Output Example

`devflow status --simple` is the quick terminal view for deciding whether a
fresh agent session can resume without reading every transcript first. It is a
human-readable renderer over the same local state used by `devflow status
--json`.

## Command

```powershell
devflow status --repo C:\Users\Sungbin\Documents\GitHub\solo-devflow-os --simple
devflow status --repo C:\Users\Sungbin\Documents\GitHub\solo-devflow-os --work phase-6-session-import --simple
```

## Example Output

```text
Project status
Branch: main
Work filter: phase-6-session-import
Changed files: 0
Sessions: 3
Latest session: phase-6-session-import
Latest session id: codex-session-123
Latest session time: 2026-05-16T11:00:00.000Z
Latest session agent: Codex
Latest session kind: attached
Latest session summary: none
Latest session files: 2
Latest handoff: phase-6-session-import
Next check: npm run docs:check
Next step: Run npm run docs:check before finishing.
```

## How To Read It

- `Changed files` shows the current git working tree size from `git status`.
- `Work filter` shows the focused work item when `--work <id>` is provided,
  or `all` when status is reading the whole project.
- `Sessions` counts attached agent sessions and manual session notes recorded
  in `.devflow/state/events.jsonl`.
- `Latest session` is the work item id for the most recent recorded session
  evidence.
- `Latest session id` is the session identifier to use with session list or
  attach-plan follow-up work.
- `Latest session time` shows when the evidence was observed.
- `Latest session agent` and `Latest session kind` tell whether the latest
  evidence came from Codex, Claude, Gemini, manual notes, or another adapter.
- `Latest session summary` is populated for manual notes; attached sessions can
  still use `devflow sessions list --json` for more detail.
- `Latest session files` is the changed-file count recorded on attached
  sessions. Manual notes usually show `0`.
- `Latest handoff` identifies the last completed work item with a next-session
  prompt.
- `Next check` and `Next step` are the next recommended verification action.

## Empty Session State

When no session evidence is recorded yet, the latest-session fields render as
`none`:

```text
Sessions: 0
Latest session: none
Latest session id: none
Latest session time: none
Latest session agent: none
Latest session kind: none
Latest session summary: none
Latest session files: none
```

Use `devflow sessions note` for manual context or `devflow sessions attach` for
approved attach-plan proposals when the project has useful session evidence to
record.
