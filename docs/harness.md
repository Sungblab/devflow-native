# Native Harness

Devflow Native is a local workflow continuity harness for solo developers using
AI coding agents. It should make the normal loop harder to skip:

```text
status -> work/session/gate -> review -> finish -> next prompt
```

The product center is not research, a hosted operating system, a code graph, or
another coding agent. The center is the repo-local state and native agent
surface that let the next Codex, Claude Code, or shell session continue without
reconstructing the whole conversation.

## Primary Targets

The first native targets are:

- Codex
- Claude Code
- generic shell/manual sessions

The next targets are:

- GitHub Copilot and VS Code instructions
- Cursor rules
- future MCP-capable agent hosts
- optional context providers such as CodeGraph-style tools

Codex and Claude Code should both call the same Devflow core through CLI and
MCP contracts. Plugin state, hook state, and MCP state must not fork into
separate project models.

## Codex Harness

Codex support should prefer native Codex plugin surfaces when available:

```text
.codex-plugin/plugin.json
skills/
hooks/hooks.json
bundled .mcp.json
repo-local .codex/config.toml when appropriate
AGENTS.md
```

The Codex plugin should provide daily workflow skills for status, split, next,
finish, sessions, prompt rewrite, and explanation. Lifecycle hooks should feed
Devflow cheap continuity signals at session start, user prompt submit, and stop.
Future hook slices can cover pre-tool or permission-request decisions.
On session start, the hook should include the latest persisted
`.devflow/next-prompt.md` projection when it exists so a resumed Codex session
sees the prior handoff without an extra manual lookup.

Codex authentication remains owned by Codex. Devflow must not read or reuse
Codex OAuth tokens or API keys.

## Claude Code Harness

Claude Code support should use the same shared plugin content through Claude's
native plugin surface:

```text
.claude-plugin/plugin.json
skills/
hooks/hooks.json
bundled .mcp.json
project .claude/ files when appropriate
AGENTS.md and CLAUDE.md compatibility
```

Claude Code hooks should capture the same continuity moments as Codex where
possible: session start, user prompt submit, and stop. Slash-command or skill
UX should call Devflow CLI or MCP tools over the shared core.

Claude authentication remains owned by Claude Code.

## Hook Portability

The repo-local plugin currently uses hook commands under `plugins/devflow`.
Hook wrappers should tolerate host-specific plugin environment variable names.
Codex plugin docs refer to names such as `PLUGIN_ROOT` and `PLUGIN_DATA`, while
Claude Code uses names such as `CLAUDE_PLUGIN_ROOT` and `CLAUDE_PLUGIN_DATA`.

Hook scripts should resolve both styles before failing:

```text
PLUGIN_ROOT or CLAUDE_PLUGIN_ROOT
PLUGIN_DATA or CLAUDE_PLUGIN_DATA
```

The hook command should stay thin. It should locate the repo, call the local
Devflow command or MCP contract, record compact evidence, and avoid expensive
full-session parsing unless the user asks for it.
Session-start hooks may read `.devflow/next-prompt.md` directly as the latest
human-readable handoff projection. The canonical history remains
`.devflow/state/events.jsonl`; the Markdown file is only the compact latest
prompt shown to the next agent. Repositories should treat this projection as
local generated state and ignore it by default unless a project explicitly wants
to publish the latest handoff.

## Harness Commands

The harness command group is the install and repair surface for existing repos.
It should adopt mature repositories instead of blindly scaffolding over them.

```text
devflow harness inspect --targets codex,claude,superpowers,codegraph
devflow harness plan --targets codex,claude
devflow harness install --targets codex,claude,git-hooks
devflow harness health
devflow harness repair
```

`devflow harness inspect` should detect:

- existing agent instructions such as `AGENTS.md`, `CLAUDE.md`,
  `GEMINI.md`, `.github/copilot-instructions.md`, `.cursor/rules`, and
  `.github/instructions/*.instructions.md`
- Codex plugin and repo-local Codex config readiness
- Claude Code plugin and project config readiness
- MCP config and launcher availability
- Devflow plugin hook files and hook path portability
- git hooks or finish guards
- Superpowers presence
- CodeGraph-style provider availability and freshness
- package scripts and configured Devflow gates
- `.devflow` state and config

`devflow harness plan` should be a dry run. It should propose missing files,
adoption changes, and repairs without writing.

`devflow harness install` should write only confirmed missing pieces. It should
avoid overwriting rich project instructions, and it should prefer appending a
small Devflow section or adding companion files over replacing mature docs. It
should also ensure `.devflow/config.json` has `review.required: true`, creating
a minimal config when missing and preserving existing gates when present.

`devflow harness health` should verify that the installed harness can run:
plugin manifests are present, hook commands resolve, MCP launchers start, gates
are valid, required review is enabled, and the finish/review/next-prompt loop
is reachable. When a failed check is repairable, health should surface the
repair command directly in JSON as `nextAction.command` and in text output as a
next action.

`devflow harness repair` should handle narrow confirmed fixes. The current
implemented repair scope is intentionally conservative: it restores broken
installed files that have canonical Devflow content, such as malformed plugin
manifests, malformed MCP config, hook scripts that fail `harness health`, or
missing `review.required` config that can be merged without dropping existing
gates. Project instructions and gate definitions are reported but not rewritten
automatically.

## Install UX

The public README should not lead with "run npm install" as the main user
experience. The preferred installation story is:

```text
Open Codex or Claude Code in the target repo.
Ask the agent to install the Devflow Native harness.
The agent runs harness inspect, explains the plan, installs after confirmation,
then runs harness health.
```

Package-manager commands can exist for maintainers and CI, but the product
front door should be agent-native harness setup.

## Superpowers

Superpowers is a workflow methodology provider and useful profile, not a core
dependency.

Devflow should interoperate with Superpowers by detecting whether it is present,
recording visible skill usage as evidence, and supporting a
`superpowers-assisted` profile. Relevant skills such as verification before
completion, requesting code review, receiving code review, and finishing a
development branch can count as workflow evidence when their use is visible in
the session or hook output.

The boundary:

```text
Superpowers teaches how to work.
Devflow records whether the work was reviewed, verified, handed off, and safe
to continue.
```

Devflow should stay useful when Superpowers is absent.

## CodeGraph

CodeGraph-style tools are optional context providers, not the product center.
They can help the first session in a repo quickly understand symbols,
relationships, and likely impact areas, but freshness is a real risk because
code changes require re-indexing or incremental updates.

Devflow should not make graph indexing part of the core finish path. Instead it
can detect a provider and report:

```text
available
stale
missing
```

Future commands such as `devflow context graph` may request graph-backed
context explicitly. Handoffs can record graph freshness so the next session
knows whether graph-derived context is current or only a hint.

## Review Gate

A core use case is preventing an agent-built task from ending without review.
The default finish path should support:

```text
implementation agent -> finish intent -> review gate -> fixes -> verification -> handoff
```

Review is evidence, not truth. Review findings must be evaluated technically,
accepted findings should be verified with focused tests or inspection, and weak
findings should be recorded as dismissed with a reason.

Repos can set `"review": { "required": true }` in `.devflow/config.json`.
When enabled, `devflow finish` requires a passing `review.completed` record for
the work item before `canClaimDone` becomes true. `devflow review request` and
MCP `devflow.review_request` generate the strict copy-paste prompt for that
separate reviewer; `devflow review record` and MCP `devflow.review_record`
capture the resulting evidence. The native finish skill and prompt hooks also
mention `devflow review request` and `devflow review record` so required review
is visible inside Codex or Claude Code before a session closes. The repo-local
Stop hook returns compact status plus the same review loop reminder instead of
silently returning `{}` on ordinary session stops, and it blocks completion
claims when `devflow status` still recommends a required review.

Reviewer profiles can help break self-review bias:

- skeptical maintainer
- security reviewer
- test reviewer
- product reviewer
- hostile reviewer

When the same agent reviews its own work, Devflow should encourage prompts that
frame the work as authored by another agent. The point is not to trick the
model; the point is to force a different review posture and require concrete
file, line, and verification evidence.

## Handoff

Handoff is the structured packet passed to the next session. It is more than a
chat summary.

It should include:

- objective
- current repo path, branch, dirty state, and relevant work item
- changed files and ownership boundaries
- gates run, gates skipped, and reasons
- review findings and resolution state
- known risks and assumptions
- next action
- do-not list
- copy-paste next-session prompt

The next prompt is a product surface. A task is not really closed until the next
agent can restart from the handoff without rereading the full conversation.

## MCP Token Budget

MCP tools should be compact by default. They should not dump full diffs or long
logs unless explicitly requested.

Defaults:

- JSON-first contracts with short human summaries
- `compact`, `normal`, `detailed`, and `json_only` verbosity modes
- filters such as `work`, `agent`, `since`, `limit`, and `verbosity`
- state versions and timestamps so hosts can avoid repeated reads
- progressive disclosure for diffs, logs, session text, and graph context

The goal is for MCP to expose continuity state without becoming a token sink.

## Near-Term Slice

The smallest useful next implementation slice is:

```text
devflow harness inspect --targets codex,claude,superpowers,codegraph
```

It should answer:

- Is Codex ready to use Devflow natively?
- Is Claude Code ready to use Devflow natively?
- Is the Devflow MCP server configured and launchable?
- Are lifecycle hooks installed and portable?
- Is Superpowers present, and can it be treated as evidence?
- Is CodeGraph-style context available, stale, or missing?
- Are finish/review/next-prompt guards reachable?
- What is the smallest safe install or repair plan?
