# Condition D: Artifact-Only

Session 2 receives:

- the original task prompt
- the interrupted filesystem snapshot
- changed files
- git diff
- command logs
- gate outputs

It does not receive narrative diagnosis, structured workflow-state fields, or
human-authored next-action guidance.

Purpose: separate the value of exposing the right observable artifacts from the
value of structured workflow-state interpretation.
