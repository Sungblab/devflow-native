# Condition A: No Handoff

Session 2 receives only:

- the original task prompt
- the interrupted filesystem snapshot
- normal static repo context available in the repo

It does not receive Session 1 transcript, summary, structured handoff, or gate
evidence.

Purpose: measure the context-loss baseline.
