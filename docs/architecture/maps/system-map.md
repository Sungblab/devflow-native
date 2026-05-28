# System Map

```mermaid
flowchart TD
  User[Maintainer] --> CLI[devflow CLI]
  User --> Artifacts[Generated artifacts]
  User --> Agent[Codex / Claude / Copilot / OpenCode / Goose / Aider]

  CLI --> Core[Core model]
  Artifacts --> Core
  Agent --> Skills[Devflow skills]
  Skills --> CLI

  Core --> Store[(SQLite / local state)]
  Core --> Git[git / gh]
  Core --> Gates[Gate runner]
  Core --> Docs[Project contract docs]
  Core --> Platform[Windows / Linux / macOS adapters]

  Gates --> Evidence[Gate evidence]
  Git --> Evidence
  Docs --> Maps[Docs-code-test maps]
  Evidence --> Handoff[Next-session handoff]
```

## Ownership

- Core owns normalized project state.
- CLI owns mutation and automation commands.
- Artifacts own optional visualization.
- Skills own agent behavior.
- Profiles own methodology differences.
- Adapters own external tool formats.
