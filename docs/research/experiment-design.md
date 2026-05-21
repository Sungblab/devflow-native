# Experiment Design

## Unit Of Study

Each task is a software engineering task that is intentionally interrupted
after partial progress. A second agent session receives one condition-specific
context package and attempts to continue the same task.

## Pilot Protocol

1. Prepare a repo fixture with objective acceptance criteria and required
   gates.
2. Build one canonical interrupted snapshot for the task.
3. Freeze filesystem snapshot, git diff, command logs, tool logs, failed gates,
   skipped gates, known blockers, and expected next actions.
4. Generate the condition-specific handoff package from that same frozen
   snapshot.
5. Run Session 2 from the same snapshot for each condition.
6. Score continuation success, false completion, cost, exploration, and
   handoff quality.

## Canonical Interrupted Snapshot

Session 1 should not be left as an uncontrolled natural run in the core
experiment. Each task should have one fixed interrupted snapshot. All
conditions start from that same filesystem and git state. The only intended
experimental difference is the continuation package shown to Session 2.

A canonical interrupted snapshot should include:

- partial implementation
- changed files and git diff
- command log
- tool log when available
- at least one relevant gate status
- known failure or skipped verification when the task calls for it
- remaining blocker
- gold next action

This reduces variance from Session 1 behavior and makes the A-G ablation
interpretable.

## Task Requirements

Good tasks should require multiple files, include meaningful context pointers,
and have objective acceptance criteria. At least one required gate should be
relevant to the changed files.

Avoid tasks that are one-line fixes, tasks without verification oracles, and
tasks whose success depends mainly on external services.

## Suggested Pilot Size

Start with a small controlled pilot before broad automation:

```text
1 task x 7 conditions x 2 repeats = 14 runs
3 tasks x 7 conditions x 2 repeats = 42 runs
5 tasks x 7 conditions x 2 repeats = 70 runs
```

Use the smallest pilot to validate the protocol, scorer, and logging first.
Then scale tasks before adding more models. Keep all seven conditions so the
ablation remains interpretable.

A later paper-scale study can use:

```text
10 tasks x 7 conditions x 3 repeats = 210 runs
```

Long-context, AGENTS.md, Semble, and compressed-continuation conditions should
be treated as expansion studies after the core A-G handoff/gate ablation works.

## State Captured Per Run

- task id and condition
- initial and interrupted snapshots
- agent and model
- files read and changed
- token usage when available
- tool calls and command summaries
- gate evidence references
- completion claim
- final status
- scorer notes
