# Product Plan

## Problem

AI coding agents make implementation faster, but they also make solo
development easier to lose track of. Multiple sessions, partial fixes, generated
docs, PR review comments, failing checks, and handoff prompts scatter across
terminal tabs, chat histories, git status, GitHub, and local notes.

The resulting failure mode is not "the agent cannot code." The failure mode is
loss of continuity:

- The maintainer forgets what was actually verified.
- Parallel sessions duplicate or conflict with each other.
- Documentation drifts from code.
- Review comments are treated as final truth instead of evidence to verify.
- A finished task lacks a clean next-session prompt.
- Starting a new project requires rebuilding the same workflow scaffolding.

## Product Goal

Build a local-first workflow OS for solo maintainers using AI agents. It should
make the development process observable, resumable, and enforceable across
projects without forcing every project into a hosted SaaS.

## Non-Goals

- Do not start as another general coding agent.
- Do not require a hosted service.
- Do not hide git, tests, or PR review behind vague AI summaries.
- Do not make orchestration the first product center.
- Do not assume the user wants many parallel agents by default.
- Do not make a persistent visual dashboard the MVP. Visual output should be
  generated only when it helps the maintainer inspect dense state.

## Target User

The primary user is a solo builder maintaining one or more serious repositories
with AI assistance. They may use Codex, Claude Code, Gemini, GitHub review bots,
local test harnesses, and private planning docs.

They want the speed of agentic development without losing engineering control.

## Audience Tiers

### Primary: Solo Maintainers

The first target is a developer who already uses AI coding agents for real
projects and needs continuity across sessions, branches, tests, reviews, and
handoffs. They are comfortable with git and terminals, but they do not want to
manually reconstruct project state every time a new Codex, Claude Code, Gemini,
or shell session starts.

### Secondary: Growing Vibe Coders

The second target is a beginner or non-specialist who starts with vibe coding
but wants to keep growing a project instead of throwing prototypes away. This
user may not know words such as sidebar, toast notification, modal, route,
state management, middleware, or responsive layout.

Solo Devflow OS should not become a general coding course. The beginner value is
translation at the point of work:

- explain development and UI terms that appear in agent output
- rewrite vague user intent into precise prompts
- show what changed, what to click, and what to verify
- provide simple/guided views over the same project state

Example beginner-facing commands:

```text
devflow status --simple
devflow next
devflow explain "toast notification"
devflow finish --guided
```

The internal model can still use work items, sessions, gates, and handoffs. The
beginner profile should translate those concepts into plain language.

## Core User Stories

1. As a maintainer, I can initialize a project with opinionated docs, maps,
   gates, and agent instructions.
2. As a maintainer, I can see which work items are active, blocked, reviewed,
   or ready to merge.
3. As a maintainer, I can attach terminal/agent sessions to a work item and
   recover what happened later.
4. As a maintainer, I can see changed files, checks run, checks skipped, and
   review comments in one timeline.
5. As a maintainer, I can generate a next-session prompt that includes the
   right context and avoids stale claims.
6. As a maintainer, I can view maps from project docs to owning code paths and
   verification commands.
7. As a maintainer, I can start large projects with a full workflow scaffold,
   not just a README.
8. As a beginner, I can ask what an unfamiliar development or UI term means in
   the context of my project.
9. As a beginner, I can turn vague intent into a better prompt without learning
   all implementation vocabulary upfront.
10. As a maintainer, I can capture repeated agent mistakes such as shell
    mismatch, Windows path handling, encoding issues, unsafe commands, and
    missing setup steps, then feed those lessons into future sessions.

## Product Shape

The product has five surfaces, ordered by MVP priority:

- Agent plugins: Codex and Claude Code hooks/skills that restore context inside
  the agent the maintainer already uses.
- MCP server: agent-neutral tools that Codex, Claude Code, Gemini, and other
  MCP-capable hosts can call.
- CLI: fallback and debug commands from PowerShell, WSL, or any terminal.
- Agent integrations: Claude Code plugin/slash commands, Codex MCP config,
  Gemini MCP config, and future host-specific adapters.
- Generated artifacts: optional HTML/text views for dense reviews, split
  boards, timelines, or handoffs.
- Repo scaffold: templates and health checks committed into each project.

The plugin experience is the front door. The strongest daily workflow should
happen inside the coding agents the user already uses. The CLI is the durable
local debugging surface, not the thing the maintainer should have to remember.

Superpowers, Claude Code plugins, Codex skills, and future agent hosts should
call the same local contracts instead of forking their own state model. Local
CLI, state files, and MCP tools are the durable shared machinery.

Workflow systems such as Superpowers are profiles, not dependencies. Devflow
should work well beside them while still supporting plain Codex, Claude Code,
Gemini, Hermes, generic shell sessions, and future hosts.

Repeated-mistake memory should be layered:

- product examples use general categories such as shell mismatch, file I/O
  friction, transport mismatch, and framework version drift
- project memory records repo-specific corrections
- private user memory can record maintainer-specific habits, paths, and
  historical failures

## Supported Agents

The product should treat coding tools as adapters, not as the product center.
First-class targets:

- Claude Code
- OpenAI Codex
- Gemini CLI
- GitHub Copilot CLI
- OpenCode
- Goose
- Aider
- Cursor agent workflows
- generic shell/manual sessions

The model should also leave room for OpenHands, Devin-style hosted agents, and
future tools that can export session history, git changes, or PR metadata.

## Supported Platforms

The product must not assume a Unix-only workflow.

- Windows PowerShell 7: first-class maintainer environment.
- WSL/Linux: first-class for tmux-based orchestration and Linux-native tools.
- macOS: first-class for common AI coding workflows.

Platform-specific behavior should live in adapters and templates, not in the
core project model.

## Big Product Vision

The complete product should support the full solo development lifecycle:

```text
Idea
  -> project contract
  -> plan/spec
  -> work item
  -> agent/manual sessions
  -> code changes
  -> gate runs
  -> PR/review
  -> review resolution
  -> merge/release
  -> next-session handoff
  -> searchable project memory
```

## Opinionated Defaults

- One primary implementation session and one optional review/audit session.
- Worktree isolation for risky or parallel implementation.
- PR review for cross-boundary, security, database, worker, CI, or public
  behavior changes.
- Direct commit allowed for small docs, private notes, and mechanical cleanup.
- Every completed task should produce a next-session prompt.
- Failed checks should be recorded as evidence, not hidden.
- AI API access is optional. Core status, split, finish, gates, and handoff
  recording must work from local files, git, docs, and agent history. AI assist
  features such as term explanation, prompt rewriting, and session summarization
  can use configured providers later.
- HTML is not source of truth. Structured `.devflow` state and compact
  summaries feed agents by default; HTML artifacts are generated on demand for
  human inspection.

## Competitive Position

Solo Devflow OS should not compete primarily as a multi-agent IDE or autonomous
ticket-to-PR runner. That space already has tools focused on launching,
streaming, and supervising agents.

The intended position is lower and more durable:

```text
Agent IDEs and orchestrators run agents.
Solo Devflow OS records the project truth those agents share.
```

The product should own:

- project contracts
- shared work state
- gate evidence
- session and handoff records
- next-session prompts
- environment and repeated-mistake memory
- beginner-friendly term and prompt translation
- optional generated artifacts for dense review, split, timeline, and handoff
  views
- adapter-neutral integration points

This allows Solo Devflow OS to integrate with Codex, Claude Code, Gemini,
Hermes, Orca, Lanes, RCFlow, and future tools instead of trying to replace them.

## Research Position

The same local state can support a focused research harness. The research
question is not whether a general agent memory system is useful. It is whether
structured same-task handoff plus deterministic gate evidence improves
multi-session coding-agent continuation.

Research surfaces should stay separate from the product core:

- `packages/core` owns the product contracts for work items, events, gates, and
  handoffs.
- `docs/research/` owns research questions, baselines, metrics, and rubrics.
- `experiments/` owns condition templates, fixtures, run records, and later
  scoring scripts.

The source of truth remains structured `.devflow` state and append-only event
logs. HTML artifacts are optional views for humans, not evidence records.
