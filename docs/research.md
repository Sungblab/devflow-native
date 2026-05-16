# Research Notes

## Existing Categories

### Agent IDEs And Worktree Managers

- Orca: an agent development environment for running Claude Code, Codex,
  OpenCode, and similar agents side by side in isolated git worktrees. Strong
  on terminals, diffs, worktree isolation, and real-time agent status.
- Lanes: VS Code, JetBrains, and CLI workflow for multiple isolated AI coding
  sessions. Strong on session forms, worktree setup, resume, diff review, and
  IDE integration.
- Hive and similar worktree sidebars: focus on switching between active agents
  and branches with less terminal juggling.

These tools are closest when Solo Devflow OS is described as an agent control
surface. Solo Devflow OS should avoid competing mainly as another IDE. It
should provide the project truth, gate, handoff, and prompt layer that these
surfaces can consume.

### Agent Orchestration Platforms

- RCFlow: open-source orchestration for Claude Code, Codex, and OpenCode with
  real-time streaming, session persistence, cross-platform clients, telemetry,
  and multi-worker control.
- Optio: ticket-to-merged-PR orchestration with reusable workflows, external
  connections, Kubernetes pod-per-repo isolation, worktrees, and dashboard
  visibility.
- Itervox: issue/profile/machine orchestration with pause/resume, retry,
  tracker integration, worktree cleanup, and PR visibility.
- Fusion, AgentPipe, Bernstein, Shard, and similar tools: parallel coding-agent
  execution with worktree isolation, prompts, DAGs, or workflow runners.

These tools optimize launching and supervising agents. Solo Devflow OS should
integrate with them when useful, but its durable center is continuity evidence:
what changed, what was verified, what is blocked, what should the next session
read, and which prompt should continue the work.

### Session Observability

- AgentPulse: live dashboard for Claude Code and Codex sessions, with prompts,
  responses, progress, notes, session history, templates, launch/control, and
  optional orchestration.
- Entropic: desktop GUI for Claude Code, Codex, and Gemini session history,
  TODO tracking, git status, and commit activity.
- Polpo: phone-oriented dashboard and session browser for Claude Code, Codex,
  Gemini, OpenCode, Pi, and Goose.
- clideck: browser control surface for multiple AI CLI agents with status,
  prompt library, session resume, plugins, and autopilot.

### Agent Orchestration

- awslabs/cli-agent-orchestrator: tmux-based supervisor-worker orchestration
  for multiple CLI coding agents.
- stellarlinkco/myclaude: workflow modules and skills for Claude/Codex/Gemini
  style multi-agent development.
- kingbootoshi/codex-orchestrator: Claude orchestrates Codex agents in tmux
  sessions, with codebase map injection.

### PR Review And Quality Gates

- vercel-labs/openreview: self-hosted PR review bot that runs in a sandbox,
  reviews diffs, runs tooling, comments inline, and can push simple fixes.
- codedog-ai/codedog: PR summary and LLM review assistant.
- GitHub Action review bots: many variants for automated PR comments and
  quality scoring.

### Harness And Skills

- dirien/yet-another-agent-harness: hook runtime, MCP server, session tracking,
  middleware chains, lint/security tools, and multi-agent config generation.
- Mathews-Tom/armory: curated skills, agents, hooks, rules, commands, utilities,
  and presets for serious AI-assisted development.

## Gap

Most tools optimize one of these:

- run coding agents side by side
- create worktrees and terminals
- stream agent output
- drive tickets to PRs
- watch sessions
- run multiple agents
- review PRs
- package skills/hooks

The missing center is project continuity:

- durable project contract
- docs/code/test map
- work item lifecycle
- gate evidence
- review resolution state
- next-session prompt generation
- beginner-friendly term and prompt translation
- local-first memory of why work is done

Solo Devflow OS should integrate ideas from these tools without starting as a
clone of any one of them.

## Differentiation

The product should answer:

```text
Can I safely continue this project tomorrow?
Can a new agent session pick up without hallucinating status?
Can I tell what was verified and what was only claimed?
Can I see how docs, code, tests, PR review, and next work connect?
Can my agent host call the same project state through MCP or a plugin?
Can a beginner understand what the agent just said and what to verify next?
```

## Positioning Rule

Do not position Solo Devflow OS as:

```text
another coding agent
another multi-agent IDE
another ticket-to-PR autopilot
another hosted orchestration dashboard
```

Position it as:

```text
a local-first project truth layer for AI-assisted development
```

Agent IDEs and orchestrators run agents. Solo Devflow OS records the shared
state those agents need: contracts, sessions, gates, handoffs, terms, prompts,
risks, and next work.
