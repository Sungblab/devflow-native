# `@devflow/mcp`

`packages/mcp` exposes agent-neutral Devflow tools. The first slice implements
testable tool handlers; a real stdio or HTTP MCP transport can wrap these
handlers later without changing core contracts.

## Initial Tools

- `devflow.doctor`
- `devflow.finish`
- `devflow.next_prompt`

Handlers call `packages/core` and return structured content plus a short text
summary for agent hosts.
