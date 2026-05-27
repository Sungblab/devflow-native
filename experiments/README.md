# Experiments

This directory contains the research harness for evaluating whether structured
handoff plus gate evidence improves multi-session coding-agent continuation.

The harness is separate from the product core. It consumes Devflow contracts
and recorded state, but `packages/core` must not depend on experiment scripts.

## Current Scope

This skeleton defines condition templates, task/input/run/result schemas,
task-001 A-H pilot inputs, hidden evaluation metadata, observable-only
provenance, and placeholder scorer scripts. It does not yet automate agent
execution or fixture reset.

## Protocol

- [Experiment protocol](./protocol.md)
- [Task schema](./schemas/task.schema.json)
- [Input fixture schema](./schemas/input-fixture.schema.json)
- [Provenance schema](./schemas/provenance.schema.json)
- [Hidden evaluation metadata schema](./schemas/hidden-eval.schema.json)
- [Run schema](./schemas/run.schema.json)
- [Result schema](./schemas/result.schema.json)
- [Sample task fixture](./fixtures/tasks/task-001.json)
- [Task 001 A-H pilot inputs](./fixtures/inputs/task-001/)

## Conditions

- [No handoff](./conditions/00-no-handoff.md)
- [Raw transcript](./conditions/01-raw-transcript.md)
- [Token-matched summary](./conditions/02-token-matched-summary.md)
- [Artifact-only](./conditions/03-artifact-only.md)
- [Structured handoff](./conditions/04-structured-handoff.md)
- [Gate evidence only](./conditions/05-gate-only.md)
- [Structured handoff plus gate evidence](./conditions/06-structured-handoff-plus-gate.md)
- [Human oracle handoff](./conditions/07-human-oracle.md)

## Scripts

```powershell
node experiments/scripts/score-handoff.js <handoff-json>
node experiments/scripts/score-run.js <run-json>
node experiments/scripts/aggregate-results.js <result-json> [result-json...]
```

The scoring scripts currently use deterministic placeholder heuristics. Human
or LLM-assisted scoring is still needed for semantic checks such as handoff
faithfulness and useful edit detection.

Example pilot plumbing:

```powershell
node experiments/scripts/score-run.js experiments/fixtures/runs/task-001-structured-handoff-plus-gate.json
node experiments/scripts/aggregate-results.js experiments/fixtures/results/task-001-structured-handoff-plus-gate.json
```

## Layout

```text
experiments/
  fixtures/
    repos/
    handoffs/
    results/
    runs/
    tasks/
    snapshots/
  schemas/
    task.schema.json
    run.schema.json
    result.schema.json
  scripts/
    score-handoff.js
    score-run.js
    aggregate-results.js
  results/
```

The next implementation slice should add a dry-run pilot flow that reads the
task-001 A-H input package and writes run/result JSON without invoking real
agents.
