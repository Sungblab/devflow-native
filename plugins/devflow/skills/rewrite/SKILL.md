---
name: rewrite
description: Rewrite a vague maintainer request into an agent-ready Devflow Native prompt using current project context.
---

# Devflow Rewrite

Use this when the maintainer gives a vague request such as "알아서 해",
"계속 구현해", "다음 거 진행해", or asks to turn rough intent into a prompt for
Codex, Claude Code, Hermes, or a shell session.

## Workflow

1. Preserve the maintainer's exact request. Do not reduce it to the examples
   they happened to mention.
2. Read current project context before rewriting: relevant docs, latest status,
   branch state, and known verification gates.
3. Run `devflow prompt rewrite --request "<request>" --context "<context>" --json`.
   If the executable is not installed, use
   `node packages/cli/src/index.js prompt rewrite`.
4. Treat the generated prompt as a draft contract. Add missing concrete context
   only when it is supported by local files or recent status.
5. Return the agent-ready prompt and call out assumptions that the next agent
   should verify.

## Output

Include:

- inferred intent
- key requirements
- missing details to resolve from local context
- agent-ready prompt
- verification commands the next agent should run

The rewrite should help an agent act autonomously without overfitting to one
literal sentence from the maintainer.
