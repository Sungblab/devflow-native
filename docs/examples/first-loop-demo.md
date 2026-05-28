# First Loop Demo

This example shows the smallest useful Solo Devflow OS loop. It is designed for
the current local CLI prototype, before hosted sync or generated artifacts exist.

## Goal

Use Devflow as a black box recorder around one AI-assisted development slice:

1. inspect local execution rules
2. inspect current project state
3. record completion evidence
4. generate the next-session prompt

## Commands

```powershell
node packages/cli/src/index.js doctor --platform windows-powershell --json
node packages/cli/src/index.js status --simple
```

After a Codex, Claude Code, or manual terminal session changes the repo,
record the slice:

```powershell
node packages/cli/src/index.js finish `
  --work readme-first-loop `
  --title "README first loop" `
  --intent "Make the first Devflow loop obvious from the repo entrypoint." `
  --gate "docs:npm run docs:check:passed" `
  --risk "No generated artifact demo exists yet." `
  --next-task "Add a captured example of finish output and next prompt." `
  --guided
```

Then generate the prompt for the next session:

```powershell
node packages/cli/src/index.js prompt next `
  --objective "Continue Solo Devflow OS from the recorded first loop." `
  --command "npm run docs:check" `
  --risk "No generated artifact demo exists yet." `
  --next-task "Add a captured example of finish output and next prompt."
```

## Captured Finish Output

The guided renderer keeps the closeout compact enough to read inside an agent
chat or terminal:

```text
Finish checklist
Work: readme-first-loop
Title: README first loop
Changed files: 5
Verified gates: 2
Skipped checks: 0
Known risks: 1
Review recommendation: local-record
Next task: Add a captured finish output fixture or move to the next core implementation slice.
```

The important part is not the exact count. The important part is that the
finish record names the work item, records gate evidence, keeps skipped checks
and risks visible, and produces a concrete next task.

## Captured Next Prompt

The next prompt renderer turns the same local context into a copy-paste
handoff:

```text
Continue Solo Devflow OS after the README first-loop docs slice.

Changed files:
- README.md
- docs/README.md
- packages/cli/src/index.js
- packages/cli/test/cli-mvp.test.mjs
- docs/examples/first-loop-demo.md

Evidence commands:
- npm run docs:check
- npm test

Risks:
- No captured terminal output example is committed yet.

Next task: Add a captured finish output fixture or move to the next core implementation slice.
```

This is the shape a future Codex, Claude Code, or shell session should
receive before it starts changing files.

## What Devflow Records

`finish` appends a local `work.completed` event to:

```text
.devflow/state/events.jsonl
```

The event records:

- work item id and title
- changed files from git status
- gate evidence supplied by the maintainer or agent
- skipped checks and known risks
- review recommendation
- next-session prompt

`status` reads the same local state back into the next run so the project can
resume without trusting chat memory alone.

## Expected Handoff Shape

In general, the next prompt should be copy-pasteable into an agent host:

```text
Objective: Continue Solo Devflow OS from the recorded first loop.

Changed files:
- README.md
- docs/examples/first-loop-demo.md

Commands run:
- npm run docs:check

Risks:
- No generated artifact demo exists yet.

Next task: Add a captured example of finish output and next prompt.
```

This is the first product loop: not launching another agent, but preserving the
evidence an agent and maintainer need to continue.
