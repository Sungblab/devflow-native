# Research Schemas

The product core owns the shared handoff and gate-evidence schemas:

- [`handoff.schema.json`](../../packages/core/src/schemas/handoff.schema.json)
- [`gate-evidence.schema.json`](../../packages/core/src/schemas/gate-evidence.schema.json)

The research harness uses those schemas to make conditions comparable across
agents, models, and tasks.

Experiment fixtures and scored outputs use:

- [`task.schema.json`](../../experiments/schemas/task.schema.json)
- [`run.schema.json`](../../experiments/schemas/run.schema.json)
- [`result.schema.json`](../../experiments/schemas/result.schema.json)

## Structured Handoff

Structured handoff records the current workflow state for one work item. It
should include the task goal, status, changed files, decisions, known failures,
remaining risks, next actions, context pointers, and mistakes the next session
should not repeat.

It is not a raw transcript and it is not a generic memory note. Its job is to
make same-task continuation faithful, minimal, and actionable.

## Gate Evidence

Gate evidence records a verification event tied to a work item and changed
files. It includes the command descriptor, start and finish timestamps, exit
code, status, stdout/stderr summaries, changed files covered, relevance reason,
and remaining risk.

Gate evidence is not just test output. It is evidence that a specific gate was
or was not relevant to the current work.

## False Completion Guard

`devflow finish --json` derives completion readiness from recorded state rather
than agent claims. A work item is not claimable as done when required gates are
failed, skipped, unknown, missing after relevant changes, or contradicted by
known risks.

The stable guard fields are:

- `canClaimDone`
- `doneBlockers`
- `skippedGates`
- `failedGates`
- `unknownGates`
- `remainingRisks`
- `structuredHandoff`
- `nextPrompt`

## Handoff Quality Rubric

Use the metrics in [metrics.md](./metrics.md) to score completeness,
faithfulness, minimality, and actionability. Faithfulness must be checked
against repo state, git diff, and gate evidence, not against the handoff text
alone.
