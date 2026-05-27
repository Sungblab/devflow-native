# Related Work

Devflow's research framing is not "agent memory" in general. The narrower
question is whether a repo-local, verification-aware workflow-state handoff
helps coding agents continue the same task across sessions.

This page consolidates the local planning drafts in:

- `docs/agentic_handoff_research_plan_v2.html`
- `docs/AI 코딩 에이전트 핸드오프 연구.md`
- `docs/deep-research-report.md`

Those drafts remain useful research notes, but this Markdown file is the
durable related-work map for the repository.

## Positioning Gap

Prior work increasingly shows that agent performance depends on the harness,
context interface, memory substrate, and verification environment around the
model. Devflow studies a nearby but narrower gap:

> Search and memory papers ask whether agents can find or remember relevant
> context. Devflow asks whether agents can resume an interrupted coding task
> from structured active-work state and deterministic gate evidence without
> repeating exploration or falsely claiming completion.

## Categories

### Agent Harness And Tool Presentation

| Work | Main Point | Devflow Connection |
| --- | --- | --- |
| [SWE-agent](https://arxiv.org/abs/2405.15793) | Agent-computer interfaces materially affect automated software engineering performance. | Supports studying the interface between coding agents and their environment, not only model capability. |
| [Is Grep All You Need?](https://arxiv.org/abs/2605.15184) | Retrieval strategy interacts with agent harnesses and tool-output presentation; harness choice changes outcomes over the same data. | Positions handoff format and gate-evidence presentation as harness-level variables worth measuring. |
| [Agentic Harness Engineering](https://arxiv.org/abs/2604.25850) | Harnesses can be treated as editable, observable systems whose components and decisions can be evaluated. | Devflow is not evolving harnesses automatically, but it uses the same premise that evidence and observability around agent loops matter. |

### Repository Instructions And Executable Constraints

| Work | Main Point | Devflow Connection |
| --- | --- | --- |
| [Evaluating AGENTS.md](https://arxiv.org/abs/2602.11988) | Static repository instruction files are not automatically helpful and can increase cost or reduce success. | Clarifies why Devflow should go beyond static repo context into current task state and verification evidence. |
| [ContextCov](https://arxiv.org/abs/2603.00822) | Natural-language agent instructions can be derived into executable constraints and guardrails. | Adjacent to Devflow's gate evidence and finish guard: passive instructions are weaker than recorded or executable verification. |

### Coding-Agent Context And Experience Reuse

| Work | Main Point | Devflow Connection |
| --- | --- | --- |
| [Semble](https://github.com/MinishLab/semble) | Agent-oriented code search that returns relevant code chunks through CLI or MCP and reports large token savings over grep-plus-read exploration. | Useful related work and possible baseline for token-efficient code localization. Semble helps agents find relevant code, while Devflow preserves task-specific workflow state, gate evidence, and completion blockers across sessions. |
| [CodeGraph](https://github.com/colbymchenry/codegraph) | Local pre-indexed code knowledge graph for coding agents, including symbol relationships, call graphs, code structure, impact analysis, and MCP integration. | Strong related tool and possible baseline for repo navigation and codebase orientation cost. CodeGraph helps agents understand code structure and impact radius, while Devflow focuses on interrupted-task state, verification evidence, and completion blockers across sessions. |
| [ContextBench](https://arxiv.org/abs/2602.05892) | Evaluates context retrieval for coding agents, including precision, recall, and efficiency. | Devflow's irrelevant file reads and repeated exploration metrics are downstream of context focus. |
| [SWE Context Bench](https://arxiv.org/abs/2602.08316) | Studies reuse of prior coding-task experience. | Devflow focuses on intra-task continuation, not inter-task reuse of completed past experience. |
| [LongCLI-Bench](https://arxiv.org/abs/2602.14337) | Long-horizon CLI engineering tasks expose low pass rates and early-stage failures in agents. | Supports measuring time to first useful edit, repeated exploration, and continuation success in terminal-like coding workflows. |
| [Structurally Aligned Subtask-Level Memory](https://arxiv.org/abs/2602.21611) | Shows that memory granularity matters for software-engineering agents; coarse instance-level memory can retrieve the wrong reasoning stage. | Supports Devflow's decision to store work state as task slices, changed files, gates, risks, and next actions rather than one flat session summary. |
| [SlopCodeBench](https://arxiv.org/abs/2603.24755) | Evaluates iterative coding tasks and finds that agents can pass checkpoints while code quality erodes through repeated extensions. | Adds a maintainability angle for later Devflow studies: handoff quality should not only improve final pass rate, but also reduce drift, duplicated code, and unsupported architectural changes. |

### Agent Memory And Multi-Session State

| Work | Main Point | Devflow Connection |
| --- | --- | --- |
| [MemoryArena](https://arxiv.org/abs/2602.16313) | Multi-session agent-memory evaluation matters when subtasks are interdependent. | Confirms the importance of multi-session continuity, while Devflow specializes the setting to software engineering state and gates. |
| [AMA-Bench](https://arxiv.org/abs/2602.22769) | Long-horizon memory for agentic applications needs benchmarks beyond short conversational recall. | Helps separate Devflow from generic memory: Devflow stores workflow events, changed files, and verification evidence. |
| [TencentDB Agent Memory](https://github.com/Tencent/TencentDB-Agent-Memory) | OpenClaw/Hermes memory plugin that combines symbolic short-term context offload with layered long-term memory. The project describes L0 conversation, L1 atom, L2 scenario, and L3 persona layers, plus Mermaid task canvases whose nodes link back to raw tool-output refs. | Strong related system for progressive disclosure and inspectable memory artifacts. Devflow should learn from the "upper structure, lower evidence" pattern, but should keep its claim centered on same-task workflow state, changed files, gate evidence, and false-completion guards rather than general user persona memory. |
| [ARIS](https://arxiv.org/abs/2605.03042) | Autonomous research agents use artifacts and adversarial review across long workflows. | Conceptually close to contract-like handoff, but Devflow uses deterministic software gates instead of only model-based review. |

### Symbolic State And Progressive Disclosure

TencentDB Agent Memory adds a useful design reference that sits between generic
memory and Devflow's workflow-state handoff. Its README and source describe a
short-term context-offload path where verbose tool calls are stored outside the
prompt, summarized into JSONL records, and represented as a compact Mermaid
canvas. The offload record type includes a `node_id`, `summary`, `result_ref`,
and `tool_call_id`; the Mermaid layer can therefore stay small while preserving
a path back to raw evidence.

For Devflow, the transferable idea is not the full memory stack. The useful
piece is a task-state canvas that is generated from structured source records
and can drill down to evidence. A Devflow canvas should be derived from
append-only events, gate runs, changed-file records, and handoff fields. It
should not replace those records, and it should not become an agent-curated
persona or general memory file.

This suggests a later experiment extension:

- `canvas-only` continuation package: a compact Mermaid workflow-state graph
  with event/gate/file refs, but without prose diagnosis.
- `structured handoff plus canvas`: the normal structured handoff and gate
  evidence plus a compact graph view.
- `raw transcript plus canvas`: raw transcript with an automatically generated
  task graph, to test whether symbolic compression reduces exploration without
  requiring the full Devflow schema.

### Verification And Trustworthy Coding Agents

| Work | Main Point | Devflow Connection |
| --- | --- | --- |
| [Intent Formalization](https://arxiv.org/abs/2603.17150) | Reliable AI coding requires closing the gap between informal user intent and verifiable behavior. | Supports Devflow's false-completion framing and acceptance/gate evidence metrics. |
| [Agentic Verification of Software Systems](https://arxiv.org/abs/2511.17330) | Agentic workflows can participate in software verification. | Adjacent to Devflow's view that completion claims should be tied to concrete verification events. |
| [Trustworthy AI Software Engineers](https://arxiv.org/abs/2602.06310) | Trustworthiness is a first-order concern for AI software engineers. | Provides broader motivation for recording what was verified, not just what the agent said. |
| [Rethinking Software Engineering for Agentic AI Systems](https://arxiv.org/abs/2604.10599) | Agentic AI changes software engineering practices and failure modes. | Motivates Devflow as engineering infrastructure around coding agents. |
| [AI Agentic Programming Survey](https://arxiv.org/abs/2508.11126) | Surveys agentic programming techniques, challenges, and opportunities. | Background literature for the broader agentic software engineering context. |

### Human Task Resumption And Interruption

| Work | Main Point | Devflow Connection |
| --- | --- | --- |
| [Resumption Strategies for Interrupted Programming Tasks](https://chrisparnin.me/pdf/parnin-icpc09.pdf) | Human developers also spend substantial effort recovering working state after interruptions; the paper reports navigation before editing and measures edit lag as a programming-specific resumption cost. | Provides non-LLM grounding for Devflow's core problem: interrupted programming needs more than file context. Plans, progress, failures, and evaluation state matter for resuming work. |
| [Context Discipline](https://arxiv.org/abs/2601.11564) | Large volumes of irrelevant context can degrade model quality and increase computational overhead. | Supports token-matched and artifact-only baselines: Devflow should show that it reduces rediscovery and noise, not merely that it gives the next agent more text. |

## Devflow Contribution Claim

The safest research claim is:

> Structured workflow-state handoff with gate evidence is a harness-level
> intervention for same-task multi-session coding agents. It can be evaluated
> against no handoff, raw transcript, token-matched free-form summary,
> structured handoff without gates, gate-only evidence, structured handoff plus
> gates, and human oracle handoff.

Avoid claiming that Devflow is the first agent memory system. The stronger and
more defensible claim is that it combines three narrower pieces:

- same-task continuation rather than general long-term memory
- active workflow state rather than static repository instructions
- deterministic gate evidence rather than natural-language completion claims

## Practical Implication For Experiments

The related work suggests three controls that the experiment harness should
keep:

- Match token budgets when comparing free-form summaries with structured
  handoff.
- Separate structured handoff from gate evidence with ablation conditions.
- Measure not only final success, but also false completion, irrelevant file
  reads, repeated exploration, and time to first useful edit.

Semble and CodeGraph add useful controls for later studies:

- As a baseline, compare no-handoff continuation with normal grep/read against
  no-handoff continuation with Semble-assisted code search or CodeGraph-assisted
  code navigation.
- As a controlled tool, allow every condition to use the same search or graph
  tool so the experiment isolates workflow-state handoff rather than
  code-search quality.
- As a combined condition, test structured handoff plus gate evidence plus
  Semble or CodeGraph to see whether active-work state and token-efficient code
  exploration are complementary.
