# Baselines

The experiment harness compares eight core conditions.

## A. No Handoff

The second session receives the original task and current filesystem snapshot
only. This measures the cost of context loss.

## B. Raw Transcript

The second session receives the previous session transcript. This tests whether
more information helps despite noise and token cost.

## C. Token-Matched Free-Form Summary

The second session receives an unstructured summary with roughly the same token
budget as the structured handoff. This separates structure from length.

## D. Artifact-Only

The second session receives changed files, git diff, command logs, and gate
outputs without narrative diagnosis. This separates the value of exposing the
right artifacts from the value of structured workflow-state interpretation.

## E. Structured Handoff

The second session receives the structured handoff without detailed gate
evidence. This measures whether workflow-state structure improves continuation.

## F. Gate Evidence Only

The second session receives gate evidence and risk notes without the full
structured handoff. This isolates the value of verification evidence.

## G. Structured Handoff Plus Gate Evidence

The second session receives the full proposed context package. This is the main
Devflow condition.

## H. Human Oracle Handoff

The second session receives a high-quality human-written handoff. This provides
an upper bound for automated or semi-automated handoff quality.
