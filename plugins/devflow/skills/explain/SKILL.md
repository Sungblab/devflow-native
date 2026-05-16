---
name: explain
description: Explain development, UI, web, git, testing, deployment, or agent terms in plain language using the current project context.
---

# Devflow Explain

Use this when the maintainer asks what a development term means, especially
when agent output used jargon such as toast notification, middleware, route,
state management, modal, or responsive layout.

## Workflow

1. Preserve the exact term the maintainer asked about.
2. Include the surrounding project context or agent sentence when available.
3. Run `devflow explain "<term>" --json --context "<project context>"`. If the
   executable is not installed, use `node packages/cli/src/index.js explain`.
4. Explain in plain language first, then say why it matters in this project and
   how the maintainer can verify the behavior.
5. If the term is not in the built-in glossary, say that clearly and ask for the
   file, command output, or agent message where the term appeared.

## Output

Return:

- plain language meaning
- project context
- why it matters
- how to verify it
- related terms if useful

Do not turn the answer into a general course. Explain the term at the point of
work.
