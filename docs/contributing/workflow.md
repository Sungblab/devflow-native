# Development Workflow

Devflow Native should dogfood its own product model.

## Default Loop

1. Read the docs router and product plan.
2. Pick a work item with a clear owner and output.
3. Decide the mode:
   - fast: small docs or local cleanup
   - standard: normal implementation or product design
   - rigorous: risky architecture, security, data, or release work
4. Make the change.
5. Record what was changed, what was verified, and what remains.
6. Produce a next-session prompt.

## PR And Review Policy

Use PR/review for:

- cross-package architecture changes
- security, auth, secret handling, or dangerous command behavior
- persistent storage schema changes
- plugin/adapter contracts
- public behavior changes

Direct local changes are acceptable for:

- early product docs
- examples
- skill drafts
- local planning notes

## Parallel Session Policy

Parallel sessions are useful only when the ownership boundaries are explicit.
Every split task must define:

- branch/worktree name
- owned paths
- paths to avoid
- read order
- allowed commands
- completion evidence
- next handoff format

If those fields cannot be generated, the task is not ready for parallel split.

## Completion Shape

Every finished task should end with:

- changed files
- verification performed
- known gaps
- recommended next task
- copy-paste prompt for the next session

