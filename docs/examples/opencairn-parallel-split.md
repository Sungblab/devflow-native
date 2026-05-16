# OpenCairn Parallel Split Example

This example shows the kind of output `devflow split` should generate for a
large repository.

## Input

```powershell
devflow split --sessions 4 --goal "next OpenCairn development slices" --profile standard
```

## Output Summary

```text
Parallel run: 2026-05-15-opencairn-next
Profile: standard
Platform: powershell
Base: origin/main

Session 1: worker-static-quality
Session 2: hocuspocus-smoke-stability
Session 3: e2e-gate-seed-hardening
Session 4: docs-health-registry-audit
```

## JSON Shape

```json
{
  "schemaVersion": "0.1",
  "command": "split",
  "runId": "2026-05-15-opencairn-next",
  "goal": "next OpenCairn development slices",
  "profile": {
    "name": "standard",
    "requiredRuntime": false
  },
  "platform": {
    "name": "powershell",
    "shell": "pwsh"
  },
  "sessions": [
    {
      "id": "worker-static-quality",
      "role": "implementation",
      "agent": { "preferred": "Codex", "fallback": "generic-shell" },
      "branch": "codex/worker-static-quality",
      "worktreePath": ".worktrees/worker-static-quality",
      "ownedPaths": ["apps/worker/**"],
      "avoidPaths": ["apps/web/**", "apps/api/**", "packages/db/**"],
      "verification": [
        { "cwd": "apps/worker", "command": "uv run ruff check ." },
        { "cwd": "apps/worker", "command": "uv run check-import-boundaries" }
      ]
    },
    {
      "id": "hocuspocus-smoke-stability",
      "role": "implementation",
      "agent": { "preferred": "Codex", "fallback": "generic-shell" },
      "branch": "codex/hocuspocus-smoke-stability",
      "worktreePath": ".worktrees/hocuspocus-smoke-stability",
      "ownedPaths": ["apps/hocuspocus/**", "packages/shared/**"],
      "avoidPaths": ["apps/worker/**", "apps/web/e2e/**", "packages/db/migrations/**"],
      "verification": [
        { "cwd": ".", "command": "pnpm --filter @opencairn/hocuspocus test" }
      ]
    },
    {
      "id": "e2e-gate-seed-hardening",
      "role": "implementation",
      "agent": { "preferred": "Claude Code", "fallback": "Codex" },
      "branch": "codex/e2e-gate-seed-hardening",
      "worktreePath": ".worktrees/e2e-gate-seed-hardening",
      "ownedPaths": ["apps/web/e2e/**", "apps/web/tests/**", "apps/api/src/internal/**"],
      "avoidPaths": ["apps/worker/**", "apps/hocuspocus/**"],
      "verification": [
        {
          "cwd": ".",
          "command": "pnpm --dir apps/web exec playwright test --workers=1"
        }
      ]
    },
    {
      "id": "docs-health-registry-audit",
      "role": "audit",
      "agent": { "preferred": "Gemini CLI", "fallback": "generic-shell" },
      "branch": "codex/docs-health-registry-audit",
      "worktreePath": ".worktrees/docs-health-registry-audit",
      "ownedPaths": ["docs/**", "scripts/project-health.*", "AGENTS.md"],
      "avoidPaths": ["apps/**", "packages/db/**"],
      "verification": [
        { "cwd": ".", "command": "pnpm docs:check" },
        { "cwd": ".", "command": "pnpm project-health" }
      ]
    }
  ],
  "mergeOrder": [
    "docs-health-registry-audit",
    "worker-static-quality",
    "hocuspocus-smoke-stability",
    "e2e-gate-seed-hardening"
  ],
  "collisionRisks": [
    {
      "paths": ["packages/db/**", "apps/api/src/internal/**"],
      "reason": "Schema or test seed changes can alter assumptions for E2E and runtime sessions."
    }
  ]
}
```

## PowerShell Worktree Commands

```powershell
git fetch origin
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

git worktree add '.worktrees/worker-static-quality' -b 'codex/worker-static-quality' 'origin/main'
git worktree add '.worktrees/hocuspocus-smoke-stability' -b 'codex/hocuspocus-smoke-stability' 'origin/main'
git worktree add '.worktrees/e2e-gate-seed-hardening' -b 'codex/e2e-gate-seed-hardening' 'origin/main'
git worktree add '.worktrees/docs-health-registry-audit' -b 'codex/docs-health-registry-audit' 'origin/main'
```

## POSIX Worktree Commands

```sh
git fetch origin &&
git worktree add .worktrees/worker-static-quality -b codex/worker-static-quality origin/main &&
git worktree add .worktrees/hocuspocus-smoke-stability -b codex/hocuspocus-smoke-stability origin/main &&
git worktree add .worktrees/e2e-gate-seed-hardening -b codex/e2e-gate-seed-hardening origin/main &&
git worktree add .worktrees/docs-health-registry-audit -b codex/docs-health-registry-audit origin/main
```

## Session 1 Prompt

```text
You are working in OpenCairn. Own only worker static-quality cleanup.

Read first:
- AGENTS.md
- docs/README.md
- docs/testing/strategy.md
- docs/architecture/maps/testing-map.md

Owned paths:
- apps/worker/**

Avoid:
- apps/web/**
- apps/api/**
- packages/db/**
- docs/** unless worker gate documentation must change

Goal:
Reduce or close worker ruff failures without mixing pyright refactors unless
they are directly required by the lint fix.

Verify:
- cd apps/worker
- uv run ruff check .
- uv run check-import-boundaries
- targeted pytest for touched behavior

Finish with:
- changed files
- remaining lint count
- tests run
- risks
- next-session prompt
```

## Session 2 Prompt

```text
You are working in OpenCairn. Own Hocuspocus websocket smoke stability.

Read first:
- AGENTS.md
- docs/README.md
- docs/architecture/maps/system-map.md
- docs/testing/strategy.md

Owned paths:
- apps/hocuspocus/**
- packages/shared/** only when the Hocuspocus contract requires it

Avoid:
- apps/worker/**
- apps/web/e2e/**
- packages/db/migrations/**

Goal:
Stabilize the smallest reproducible Hocuspocus websocket smoke failure. Do not
broaden into collaboration UI work unless the smoke failure proves that the
client contract is wrong.

Verify:
- pnpm --filter @opencairn/hocuspocus test
- targeted smoke command documented by the repo, if present

Finish with:
- changed files
- exact smoke failure before and after
- tests run
- risks
- next-session prompt
```

## Session 3 Prompt

```text
You are working in OpenCairn. Own the smallest E2E gate promotion slice.

Read first:
- AGENTS.md
- docs/README.md
- docs/testing/strategy.md
- docs/architecture/maps/testing-map.md

Owned paths:
- apps/web/e2e/**
- apps/web/tests/**
- apps/api/src/internal/** only for test seed endpoints or fixtures

Avoid:
- apps/worker/**
- apps/hocuspocus/**
- packages/db/migrations/** unless the current schema already requires fixture
  updates

Goal:
Make the deterministic seed and smoke coverage reliable before adding broad
browser coverage. Prefer one executable full-stack smoke over many skipped
tests.

Verify:
- pnpm --dir apps/web exec playwright test --workers=1
- any focused API seed test that exists for the touched path

Finish with:
- changed files
- seed assumptions
- tests run
- skipped checks and why
- next-session prompt
```

## Session 4 Prompt

```text
You are working in OpenCairn. Own documentation, feature registry, maps, and
project-health alignment.

Read first:
- AGENTS.md
- docs/README.md
- docs/contributing/plans-status.md
- docs/architecture/maps/README.md

Owned paths:
- docs/**
- scripts/project-health.*
- AGENTS.md only if agent instructions are stale

Avoid:
- apps/**
- packages/db/**
- package manager lockfiles unless a docs check requires a metadata update

Goal:
Find doc/status claims that no longer match code or health checks. Update the
smallest public docs/map surface needed to make the next implementation session
start from accurate context.

Verify:
- pnpm docs:check
- pnpm project-health

Finish with:
- changed files
- claim-vs-code corrections
- checks run
- risks
- next-session prompt
```

## Review And Merge Order

1. Merge `docs-health-registry-audit` first when it only changes docs and
   health metadata.
2. Rebase implementation worktrees after docs changes land.
3. Review `worker-static-quality` before E2E changes if worker fixtures affect
   test data.
4. Review `hocuspocus-smoke-stability` independently unless shared contracts
   changed.
5. Merge `e2e-gate-seed-hardening` last because it is most likely to depend on
   stabilized runtime and fixture assumptions.
