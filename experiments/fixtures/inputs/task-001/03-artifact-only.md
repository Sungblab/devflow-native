# Condition D: Artifact Only

## Changed Files

- `packages/cli/src/index.js`
- `packages/cli/test/status-json.test.mjs`

## Git Diff Summary

```diff
diff --git a/packages/cli/src/index.js b/packages/cli/src/index.js
@@
+ status argument parsing includes an explicit --json flag branch
+ status rendering can write a JSON object to stdout
diff --git a/packages/cli/test/status-json.test.mjs b/packages/cli/test/status-json.test.mjs
@@
+ invokes devflow status --json
+ parses stdout as JSON
+ asserts task and gate evidence fields are present
```

## Command Logs

```text
$ rg "status" packages/cli packages/core
exitCode=0
summary=matched CLI status command implementation and existing status tests

$ node --test packages/cli/test/status-json.test.mjs
exitCode=0
summary=focused status JSON test passed
```

## Gate Outputs

```json
[
  {
    "gateId": "focused-status-json",
    "command": ["node", "--test", "packages/cli/test/status-json.test.mjs"],
    "status": "passed",
    "exitCode": 0
  },
  {
    "gateId": "test",
    "command": ["npm", "test"],
    "status": "unknown",
    "exitCode": null
  }
]
```
