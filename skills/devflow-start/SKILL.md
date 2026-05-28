---
name: devflow-start
description: Use when starting or resuming work in a Devflow Native managed project; reads project docs, git state, active work, gates, and handoff context before choosing the next slice.
---

# Devflow Start

Use this skill to restore project context before implementation or planning.

## Steps

1. Read the project's `AGENTS.md` if present.
2. Read `docs/README.md` or the configured docs router.
3. Perform prompt intent analysis: infer the maintainer's likely goal from the
   natural-language request, repo context, recent handoffs, and repeated
   mistakes. Do not treat examples as an exhaustive list.
4. Inspect git branch, dirty files, and existing worktrees.
5. Read active work items or latest handoffs if `.devflow/` exists.
6. Identify current gates and known active development tracks.
7. Run or inspect `devflow doctor` when available to load shell/platform rules,
   tool availability, and repeated-mistake memory.
8. Detect the user's shell/platform and available agent tools when relevant.
9. Check for tooling version drift before using framework-specific config,
   especially when the task depends on current package behavior.
10. Recommend one next slice unless the user explicitly asks for multiple.
11. Minimize maintainer questions. If the maintainer says to proceed
    autonomously, choose and execute the next concrete action from repo state and
    risk level.

## Output

Return:

- current state
- prompt intent analysis and any missing requirements you inferred
- likely next slice
- relevant files
- verification commands
- platform assumptions
- repeated local mistakes that should change command behavior
- available/assumed agent tools
- risks or blockers

Avoid asking the maintainer to restate context that can be read locally.
