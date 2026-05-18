# Research Plan

## Thesis

AI coding-agent failures across session boundaries are not only model-quality
failures. They are also workflow-state failures: the next session often lacks a
faithful, minimal, actionable record of what changed, what was verified, what
failed, and what remains risky.

Solo Devflow OS studies this as verification-aware structured handoff for
coding workflow continuity.

## Contributions To Test

1. A structured handoff schema for same-task multi-session coding work.
2. A gate-evidence schema that records verification relevance, not just command
   output.
3. A false-completion guard model where completion claims are blocked by
   missing, failed, skipped, or stale gate evidence.
4. An experiment harness that separates the effects of structure and
   verification evidence through ablation conditions.

## Non-Goals

- Building another autonomous coding agent.
- Building a hosted dashboard-first orchestration platform.
- Evaluating generic long-term personal memory.
- Replacing `AGENTS.md`, Superpowers, Hermes Agent, Codex, Claude Code, or
  Gemini CLI.

## System Interpretation

Agent IDEs and orchestrators run agents. Solo Devflow OS records the project
truth those agents share:

- work items
- sessions
- git state
- gate evidence
- review state
- handoffs
- next-session prompts

The research harness measures whether that project truth improves the next
session's behavior.
