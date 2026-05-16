---
name: start
description: Use when starting or resuming work in a Solo Devflow OS project from Codex; loads local execution rules, repeated-mistake memory, project state, and optional workflow-profile context before editing.
---

# Devflow Start

Use this skill before command-heavy work in a repository that has Solo Devflow
OS files or when the maintainer asks to continue a devflow-managed task.

## Steps

1. Read `AGENTS.md`, then `docs/README.md`.
2. Perform prompt intent analysis. The maintainer may write fast natural
   language rather than a complete prompt, so infer the broader request from
   repo context and do not treat examples as an exhaustive list.
3. Run `devflow doctor --json` when the command is available. If the executable
   is not installed yet, run `node packages/cli/src/index.js doctor --json`
   from this repository.
4. Apply the returned `executionContract` before running shell commands. On
   Windows PowerShell, prefer `Get-Content -LiteralPath`, quote literal paths,
   use `rg` for search, and avoid Bash-specific syntax unless the task
   explicitly targets WSL.
5. Read `devflow status --json` or `node packages/cli/src/index.js status --json`
   to restore changed files, gate evidence, and latest handoff context.
6. If a workflow methodology plugin such as Superpowers is also installed, keep
   using it for its own planning, TDD, review, or branch-completion flow.
   Devflow is the project-truth and continuity layer, not a replacement
   methodology and not dependent on any one profile.
7. Check for tooling version drift before using framework-specific config.
8. State the platform assumptions and repeated mistakes that will affect command
   behavior before implementation.
9. Pick the next crisp slice unless the maintainer explicitly asks for multiple
   parallel sessions.
10. Minimize maintainer questions. When the maintainer asks the agent to proceed
    autonomously, choose and execute the next concrete action from repo state,
    product intent, and risk level.

## Output

Return:

- current work and changed-file state
- prompt intent analysis and missing requirements inferred from context
- local execution rules from `devflow doctor`
- repeated mistakes that change command behavior
- relevant docs and skills to read next
- verification commands
- next slice recommendation

Never ignore `devflow doctor` recommendations when they conflict with generic
shell habits.
