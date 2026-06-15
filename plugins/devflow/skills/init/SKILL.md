---
name: init
description: Initialize or bootstrap a repository with Devflow Native presets by calling devflow init and interpreting the result.
---

# Devflow Init

Use this skill when a maintainer wants to set up Devflow Native in a new or
existing repository, especially when they mention init, bootstrap, preset,
review policy, CI, or native Codex/Claude harness files.

This skill is a thin wrapper over the Devflow CLI. The CLI owns policy,
file generation, review config, gate inference, CI workflow output, and native
harness file installation. The skill chooses a preset, calls `devflow init`,
and explains the result.

## Preset Choice

- Use `solo-product` for product repositories where feature changes should
  normally use PR review, `review.required` should be enabled, CI should run,
  and `AGENTS.md` should record direct-main exceptions.
- Use `research` for paper, experiment, benchmark, or evaluation repos where
  evidence logs, fixtures, reproducibility, and bench gates matter most.
- Use `content-site` for docs, blog, or marketing-content repos where small
  writing edits can go direct main but build, lint, link, design, SEO, route,
  or feature changes still need gates and review.

## Steps

1. Run `devflow doctor --json` and apply the local execution contract.
2. Inspect package scripts and existing instructions with `devflow status --json`
   plus targeted file reads when needed.
3. Pick the narrowest preset that matches the repo.
4. Render a dry run first, for example:

```powershell
devflow init --preset solo-product --targets codex,claude --ci github --review required --json
```

5. Explain planned writes, skipped files, inferred gates, CI choice, and whether
   `AGENTS.md` will be created or augmented.
6. Only run the confirmed write when the maintainer asked to proceed or the
   workflow is already confirmation-gated:

```powershell
devflow init --preset solo-product --targets codex,claude --ci github --review required --confirm --json
```

7. Verify with `devflow health --json`. If native agent files were installed,
   also run `devflow harness health --targets codex,claude --json`.

## Output

Report:

- chosen preset and why
- files written, updated, skipped, and ignored
- inferred gates and CI workflow
- review policy
- next command, such as health, harness health, or finish evidence recording
