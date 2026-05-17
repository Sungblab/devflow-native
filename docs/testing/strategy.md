# Testing Strategy

Solo Devflow OS uses small local gates first. Every implementation slice should
record the commands that prove the changed contract, CLI path, MCP handler, or
documentation surface still works.

## Default Gates

- `npm run docs:check`
- `npm test`

Gate ids in `.devflow/config.json` must be unique, and every gate must include
a non-empty `id` and `command`. `devflow health` treats malformed gate
definitions as `invalid` even when all scaffold files are present.

## When To Run Each Gate

Run `npm run docs:check` for any change under `docs/`, `README.md`,
`packages/*/README.md`, templates, plugin skill docs, or Markdown examples.

Run `npm test` for any change under `packages/`, `scripts/`, `package.json`, or
command contracts that claim a CLI/MCP behavior is implemented.

## Focused Checks

Use focused `node --test <path>` commands while developing a slice, then run the
full `npm test` before finishing if production code or shared contracts changed.

## Evidence Rules

- Passing tests are evidence only for the behavior they cover.
- Failed or skipped gates must be recorded with the reason.
- `devflow finish` should include changed files, gates, known risks, and the
  next-session prompt before a PR is updated.
