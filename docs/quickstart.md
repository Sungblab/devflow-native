# Quickstart

This quickstart is for open-source users who want Codex or Claude Code to set
up Devflow Native for them.

Devflow is not a coding agent. It is a repo-local continuity layer around
Claude Code, Codex, shell sessions, and manual review.

## Requirements

- Git
- Node.js 20 or newer
- PowerShell on Windows, or a POSIX shell on macOS/Linux

No hosted service is required for the v0.1 foundation loop.

## Recommended: Ask Your Agent To Install It

Open Codex or Claude Code in the repository you want to equip, then paste:

```text
Install Devflow Native for this repository.

Use https://github.com/Sungblab/devflow-native as the source. Do not replace
existing project instructions. Inspect the current repo first, install only the
missing Devflow harness pieces, configure MCP/plugin/hook integration when the
host supports it, verify the result, and tell me exactly whether I need to
restart Codex or Claude Code.

Expected verification:
- Devflow CLI help works.
- Source install or npm link exposes a `devflow` command.
- Devflow doctor/status work for this repo.
- Devflow harness health is ok, or the remaining host limitation is explicit.
- Existing AGENTS.md, CLAUDE.md, README, tests, and project rules are preserved.
```

The intended user flow is:

```text
User asks Codex or Claude Code to install Devflow
  -> the agent inspects the target repo
  -> the agent installs the local Devflow harness
  -> the agent verifies CLI, MCP, plugin, hook, and review guard health
  -> the user restarts Codex or Claude Code if the host requires a reload
  -> future sessions receive compact Devflow context automatically
```

The commands below are mainly for the installing agent, debugging, or users who
prefer to inspect each step manually.

## Manual Install

Use the published npm package:

```powershell
npm install -g devflow-native
devflow --help
devflow --version
```

For local source development, use `npm link` from a clone of this repo:


```powershell
git clone https://github.com/Sungblab/devflow-native.git
cd devflow-native
npm link
devflow --help
devflow --version
npm run pack:check
npm run publish:check
```

`npm link` exposes the `devflow` command from the local checkout. `pack:check`
builds the npm tarball, installs it into a temporary consumer project, and
verifies that the packaged binary can render help and version output.
`publish:check` additionally runs tests, documentation link checks, and
`npm publish --dry-run` package contents guards.

## Manual Clone And Inspect

```powershell
git clone https://github.com/Sungblab/devflow-native.git
cd devflow-native
node packages/cli/src/index.js --help
node packages/cli/src/index.js doctor --platform windows-powershell --json
node packages/cli/src/index.js status --simple
```

On macOS or Linux, use:

```sh
node packages/cli/src/index.js doctor --platform linux --json
```

The `doctor` command shows local shell, path, and tool assumptions that an agent
session should respect. The `status --simple` command shows the current branch,
changed files, attached sessions, latest handoff, and recommended next check.

## Manual Setup In Another Repo

Use a disposable or existing local repo:

```powershell
node C:\path\to\devflow-native\packages\cli\src\index.js init --repo C:\path\to\your-repo --profile standard --platform windows-powershell --json
node C:\path\to\devflow-native\packages\cli\src\index.js init --repo C:\path\to\your-repo --profile standard --platform windows-powershell --confirm --json
node C:\path\to\devflow-native\packages\cli\src\index.js health --repo C:\path\to\your-repo --json
```

`init` is confirmation-gated. Without `--confirm`, it only prints the files it
would write. With `--confirm`, it writes the minimum `.devflow` project
contract and does not overwrite existing files.

## Record A Small Work Loop

```powershell
node packages/cli/src/index.js work create --id demo-loop --title "Try Devflow locally" --json
node packages/cli/src/index.js work start demo-loop --json
node packages/cli/src/index.js sessions note --work demo-loop --summary "Started the first local trial." --json
node packages/cli/src/index.js status --work demo-loop --simple
node packages/cli/src/index.js review request --work demo-loop
```

If the repo has configured gates in `.devflow/config.json`, run one gate and
attach the result to the work item:

```powershell
node packages/cli/src/index.js gates run docs-check --work demo-loop --json
```

When review is required, record review evidence before claiming the work is
done:

```powershell
node packages/cli/src/index.js review record --work demo-loop --reviewer "manual" --status passed --summary "No blocking findings." --json
node packages/cli/src/index.js finish --work demo-loop --guided
node packages/cli/src/index.js prompt latest
```

`finish` records completion evidence in `.devflow/state/events.jsonl` and writes
the latest handoff prompt projection to `.devflow/next-prompt.md`.
Use `finish --dry-run --json` when you want a read-only readiness check before
recording anything. `init --confirm` and `harness install --confirm` add runtime
state paths to `.gitignore`, and `harness install --confirm` also ignores
`plugins/devflow/` by default so generated agent harness files stay local.
Pass `--repo-visible` only when the target repository should publicly adopt
those plugin files.

## Install The Native Harness

The harness is the repo-local bridge for agent hosts.

```powershell
node packages/cli/src/index.js harness inspect --json
node packages/cli/src/index.js harness plan --json
node packages/cli/src/index.js harness install --confirm --json
node packages/cli/src/index.js harness health
```

The install command writes confirmed missing harness files for Codex and Claude
Code plugin drafts, MCP configuration, hooks, and review-aware finish guards.
It preserves existing project instructions instead of replacing rich local
docs.

## Current Limits

- The v0.1 foundation package is published to npm as `devflow-native`.
- Plugin installation still depends on the host tool's local plugin support.
- Devflow records and verifies workflow state; it does not run autonomous
  coding work by itself.
- Research notes and evaluation fixtures live in a separate private repository.
