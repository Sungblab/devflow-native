# Gemini CLI Template

This template is a project-scoped Gemini CLI settings file for connecting
Gemini to the local Devflow MCP stdio server.

Copy `settings.json` to:

```text
.gemini/settings.json
```

The template uses Gemini CLI's project settings shape:

- top-level `mcpServers`
- `devflow.command` set to `node`
- `devflow.args` set to `["packages/mcp/src/stdio.js"]`
- `devflow.cwd` set to `.`
- `devflow.trust` set to `false`

Keep host authentication separate. This template only starts the local Devflow
MCP server and does not reuse Gemini, Codex, Claude, or GitHub credentials.
