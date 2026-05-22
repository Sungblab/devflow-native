# Research Paper Cache

This directory is a local cache for paper PDFs used while developing the
Devflow research framing.

PDF files are intentionally ignored by git to avoid bloating the repository.
Keep durable citations and summaries in Markdown under `docs/research/`.

## Local Draft Inputs

The following local drafts were used as source notes while consolidating the
research framing. They are intentionally ignored by git because their durable
content has been absorbed into `docs/research/` Markdown files.

- `docs/agentic_handoff_research_plan_v2.html`
- `docs/AI 코딩 에이전트 핸드오프 연구.md`
- `docs/deep-research-report.md`

## Downloaded Papers

| Paper | Local PDF | Source |
| --- | --- | --- |
| Is Grep All You Need? How Agent Harnesses Reshape Agentic Search | `2605.15184-is-grep-all-you-need-agent-harnesses.pdf` | <https://arxiv.org/abs/2605.15184> |
| Agentic Harness Engineering: Observability-Driven Automatic Evolution of Coding-Agent Harnesses | `2604.25850-agentic-harness-engineering.pdf` | <https://arxiv.org/abs/2604.25850> |
| ContextCov: Deriving and Enforcing Executable Constraints from Agent Instruction Files | `2603.00822-contextcov-executable-constraints.pdf` | <https://arxiv.org/abs/2603.00822> |
| AMA-Bench: Evaluating Long-Horizon Memory for Agentic Applications | `2602.22769-ama-bench-long-horizon-memory.pdf` | <https://arxiv.org/abs/2602.22769> |
| Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents? | `2602.11988-evaluating-agents-md.pdf` | <https://arxiv.org/abs/2602.11988> |
| LongCLI-Bench | `2602.14337-longcli-bench.pdf` | <https://arxiv.org/abs/2602.14337> |
| ContextBench: A Benchmark for Context Retrieval in Coding Agents | `2602.05892-contextbench-context-retrieval.pdf` | <https://arxiv.org/abs/2602.05892> |
| SWE Context Bench: A Benchmark for Context Learning in Coding | `2602.08316-swe-context-bench.pdf` | <https://arxiv.org/abs/2602.08316> |
| MemoryArena: Benchmarking Agent Memory in Interdependent Multi-Session Agentic Tasks | `2602.16313-memoryarena.pdf` | <https://arxiv.org/abs/2602.16313> |
| ARIS: Autonomous Research via Adversarial Multi-Agent Collaboration | `2605.03042-aris-autonomous-research.pdf` | <https://arxiv.org/abs/2605.03042> |
| Rethinking Software Engineering for Agentic AI Systems | `2604.10599-rethinking-se-for-agentic-ai.pdf` | <https://arxiv.org/abs/2604.10599> |
| AI Agentic Programming: A Survey of Techniques, Challenges, and Opportunities | `2508.11126-ai-agentic-programming-survey.pdf` | <https://arxiv.org/abs/2508.11126> |
| Trustworthy AI Software Engineers | `2602.06310-trustworthy-ai-software-engineers.pdf` | <https://arxiv.org/abs/2602.06310> |
| Intent Formalization: A Grand Challenge for Reliable Coding in the Age of AI Agents | `2603.17150-intent-formalization.pdf` | <https://arxiv.org/abs/2603.17150> |
| Agentic Verification of Software Systems | `2511.17330-agentic-verification-software-systems.pdf` | <https://arxiv.org/abs/2511.17330> |
| SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering | `2405.15793-swe-agent-agent-computer-interfaces.pdf` | <https://arxiv.org/abs/2405.15793> |

## Refresh

```powershell
Invoke-WebRequest -Uri https://arxiv.org/pdf/2605.15184 -OutFile docs/research/papers/2605.15184-is-grep-all-you-need-agent-harnesses.pdf
```
