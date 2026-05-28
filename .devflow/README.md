# Devflow Project State

This directory shows how Devflow Native dogfoods its own project contract.

Tracked files:

- `config.json`: this repository's active Devflow gates and review policy.
- `config.example.json`: a fuller example scaffold for other repositories.
- `mistakes.example.json`: example mistake-memory entries for agent workflows.

Ignored files:

- `.devflow/state/`: local event logs, generated dashboard output, smoke-test
  output, and other runtime evidence.
- `.devflow/next-prompt.md`: local next-session handoff text.

Do not treat runtime state as public source truth. If an example is useful for
users, copy a cleaned version into `docs/examples/`.
