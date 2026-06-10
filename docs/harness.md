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

Codex's official plugin path is marketplace-based. Devflow therefore keeps a
repo marketplace at `.agents/plugins/marketplace.json` that points at
`plugins/devflow`, so a user can run:

```powershell
codex plugin marketplace add Sungblab/devflow-native
codex plugin add devflow@devflow-native-local
```

Codex's official MCP path is separate from plugin installation. Users can also
register a tool-only fallback with:

```powershell
codex mcp add devflow -- npx --yes devflow-native@latest mcp stdio
```

That fallback exposes MCP tools but not plugin skills or lifecycle hooks.

The Codex plugin should provide daily workflow skills for status, split, next,
finish, sessions, prompt rewrite, and explanation. Lifecycle hooks should feed
Devflow cheap continuity signals at session start, user prompt submit, pre-tool
command checks, post-tool result checks, and stop.
When a maintainer submits a vague natural-language request, `UserPromptSubmit`
should add compact `devflow prompt rewrite` context instead of trying to replace
the user's prompt.
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
hooks/claude-hooks.json
bundled .mcp.json
project .claude/ files when appropriate
AGENTS.md and CLAUDE.md compatibility
```

Claude Code's official plugin path is also marketplace-based. Devflow's Claude
plugin manifest lives at `plugins/devflow/.claude-plugin/plugin.json`, so a
user can run:

```powershell
claude plugin marketplace add Sungblab/devflow-native
claude plugin install devflow@devflow-native-local
```

Claude Code also supports direct MCP registration as a fallback:

```powershell
claude mcp add devflow -- npx --yes devflow-native@latest mcp stdio
```

That fallback exposes MCP tools but not the full plugin command, skill, or hook
surface.

Claude Code hooks should capture the same continuity moments as Codex where
possible: session start, user prompt submit, slash-command prompt expansion,
pre-tool command checks, post-tool checks, post-tool failure repair context, and
stop. Slash-command or skill UX should call Devflow CLI or MCP tools over the
shared core.
Claude also receives flat `commands/` Markdown shortcuts for explicit slash
command workflows such as start, status, doctor, harness, work, gates, review,
finish, next, explain, rewrite, sessions, and split. These commands are a
convenience layer over
the same skills, CLI, and MCP contracts, not a separate state model.

Claude authentication remains owned by Claude Code.

## Hook Portability

The repo-local plugin currently uses hook commands under `plugins/devflow`.
Hook wrappers should tolerate host-specific plugin environment variable names.
Codex plugin docs expose `PLUGIN_ROOT` and `PLUGIN_DATA` and also set
`CLAUDE_PLUGIN_ROOT` and `CLAUDE_PLUGIN_DATA` for compatibility. Claude Code
uses `CLAUDE_PLUGIN_ROOT` and `CLAUDE_PLUGIN_DATA`. Devflow hook commands use
the Claude-compatible names so the same scripts work across both hosts:

```text
CLAUDE_PLUGIN_ROOT
CLAUDE_PLUGIN_DATA
```

`hooks/hooks.json` is the Codex-compatible hook file. `hooks/claude-hooks.json`
adds Claude-only lifecycle coverage such as `PostToolUseFailure` without
requiring Codex to parse unsupported events.

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
devflow harness smoke
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
Generated plugin files under `plugins/devflow/` are local harness files by
default and should be added to `.gitignore` unless the maintainer explicitly
passes `--repo-visible` to make the repository publicly adopt those plugin
files as part of its development workflow.

`devflow harness health` should verify that the installed harness can run:
plugin manifests are present, hook commands resolve, MCP launchers start, gates
are valid, required review is enabled, and the finish/review/next-prompt loop
is reachable. When a failed check is repairable, health should surface the
repair command directly in JSON as `nextAction.command` and in text output as a
next action.

`devflow harness smoke` is the non-interactive native host packaging smoke
test. It checks local Codex and Claude CLI availability, validates the Claude
plugin with `claude plugin validate`, reads plugin manifests and hook JSON,
verifies expected skills and Claude command shortcuts, and runs
`devflow harness health`. It also creates a temporary `CODEX_HOME`, adds this
repository as the local `devflow-native-local` marketplace, installs
`devflow@devflow-native-local`, and verifies that Codex reports it as
installed and enabled. It accepts `--skip-host` for CI or MCP contexts that
should validate packaging without requiring Codex or Claude to be installed;
that skips the temporary Codex marketplace install smoke too.
It accepts `--session-smoke` to launch a minimal Claude Code `--plugin-dir` session
with hook events enabled and parse whether Devflow loaded as a real plugin with
slash commands, skills, MCP, `SessionStart`, and `UserPromptSubmit` hook
context. A later model-auth failure is reported separately as a skipped model
response when the plugin init evidence is already present.
It is intentionally non-interactive; final slash command visibility still needs
a real Codex or Claude session.

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

## Plugin Ecosystem Patterns

Devflow should learn from well-known plugin shapes without copying their center
of gravity:

- Methodology plugins such as Superpowers mostly distribute skills and workflow
  rules. They improve agent behavior but do not own repo-local finish evidence.
- Platform plugins such as Cloudflare bundle skills with MCP servers so an
  agent can call authenticated platform tools. They are strongest when the
  product is an external service surface.
- Work-app plugins such as data, creative, design, and sales plugins combine
  skills, optional MCP servers, and optional app/artifact views. They are
  strongest when the user needs a domain-specific deliverable.
- Hook/rule plugins such as Hookify turn repeated unwanted behavior into
  pre-tool, post-tool, prompt, or stop hooks. Devflow should adopt this pattern
  for repeated-mistake memory, but the rule should be tied back to repo-local
  evidence and finish gates rather than becoming a generic hook manager.
- Review plugins and PR toolkits often use commands plus specialized agents.
  Devflow can route review workflows through host-specific agents later, but
  review completion remains a local evidence record.
- Claude Code ecosystem plugins can additionally ship agents, hooks, LSP
  servers, and monitors. These are useful references for native lifecycle
  control, but Devflow should keep the shared state model host-neutral.

The detailed comparison is in
[`architecture/plugin-native-comparison.md`](./architecture/plugin-native-comparison.md).

Devflow's plugin-native value is narrower: lifecycle hooks and skills should
force the same repo-local contracts the CLI and MCP server expose. Use hooks
for lifecycle authority such as session start, prompt intent, prompt expansion,
tool command preflight, tool result mistake detection, and finish blocking. Use
MCP for structured state access. Use skills for human-facing workflow entry
points. Use Claude `commands/` only as explicit slash-command shortcuts over
the same workflows.

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
silently returning `{}` on ordinary session stops. In Codex, completion guards
are reported through `hookSpecificOutput.additionalContext` so Stop output stays
compatible with Codex's Stop hook JSON parser. Codex `UserPromptSubmit` hook
output should also stay to the documented `hookSpecificOutput.hookEventName`
and `hookSpecificOutput.additionalContext` shape; prompt titles or other
host-specific metadata can make Codex reject the prompt hook as invalid JSON
output.

Tool lifecycle hooks are intentionally narrower than full automation. The
pre-tool hook blocks high-confidence shell mismatch commands, such as Bash
heredoc redirection in Windows PowerShell or unparenthesized PowerShell range
arguments. The post-tool hooks call `devflow mistakes detect --record` for known
failure signatures so future session-start context can carry the correction.

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
