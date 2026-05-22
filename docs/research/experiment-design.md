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
   skipped gates, known blockers, and observable next-action hints.
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

This reduces variance from Session 1 behavior and makes the core ablation
interpretable.

## Hidden Evaluation Metadata

Gold labels must not leak into any Session 2 continuation package. The
following fields are hidden evaluator metadata only:

- gold next action
- expected final fix
- hidden acceptance oracle
- gold changed files
- gold context pointers
- final semantic success label

The visible continuation package can contain only observable facts from Session
1: prompt, file reads, file edits, git diff, command logs, tool logs, gate
outputs, and explicit agent/user statements recorded before interruption.

## Observable-Only Audit

Each handoff field should be auditable. A reviewer should be able to trace each
claim back to an observable Session 1 artifact. Claims derived from the final
patch, hidden tests, or post hoc researcher diagnosis are leakage unless they
are kept only in hidden evaluation metadata.

For every generated input fixture, record provenance for important claims:

- source artifact type: prompt, transcript, file read, edit, git diff, command
  log, gate output, or user statement
- source reference: file path, command id, event id, or transcript offset
- whether the claim is observable or hidden

## Core Conditions

The core ablation should distinguish structure, evidence, and artifact exposure:

| Condition | Description |
| --- | --- |
| A. No handoff | Original task and frozen filesystem/git snapshot only. |
| B. Raw transcript | Prior visible transcript or command log history. |
| C. Token-matched free-form summary | Free prose summary with the same token budget as the structured handoff. |
| D. Artifact-only | Changed files, git diff, command logs, and gate outputs without narrative diagnosis. |
| E. Structured handoff | Schema-based workflow state without separate gate-evidence block. |
| F. Gate evidence only | Gate commands, exit codes, status, and remaining verification risks. |
| G. Structured handoff + gate evidence | Proposed method. |
| H. Human oracle handoff | Expert-authored diagnostic ceiling, reported with observability and author-time metadata. |

## Task Requirements

Good tasks should require multiple files, include meaningful context pointers,
and have objective acceptance criteria. At least one required gate should be
relevant to the changed files.

Avoid tasks that are one-line fixes, tasks without verification oracles, and
tasks whose success depends mainly on external services.

## Suggested Pilot Size

Start with a small controlled pilot before broad automation:

```text
1 task x 8 conditions x 2 repeats = 16 runs
3 tasks x 8 conditions x 2 repeats = 48 runs
5 tasks x 8 conditions x 2 repeats = 80 runs
```

Use the smallest pilot to validate the protocol, scorer, and logging first.
Then scale tasks before adding more models. Keep all eight core conditions so the
ablation remains interpretable.

A later paper-scale study can use:

```text
10 tasks x 8 conditions x 3 repeats = 240 runs
```

Long-context, AGENTS.md, Semble, CodeGraph, and compressed-continuation
conditions should be treated as expansion studies after the core handoff/gate
ablation works.

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
