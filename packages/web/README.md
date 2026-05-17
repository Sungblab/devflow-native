# `@devflow/web`

`packages/web` owns browser-facing dashboard shell assets. The first slice is
deliberately no-build: it exports the served dashboard CSS, JavaScript, and HTML
injection helper that `devflow dashboard serve` uses over the existing
`/dashboard.json` contract.

Future Vite/React work should grow from this package while keeping CLI and MCP
JSON contracts stable.
