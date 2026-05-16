# `@devflow/core`

`packages/core` owns the agent-neutral project model and local state logic. It
must not depend on CLI argument parsing, dashboard rendering, or provider-
specific session formats.

## Initial File Boundary

```text
packages/core/
  src/
    index.ts
    model/
      project.ts
      work-item.ts
      session.ts
      gate.ts
      handoff.ts
      event.ts
    contracts/
      status.ts
      split.ts
      finish.ts
      command.ts
    store/
      sqlite-store.ts
      event-store.ts
    scanners/
      git-status.ts
      docs-map.ts
      gates.ts
    planners/
      split-planner.ts
      finish-planner.ts
      next-prompt.ts
    redaction/
      secrets.ts
  test/
    contracts/
    planners/
```

## Responsibilities

- Define JSON-serializable contracts for `status`, `split`, `finish`, and
  `doctor`.
- Normalize paths to repo-relative POSIX-style paths internally while preserving
  platform metadata for command generation.
- Store append-only events and rebuild derived status views from those events.
- Recommend gates and next prompts from project contracts, changed files, and
  session evidence.
- Render local execution contracts and repeated-mistake memory into agent-safe
  recommendations.

## Non-Responsibilities

- Do not parse agent-specific history files directly. Use `packages/adapters`.
- Do not emit shell-specific command strings directly. Use command descriptors
  that platform adapters render.
- Do not import dashboard code.
- Do not assume Superpowers, gstack, OpenHarness, Hermes, Codex, Claude, or
  Gemini are mandatory.
