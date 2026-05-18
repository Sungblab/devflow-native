# Research Harness

Solo Devflow OS can be used as a research harness for studying multi-session AI
coding agents. The product remains a local-first continuity layer; the research
harness evaluates whether that layer improves continuation reliability.

## Research Question

Does structured workflow-state handoff with gate evidence improve continuation
success and reduce false completion in multi-session AI coding agents compared
with no handoff, raw transcript, token-matched free-form summary, static
repository context, gate-only evidence, and human oracle handoff?

## Scope

This research is not a general agent memory benchmark. It focuses on the
software engineering case where one coding task spans multiple sessions and the
next agent must recover:

- active work state
- changed files and reasons
- decisions already made
- known failures and remaining risks
- deterministic gate evidence
- next useful actions

Static repo context such as `AGENTS.md` remains useful for durable project
rules, but it does not record the current task state or verification history.

## Product Boundary

`packages/core` owns the product contracts. `docs/research/` explains the
research framing, metrics, baselines, and schema semantics. `experiments/`
contains condition templates and future fixture/run/result records.

HTML artifacts are not source of truth. They can help humans inspect dense
state, but the durable evidence is structured `.devflow` state, append-only
events, JSON schemas, and Markdown research docs.

## Read Next

- [Research Plan](./research-plan.md)
- [Experiment Design](./experiment-design.md)
- [Baselines](./baselines.md)
- [Metrics](./metrics.md)
- [Schemas](./schemas.md)
- [Related Work Notes](../research.md)
