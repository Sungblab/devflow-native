# Paper Outline

## Working Title

Beyond AGENTS.md: Verification-Aware Workflow-State Handoff for Reliable
Multi-Session Coding Agents

## One-Sentence Thesis

Structured active-work handoff plus deterministic gate evidence is a
harness-level intervention that can improve same-task continuation and reduce
false completion in multi-session AI coding-agent workflows.

## Target Paper Shape

This should be framed as a software-engineering systems paper with a controlled
evaluation, not as a generic agent-memory paper.

The system contribution is the repo-local continuity layer:

- a structured handoff contract for interrupted coding work
- a gate-evidence contract tied to changed files and remaining risk
- a false-completion guard over recorded verification events
- an experiment harness that evaluates the contracts through ablations

The empirical contribution is the comparison against common continuation
baselines.

## Abstract Draft

AI coding agents increasingly edit files, run commands, and reason over
software projects through terminal and IDE harnesses. However, many realistic
coding tasks cross session boundaries: context windows are compacted, agent
processes stop, humans switch tools, and a later session must infer what was
done and what remains risky. Static repository instructions such as
`AGENTS.md` capture durable project rules, but they do not capture active work
state or verification history. Raw transcripts and free-form summaries can
preserve more information, but they are noisy, costly, and may omit failed
checks.

We study verification-aware workflow-state handoff for same-task multi-session
coding agents. We introduce a repo-local continuity layer that records changed
files, decisions, known failures, gate evidence, remaining risks, and next
actions as structured handoff data. We evaluate whether this handoff, with and
without deterministic gate evidence, improves continuation success and reduces
false completion compared with no handoff, raw transcript handoff,
token-matched free-form summary, artifact-only context, gate-only evidence, and
human oracle handoff.
Our planned evaluation measures continuation success, false completion, token
cost, time to first useful edit, irrelevant file reads, repeated exploration,
and handoff quality. The study positions workflow-state handoff as a
harness-level reliability mechanism for coding agents rather than a replacement
for model memory or static repository instructions.

## Research Questions

### RQ1: Continuation Success

Does structured workflow-state handoff improve same-task continuation success
after an interrupted coding session compared with no handoff, raw transcript,
and token-matched free-form summary?

### RQ2: Verification Evidence

Does adding deterministic gate evidence reduce false completion compared with
structured handoff alone or gate evidence alone?

### RQ3: Cost And Exploration

Does structured handoff reduce token cost, irrelevant file reads, repeated
exploration, cold-start exploration cost, and time to first useful edit
compared with raw transcript, no handoff, or compressed continuation?

### RQ4: Handoff Quality

Do structured handoffs score higher on completeness, faithfulness, minimality,
and actionability than token-matched free-form summaries?

## Hypotheses

- H1: Structured handoff improves continuation success over no handoff and
  token-matched free-form summary.
- H2: Raw transcript can preserve useful context but costs more tokens and
  increases irrelevant exploration.
- H3: Gate evidence reduces false completion when completion claims depend on
  recorded verification events rather than natural-language assertions.
- H4: Structured handoff plus gate evidence gives the best balance of success,
  cost, and reliability, while human oracle handoff remains the upper bound.

## Introduction Structure

1. Coding agents are becoming multi-step software engineering actors.
2. Long-running work often crosses session boundaries.
3. Current continuity mechanisms are weak:
   - static repository instructions are durable but not task-state aware
   - raw transcripts are noisy and costly
   - free-form summaries are lossy and may hide failed verification
4. The key failure modes are context loss, repeated exploration, poor handoff,
   and false completion.
5. Devflow proposes a repo-local continuity layer: structured active-work state
   plus gate evidence.
6. The paper asks whether this layer improves continuation behavior in a
   controlled multi-session coding-agent setting.

## Related Work Structure

Use [related-work.md](./related-work.md) as the source map.

### Agent Harnesses And Tool Presentation

Position Devflow alongside work showing that harnesses and tool-output
presentation affect agent behavior. The important point is that Devflow
changes the continuation interface, not the base model.

Key works:

- SWE-agent
- Is Grep All You Need?
- Agentic Harness Engineering

### Static Repository Context And Executable Instructions

Static repo files help with durable rules but are insufficient for current work
state. Executable constraints are closer to Devflow's gate-evidence position.

Key works:

- Evaluating AGENTS.md
- ContextCov

### Context Retrieval And Experience Reuse

These works evaluate whether agents can find or reuse context. Devflow studies
the adjacent question of how interrupted task state should be serialized for
the next session.

Key works:

- ContextBench
- SWE Context Bench
- LongCLI-Bench

### Agent Memory And Multi-Session State

These works justify multi-session evaluation while helping narrow Devflow away
from generic personal or conversational memory.

Key works:

- MemoryArena
- AMA-Bench
- TencentDB Agent Memory
- ARIS

TencentDB Agent Memory should be discussed as an inspectable layered-memory
system rather than as a direct baseline for Devflow. Its relevant design pattern
is symbolic short-term memory: verbose tool logs are offloaded, compact Mermaid
nodes remain in context, and node identifiers trace back to raw evidence. This
supports Devflow's progressive-disclosure argument, while also sharpening the
boundary: Devflow's primary object is active software-engineering workflow
state and gate evidence, not general persona memory.

### Verification And Trustworthy Coding Agents

These works support treating completion as a verification problem, not only a
generation problem.

Key works:

- Intent Formalization
- Agentic Verification of Software Systems
- Trustworthy AI Software Engineers
- Rethinking Software Engineering for Agentic AI Systems

## System Section

### Design Goals

- Repo-local and local-first.
- Agent-neutral across Codex, Claude Code, Gemini, shell sessions, and future
  MCP hosts.
- Structured state rather than unbounded transcript replay.
- Verification evidence tied to changed files and remaining risk.
- CLI and MCP surfaces over the same core contract.

### Non-Goals

- Building a new autonomous coding agent.
- Replacing AGENTS.md, CLAUDE.md, Superpowers, Hermes, or agent IDEs.
- Building a dashboard-first app.
- Treating generated HTML artifacts as source of truth.

### Core Contracts

Summarize:

- handoff schema
- gate-evidence schema
- finish result contract
- event log as source of truth

### False-Completion Guard

Define the finish guard:

```text
canClaimDone = false if any required gate is missing, failed, skipped,
unknown, stale, or irrelevant to changed files, or if remaining risks are
present.
```

Clarify that this is not proof of correctness; it is a guard against unsupported
completion claims.

## Experiment Section

### Task Setup

Each task starts from a repository fixture with objective acceptance criteria
and required gates. Session 1 reaches a partial-progress state. The filesystem,
git diff, event log, command logs, and tool traces are frozen. Session 2 starts
from the same snapshot under different handoff conditions.

### Conditions

| ID | Condition | Purpose |
| --- | --- | --- |
| A | No handoff | Baseline for pure context loss. |
| B | Raw transcript | Tests whether more context helps despite noise and token cost. |
| C | Token-matched free-form summary | Separates structure from summary length. |
| D | Artifact-only | Separates observable artifact exposure from narrative workflow-state interpretation. |
| E | Structured handoff | Tests schema-based active-work state. |
| F | Gate evidence only | Isolates verification evidence without task-state structure. |
| G | Structured handoff plus gate evidence | Main proposed condition. |
| H | Human oracle handoff | Upper bound. |

### Metrics

Outcome metrics:

- continuation success
- false completion
- token cost
- time to first useful edit
- irrelevant file read count
- repeated exploration count

Handoff quality metrics:

- completeness
- faithfulness
- minimality
- actionability

### Pilot Scale

Start small:

```text
5 tasks x 8 conditions x 2 repeats = 80 runs
```

If agent cost is too high, reduce repeats before removing conditions. The
ablation is central to the claim.

### Extension Conditions

After the A-H pilot works, add symbolic-state conditions inspired by TencentDB
Agent Memory:

| ID | Condition | Purpose |
| --- | --- | --- |
| I | Canvas-only | Tests whether a compact Mermaid workflow graph with event/gate/file refs helps continuation without prose diagnosis. |
| J | Structured handoff plus canvas | Tests whether a symbolic graph improves scan speed over the normal structured handoff plus gate evidence. |
| K | Raw transcript plus canvas | Tests whether automatic symbolic compression can reduce transcript noise while preserving traceability. |

These are extension conditions, not replacements for A-H. The core paper should
first prove that the handoff and gate-evidence ablation works before adding
symbolic views.

## Expected Results Shape

The strongest result pattern would be:

- structured handoff plus gate evidence has the lowest false-completion rate
- structured handoff reduces repeated exploration versus no handoff
- raw transcript has high token cost and more irrelevant reads
- token-matched summary is cheaper than raw transcript but less faithful than
  structured handoff
- gate-only evidence reduces false completion but lacks enough task context for
  optimal continuation

Avoid assuming this outcome. The paper should report whether the measured
effect appears and where it fails.

## Threats To Validity

### Task Fixture Bias

Small synthetic repositories may overfit to Devflow's schema. Mitigation:
start with controlled fixtures, then add public-repo tasks and at least one
dogfood case study.

### Model And Harness Sensitivity

Results may depend on Codex, Claude Code, Gemini CLI, or a specific MCP/CLI
harness. Mitigation: report harness details and run at least one secondary
agent family in the pilot if cost permits.

### Scoring Subjectivity

Handoff quality and useful-edit detection can be subjective. Mitigation: keep
deterministic metrics where possible, define a rubric, and use blinded human or
LLM-assisted review for semantic metrics.

### Token Budget Confounds

Longer context packages may win only because they include more information.
Mitigation: include token-matched free-form summary, report token cost, and
treat long-context or compressed-continuation runs as explicit baselines rather
than assuming short handoff is always better.

### Gate Evidence Limits

Passing gates do not prove full correctness. Mitigation: frame gate evidence as
a guard against unsupported completion claims, not as a complete correctness
oracle.

## Contribution Statement

This paper contributes:

1. A problem formulation for same-task multi-session coding-agent continuity.
2. A structured handoff and gate-evidence protocol for repo-local coding
   workflows.
3. A false-completion operational definition tied to recorded verification
   evidence.
4. An ablation-based experiment design for measuring continuation success,
   false completion, cost, exploration, and handoff quality.

## First Submission Target

The realistic first target is a workshop or short paper in software
engineering for AI agents, human-AI software engineering, or agentic systems.
After a successful pilot, the work can be expanded toward ASE/ICSE/FSE-style
system and evaluation papers.

## Immediate Next Work

1. Expand `task-001` fixtures to all eight core conditions.
2. Add at least four more controlled tasks.
3. Implement a replayable run directory structure that stores snapshot id,
   condition id, agent id, run output, scored result, and gate evidence refs.
4. Replace placeholder handoff-faithfulness scoring with a rubric-backed review
   path.
5. Run a small pilot and write a results table.
