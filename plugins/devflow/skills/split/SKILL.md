---
name: split
description: Plan safe parallel Devflow work sessions with owned paths, worktree commands, verification gates, and copy-paste prompts.
---

# Devflow Split

Use this when the maintainer asks to split work, parallelize sessions, prepare
handoff prompts, or continue autonomously with multiple safe work boundaries.

## Workflow

1. Run `devflow doctor --json` first when command-heavy work is expected.
2. Run `devflow split --json` from the repository root. Add `--goal "$ARGUMENTS"`
   when the maintainer provided a specific objective.
3. Read the returned sessions before acting. Each session must have owned paths,
   avoid paths, a branch or worktree command, verification commands, and a
   prompt.
4. Do not create parallel worktrees if owned paths overlap or collision risks
   are unresolved.
5. If `.devflow/config.json` defines `split.tasks`, treat those tasks as the
   project-specific default unless the maintainer gives a more specific split.

## Output

Summarize:

- recommended sessions and roles
- owned paths and paths to avoid
- worktree commands
- verification gates
- merge order
- copy-paste prompts for the next sessions

Keep Devflow as the continuity layer. Superpowers, Claude Code, Codex,
and Hermes are profiles or hosts, not required runtimes.
