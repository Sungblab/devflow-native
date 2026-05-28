# Quickstart

This quickstart is for open-source users who want to try Devflow Native from
source before any packaged installer exists.

Devflow is not a coding agent. It is a repo-local continuity layer around
Claude Code, Codex, Gemini, shell sessions, and manual review.

## Requirements

- Git
- Node.js 20 or newer
- PowerShell on Windows, or a POSIX shell on macOS/Linux

No hosted service is required for the MVP loop.

## Clone And Inspect

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

## Try It In Another Repo

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

- The MVP is source-first; it is not published as an npm package yet.
- Plugin installation still depends on the host tool's local plugin support.
- Devflow records and verifies workflow state; it does not run autonomous
  coding work by itself.
- Research notes and evaluation fixtures live in a separate private repository.

