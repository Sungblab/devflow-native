---
name: devflow-split
description: Use when splitting a development goal into safe parallel AI coding sessions with non-overlapping ownership, worktree or branch names, verification gates, and copy-paste prompts.
---

# Devflow Split

Use this skill when the maintainer wants parallel sessions without repeated
manual prompt writing.

## Required Inputs

- project goal
- desired session count
- repository path
- workflow profile: `plain`, `standard`, `superpowers`, `gstack`,
  `openharness`, or `hermes`
- agent targets when relevant: Codex, Claude Code, Gemini CLI, Copilot CLI,
  OpenCode, Goose, Aider, or generic shell
- platform target when commands are generated: Windows PowerShell, Linux/WSL, or
  macOS

If session count is absent, default to 2 for risky work and 3 for broad audits.

## Split Rules

1. Inspect git status and active worktrees.
2. Read project docs and current handoffs.
3. Find tasks with disjoint owned paths.
4. Prefer one implementation session and one review/audit session before adding
   more sessions.
5. Assign each session:
   - branch/worktree name
   - owned paths
   - paths to avoid
   - read order
   - exact goal
   - recommended agent type, if one fits the task
   - platform-specific setup commands
   - verification commands
   - completion format
6. Do not split work if path ownership is unclear.

## Output

Generate:

- parallel run summary
- worktree creation commands
- one prompt per session
- collision risks
- merge/review order

When generating commands, prefer the user's platform. For Windows, emit
PowerShell-safe commands and avoid assuming `tmux`; for WSL/Linux/macOS, POSIX
commands may be offered as alternatives.

The prompts must be self-contained enough that a new agent session can start
without asking the maintainer to explain the project again.
