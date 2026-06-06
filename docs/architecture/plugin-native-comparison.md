# Native Plugin Comparison

Checked on 2026-06-06 against current Codex CLI, Claude Code, official docs,
and local clones of representative plugin repositories.

## What Native Means

For Devflow Native, "native" means the host can trigger Devflow at the point
where agent behavior is decided or recorded, not merely that the host can call
an MCP server later.

The native layers are:

| Layer | Codex | Claude Code | Devflow use |
| --- | --- | --- | --- |
| Project instructions | `AGENTS.md` | `CLAUDE.md`, project settings | Durable repo rules and product boundaries |
| Skills | `skills/` in a Codex plugin | `skills/` in a Claude plugin | Start, status, doctor, harness, work, gates, review, finish, next, rewrite, sessions, split |
| Commands | Codex slash commands and skill mentions | `commands/*.md` plugin shortcuts | Claude explicit `/devflow:*` workflow entry points |
| Hooks | `hooks/hooks.json` | `hooks/claude-hooks.json` | Prompt interpretation, pre-tool mistake blocking, post-tool mistake memory, finish/stop evidence |
| MCP | `.mcp.json` plugin config | `.mcp.json` plugin config | Shared structured tools over the same core contracts |
| Agents | Subagents are host-owned | Plugin `agents/` and optional `settings.json` agent activation | Adapter target only, not core product center |
| Monitors/LSP/settings | Not the first Devflow slice | Claude plugin can provide these | Future profile surface, not required for v0.1 |

MCP is useful for structured operations, but it is not enough by itself.
Devflow needs hooks and skills because the painful failures happen before or
during agent execution: vague intent, shell mismatch, false completion, missing
review, and lost handoff context.

## Representative Plugins

| Plugin or family | Main shape | Native strength | Devflow lesson |
| --- | --- | --- | --- |
| Superpowers | Skills, commands, one session-start hook, code-review agent | Strong methodology injection and reusable workflows | Keep Devflow compatible, but do not make methodology the core state model |
| Hookify | Hooks, commands, rules, analyzer agent | Converts repeated behavior problems into pre/post/stop hooks | Devflow mistake memory should generate repo-local evidence gates and hook rules |
| Claude PR Review Toolkit | Commands plus specialized agents | Uses agent specialization for review workflows | Devflow review can surface host agents later, but review evidence remains local state |
| OpenAI GitHub plugin | Codex manifest, skills, app connector | Connector-first workflow with CLI fallback | Devflow should not become a connector; it should record repo-local truth around connector work |
| OpenAI Cloudflare plugin | Skills plus MCP server | Platform operations through structured tools | Devflow MCP should expose workflow state, not platform credentials |
| OpenAI domain plugins | App connector plus optional skills | Domain-specific deliverables and authenticated data | Devflow should stay host/runtime independent and local-first |

## Additional Famous Plugin Patterns

The broader Claude and Codex plugin ecosystem is already large enough that
Devflow should not compete as a generic "better agent workflow" bundle. The
useful pattern is narrower: own the evidence boundary around agent work, then
interoperate with specialized plugins.

| Plugin or family | Observed shape | What it owns | Devflow implication |
| --- | --- | --- | --- |
| Claude feature-dev | Commands plus specialized agents | Exploration, architecture, and quality-review flow for feature implementation | Devflow should record the work item, evidence, gates, and handoff around this flow rather than duplicate the agents |
| Claude code-review and PR review toolkit | Commands plus review-oriented agents | Multi-agent review and confidence scoring | Devflow review evidence can accept these outputs, but final completion still requires local gate state |
| Claude frontend-design | Skills | UI/UX implementation guidance | Devflow should treat domain skills as optional execution helpers, not core product logic |
| Claude Context7 | MCP server | Version-specific documentation lookup | Good reference for keeping external docs out of prompts until needed; Devflow doctor can recommend doc lookup but should not become a docs MCP |
| Claude Playwright | MCP server | Browser automation and screenshots | Devflow should record browser smoke evidence and repeated failures, not own browser automation |
| Claude Serena | MCP/LSP-style semantic code analysis | Symbol-aware code navigation and refactoring context | Devflow maps can point at semantic tools, but should keep its own docs/code/test map as repo-local evidence |
| Claude mcp-server-dev and plugin-dev | Skills | Authoring MCP servers, hooks, and plugins | Good authoring references for Devflow's plugin packaging, not user-facing competition |
| Claude claude-code-setup and claude-md-management | Skills | Project setup, automation recommendations, and CLAUDE.md management | Devflow should cover repo-local operating contracts across hosts, not only Claude-specific memory files |
| OpenAI Codex Security | Skills, scripts, references | Security scan and investigation workflows | Devflow can require security evidence as a gate, but should not reimplement scanner logic |
| OpenAI CodeRabbit | Skills | AI code review on current changes | Devflow should ingest review completion evidence, not become a review model |
| OpenAI GitHub | Skills plus app connector | Issues, PRs, CI, and publishing flow | Devflow should sit beside connector work and record the repo-local truth of what changed and passed |

This pushes Devflow toward a smaller, stronger promise:

```text
specialized plugin performs work -> Devflow records evidence -> Devflow gates completion -> Devflow creates handoff
```

The ecosystem signal is clear: famous plugins win by being native to one
concrete pain. Devflow's concrete pain is not "do development." It is "prevent
agent work from being declared complete, resumed, or repeated without local
evidence."

## Superpowers Boundary

Superpowers teaches an agent how to work: brainstorm, plan, test, debug, review,
and finish a branch. Devflow records whether the work actually has evidence:
changed files, gates, review, handoff, next prompt, and repeated-mistake memory.

The integration target is:

```text
Superpowers skill usage -> visible workflow evidence
Devflow finish gate -> repo-local completion decision
```

Devflow should detect Superpowers and allow a `superpowers-assisted` profile,
but the product must still work when Superpowers is absent.

## Hookify Boundary

Hookify is the closest reference for the maintainer pain around repeated agent
mistakes. Its center is user-configurable hooks. Devflow should learn from that
shape, but keep a narrower product contract:

```text
observed mistake -> local mistake memory -> doctor context -> pre/post hook rule -> finish evidence
```

Examples should stay generic in public docs:

- shell mismatch
- transport mismatch
- file I/O friction
- framework version drift
- unsafe fallback patching

Private maintainer-specific examples belong in local memory, not public product
copy.

## Current Devflow Fit

The current repo-local plugin now covers the important native layers:

- Codex manifest: `.codex-plugin/plugin.json`
- Claude manifest: `.claude-plugin/plugin.json`
- shared skills: `plugins/devflow/skills/*`
- Claude command shortcuts: `plugins/devflow/commands/*.md`
- Codex hooks: `plugins/devflow/hooks/hooks.json`
- Claude hooks: `plugins/devflow/hooks/claude-hooks.json`
- MCP config: `plugins/devflow/.mcp.json`
- CLI fallback: `packages/cli`
- shared state/contracts: `packages/core`

The remaining native gaps are not more MCP servers. The next useful gaps are:

1. Host smoke tests that launch Codex and Claude with the local plugin and
   confirm visible skill/command/hook availability.
2. A rule-writing workflow that turns recorded repeated mistakes into a
   reviewed hook rule before enabling automatic blocking.
3. Optional Claude agents for review or silent-failure detection, while keeping
   Devflow's finish decision in repo-local evidence.
4. Marketplace packaging for Codex and Claude once the plugin surface is stable.

## Source Notes

- Codex official plugin docs describe manifests that point to skills, apps, MCP
  servers, and hooks, with install-surface metadata.
- Codex official hook docs support lifecycle hooks such as `PreToolUse` and
  `PostToolUse`, which is enough for command blocking and post-result mistake
  detection.
- Claude Code official plugin docs support skills, commands, agents, hooks, MCP
  servers, LSP servers, monitors, settings, and local development through
  `claude --plugin-dir`.
- Claude official and community marketplaces show a broad plugin ecosystem:
  AgentHub listed more than 300 Claude Code plugins on 2026-06-06, and a
  community awesome list reported more than 140 official-directory plugins. The
  exact counts can drift, so treat them as ecosystem-size signals rather than
  product requirements.
- Local Claude marketplace cache on 2026-06-06 included representative plugins
  such as `feature-dev`, `code-review`, `frontend-design`, `hookify`,
  `pr-review-toolkit`, `context7`, `playwright`, and `serena`.
- Local Codex marketplace output on 2026-06-06 showed OpenAI curated plugins
  including `github`, `coderabbit`, `codex-security`, `cloudflare`, `figma`,
  `notion`, `linear`, `vercel`, `supabase`, and many business-data connectors.
- Local CLI validation on 2026-06-06 passed for `plugins/devflow` with
  `claude plugin validate .\plugins\devflow`.
- `devflow harness smoke` and MCP `devflow.harness_smoke` cover
  non-interactive host packaging checks, including a temporary Codex local
  marketplace install for `devflow@devflow-native-local`.
  `devflow harness smoke --session-smoke`
  additionally launches Claude Code with `--plugin-dir` and parses stream
  events for Devflow plugin, slash-command, skill, MCP, and hook evidence. A
  real interactive Codex or Claude session is still useful for human-visible
  command UX.
