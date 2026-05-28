# Devflow Native Agent Guide

Respond in Korean when working with the maintainer.

Devflow Native is a local-first workflow companion for solo developers who use
Claude Code, Codex, and other AI coding agents. The product is not another
coding agent. It records, verifies, visualizes, splits, and resumes the
development process around coding agents.

## Read Order

Start with the project context in this order:

1. `docs/README.md`
2. `docs/product-plan.md`
3. `docs/harness.md`
4. `docs/architecture.md`
5. `docs/roadmap.md`
6. Relevant files under `docs/contributing/`, `docs/architecture/maps/`,
   `docs/examples/`, and `skills/`

## Product Position

The core product owns:

- project contracts
- work items
- agent/manual session records
- git and review state
- quality gates
- docs/code/test maps
- handoff and next-session prompts
- optional generated artifact views

It should not become dependent on any single external methodology or runtime.
Superpowers, gstack, OpenHarness, Hermes, Codex, Claude, and future agent hosts are
profiles/adapters/references, not the center of the product.

Use external projects as references carefully:

- Superpowers is a workflow-methodology and skills-distribution reference.
  Devflow may interoperate with it, but the core must not require Superpowers
  to be installed or followed.
- Hermes Agent is a persistent memory, skills, doctor, automation, and
  model-agnostic agent reference. Devflow should learn from those surfaces
  without becoming a persistent autonomous agent.
- Personal maintainer experiences belong in local project/user memory unless
  they describe a general product category. Public examples should use generic
  categories such as shell mismatch, transport mismatch, file I/O friction, or
  framework version drift.

## Current Development Bias

- Design the large product clearly, but keep implementation slices crisp.
- Prefer local-first files, SQLite, and CLI-readable state before hosted sync.
- Treat Windows PowerShell as a first-class environment.
- Dogfood the product on this directory and on OpenCairn examples.
- Every completed task should include a next-session prompt.

## Prompt Interpretation Rules

- Analyze the maintainer's natural-language request before implementation.
  The maintainer often writes fast, partial, conversational prompts instead of
  polished specs. Infer intent from repo context, recent handoffs, docs, and
  repeated mistakes before choosing the slice.
- Do not reduce examples to an exhaustive list. If the maintainer gives two
  examples, treat them as evidence of a broader class and add adjacent rules
  when the context supports them.
- Check for missing requirements, ambiguous scope, hidden verification needs,
  environment assumptions, and tooling version drift before coding. If a fact is
  likely to have changed, verify it from the repo or current primary docs.
- Minimize maintainer questions. Ask only when local context cannot answer the
  question and a wrong assumption would create real risk.
- When the maintainer says to handle it autonomously, "continue", "finish this", or similar,
  choose the next concrete action from repo state, product intent, and risk
  level. Do not stop after the literal smallest interpretation of the prompt.

## Documentation Rules

- Public product docs live under `docs/`.
- Skill behavior contracts live under `skills/<skill-name>/SKILL.md`.
- Examples live under `docs/examples/`.
- Architecture maps live under `docs/architecture/maps/`.
- Do not bury product decisions only in chat; update the relevant doc.
- Before every final response, Decide whether documentation needs an update.
  If the work changed product behavior, workflow policy, plugin behavior, or
  repeated agent rules, update the relevant doc or skill before answering. If
  no durable product decision changed, no doc update is required.

## GitHub And Finish Rules

- Prefer `gh` CLI for GitHub PR operations from this repo. Use connector tools
  only when `gh` is unavailable, unauthenticated, or the maintainer explicitly
  asks for connector-based GitHub actions.
- When Codex goal support is available, inspect the active Codex goal before
  closing substantial work and verify the final result against that objective.
- Every final implementation response should include what changed, what was
  verified, known gaps, and the next recommended implementation slice.
- Ask whether to commit, open a PR, or continue with the next slice
  when those actions are relevant. Also offer a next-session prompt when a
  handoff would help.

## Planned Surfaces

```text
skills/       agent-facing workflows
packages/     future implementation packages
templates/    future project scaffold templates
docs/         product, architecture, roadmap, examples
.devflow/     future local project state and config
```

## Verification

This project is currently in product/spec setup. Before claiming a setup task is
complete, at minimum verify that the expected files exist and that Markdown
links are coherent by reading the changed docs.
