# Condition C: Token-Matched Summary

Budget metadata:

- Target: roughly the same reading budget as the structured handoff condition.
- Approximate character budget: 1,500 characters.

The prior session worked on adding machine-readable status output for
`task-001`. It inspected the CLI status implementation, found that status
dispatch and rendering lived in the CLI entrypoint, and changed the status path
so `--json` selects a JSON renderer while the default text output remains
unchanged. It also added a focused CLI test for the JSON status path and ran
that focused test successfully.

The session stopped before checking the broader configured verification record.
The useful context from the interrupted work is that the CLI entrypoint and the
new focused status JSON test are the relevant edited areas, while the default
status behavior should still be treated as part of the acceptance surface. Do
not spend time rediscovering unrelated packages before reading the edited CLI
status code, the focused test, and the available verification evidence from the
interrupted state.
