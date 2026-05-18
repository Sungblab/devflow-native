# Baselines

The experiment harness compares seven conditions.

## A. No Handoff

The second session receives the original task and current filesystem snapshot
only. This measures the cost of context loss.

## B. Raw Transcript

The second session receives the previous session transcript. This tests whether
more information helps despite noise and token cost.

## C. Token-Matched Free-Form Summary

The second session receives an unstructured summary with roughly the same token
budget as the structured handoff. This separates structure from length.

## D. Structured Handoff

The second session receives the structured handoff without detailed gate
evidence. This measures whether workflow-state structure improves continuation.

## E. Gate Evidence Only

The second session receives gate evidence and risk notes without the full
structured handoff. This isolates the value of verification evidence.

## F. Structured Handoff Plus Gate Evidence

The second session receives the full proposed context package. This is the main
Devflow condition.

## G. Human Oracle Handoff

The second session receives a high-quality human-written handoff. This provides
an upper bound for automated or semi-automated handoff quality.
