# Experiment Design

## Unit Of Study

Each task is a software engineering task that is intentionally interrupted
after partial progress. A second agent session receives one condition-specific
context package and attempts to continue the same task.

## Pilot Protocol

1. Prepare a repo fixture with objective acceptance criteria and required
   gates.
2. Run or replay Session 1 until it reaches a partial-progress state.
3. Freeze filesystem snapshot, git diff, command logs, and tool logs.
4. Generate the condition-specific handoff package.
5. Run Session 2 from the same snapshot for each condition.
6. Score continuation success, false completion, cost, exploration, and
   handoff quality.

## Task Requirements

Good tasks should require multiple files, include meaningful context pointers,
and have objective acceptance criteria. At least one required gate should be
relevant to the changed files.

Avoid tasks that are one-line fixes, tasks without verification oracles, and
tasks whose success depends mainly on external services.

## Suggested Pilot Size

Start with a small controlled pilot before broad automation:

```text
5 tasks x 7 conditions x 2 repeats = 70 runs
```

If that is too expensive, reduce repeats first. Keep all seven conditions so
the ablation remains interpretable.

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
