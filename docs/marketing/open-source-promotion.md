# Open Source Promotion Plan

This document turns the current open-source promotion research into a practical
Devflow Native launch loop. The goal is not vanity stars. The goal is to find
solo maintainers who already use coding agents and need repo-local continuity,
verification records, and next-session handoffs.

## Positioning

Devflow Native should be introduced as:

```text
Devflow Native is a local-first workflow recorder for AI coding sessions.
It helps Codex, Claude Code, and shell sessions resume from verified repo state
instead of scattered chat history.
```

The first block of every public surface should answer three questions quickly:

- **What is it?** A local-first workflow continuity harness for AI coding
  agents.
- **Why use it?** It records work state, gates, review evidence, and handoff
  prompts so the next session does not restart from memory.
- **How is it different?** It is not another coding agent or dashboard; it is
  the repo-local truth layer below Codex, Claude Code, Superpowers, and future
  agent hosts.

Avoid vague claims such as "AI development OS" or "autonomous workflow
platform" in early promotion. Those phrases sound larger than the current
product and attract the wrong expectations.

## Public Proof To Show

Promotion should show concrete evidence, not generic promises.

- **One command loop:** `doctor -> status -> finish --dry-run -> prompt latest`.
- **One real dogfood story:** OpenCairn harness install, health, gate, and
  finish guard.
- **One failure mode:** a compact example where an agent says "done" but
  Devflow blocks the claim because review or gate evidence is missing.
- **One resumption fixture:** the public interrupted-task fixture showing how
  `.devflow/state/events.jsonl` and `.devflow/next-prompt.md` help the next
  session resume.
- **One adapter story:** Codex, Claude Code, OpenCode, and Cline session
  metadata normalize into the same attach-plan contract.

## README Pass

Before each larger promotion push, check the top of `README.md` against this
list:

- First paragraph says what the project does without metaphor.
- First screen names the target user: solo maintainers using AI coding agents.
- The value is visible before installation instructions.
- Differentiation is explicit: Devflow records workflow state; agent hosts run
  code.
- There is one copy-paste quick try path.
- There is at least one real verification or dogfood proof.

Do not bury the core value behind roadmap language. New visitors scan; they do
not read the full document linearly.

## Promotion Loop

Use a repeated loop instead of a single launch blast:

```text
ship small proof
  -> publish one focused post
  -> collect objections and failed installs
  -> improve docs or product
  -> publish the next proof
```

Suggested cadence:

- **Week 1:** README polish, first demo GIF/screenshot, `Show HN` draft,
  Korean/English short posts.
- **Week 2:** publish "Why AI coding agents need handoffs, not longer chats."
- **Week 3:** publish "A task is not done until the repo can prove it."
- **Week 4:** publish interrupted resumption fixture write-up and invite trial
  users.
- **After every feature slice:** share one new concrete behavior, not the same
  launch message.

## Channel Plan

### GitHub

- Make the README first screen strong before any external post.
- Add screenshots or terminal snippets for `status --simple`,
  `finish --guided`, and blocked review evidence.
- Keep issues small and contribution-friendly.
- Add labels for `good first issue`, `docs`, `adapter`, and `research-fixture`
  once contribution flow is ready.

### Hacker News

Use only when the repo has a crisp demo and a stable first-run path.

Possible title:

```text
Show HN: Devflow Native - local handoffs for AI coding agent sessions
```

Post angle:

- Start from a real failure: a new coding session cannot tell what was actually
  verified.
- Explain why Devflow is below the agent, not a new agent.
- Show the local files and commands.
- Be explicit that it is early and Windows/PowerShell is first-class.

### Reddit And Communities

Post only in communities where the problem is already discussed. Do not drop a
bare link.

Good angles:

- `r/ClaudeAI` or similar: "How do you resume long coding-agent tasks without
  trusting chat summaries?"
- `r/LocalLLaMA` or agent-tooling communities: local-first workflow state for
  agent hosts.
- `r/opensource`: ask for README and onboarding feedback, not stars.
- Korean developer communities and GeekNews: explain the exact maintainer pain
  and show the dogfood loop.

### Blog Posts

Write posts that teach the problem even if the reader does not install
Devflow.

Backlog:

1. "Long context is not workflow state."
2. "Why 'done' needs gate and review evidence in AI-assisted development."
3. "Local-first handoffs for Codex and Claude Code."
4. "Interrupted task resumption as an evaluation fixture."
5. "How I dogfood Devflow Native on a mature Windows/PowerShell monorepo."

### External PRs

Do not spam other repos with Devflow. Use PRs only where the target project has
a visible AI-agent workflow problem.

Acceptable PR types:

- Add an optional `AGENTS.md`/`CLAUDE.md` workflow section showing how to record
  gates and handoffs.
- Add a docs example for "agent-assisted maintenance workflow."
- Add a Devflow adoption note to a repo you already maintain or dogfood.

Every accepted use case becomes social proof in the README.

## Launch Assets

Prepare these before a larger push:

- 30-second terminal GIF: install, status, finish guard, latest prompt.
- One screenshot of blocked finish due to missing review.
- One short architecture diagram showing Devflow under agent hosts.
- One copy-paste `npx devflow-native@latest` quick try.
- One comparison table:
  - Codex/Claude Code: run agents.
  - Superpowers: teaches workflow habits.
  - CodeGraph: provides code context.
  - Devflow: records repo-local workflow truth.

## Metrics

Track adoption signals that imply product value:

- successful `harness health` runs
- `finish --dry-run` or `finish --guided` usage
- handoff prompts generated
- session attachments or notes recorded
- issue reports from real installation attempts
- repeat use in the same repo

Stars are a distribution signal, not the core product metric. Avoid fake-star
growth or shallow star campaigns; they damage trust and attract poor feedback.

## Maintainer Rules

- Reply to criticism with questions and concrete reproduction requests.
- Ask users to turn vague issue reports into PRs or fixtures when appropriate.
- Timebox public issue triage; do not let promotion create a maintenance trap.
- Prefer one useful answer or doc fix over a defensive debate.
- Treat competitors as evidence that the category matters, not as threats.

## Next Actions

1. Rewrite the first screen of `README.md` around the positioning block above.
2. Add a minimal terminal screenshot or GIF for the core loop.
3. Draft the first blog post: "Long context is not workflow state."
4. Prepare a `Show HN` draft but do not submit until quickstart has been tested
   from a clean external repo.
5. Ask 3-5 developers who already use Codex or Claude Code to try the harness
   and report where onboarding fails.
