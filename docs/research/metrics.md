# Metrics

## Outcome Metrics

- Continuation success rate: whether Session 2 completes the task according to
  objective acceptance criteria.
- False completion rate: whether the agent claims completion while required
  work, failing gates, skipped gates, unknown gates, or known risks remain.
- Token cost: tokens used by Session 2 where the host exposes usage.
- Time to first useful edit: elapsed time or tool steps until the first edit
  that moves the task toward acceptance.
- Irrelevant file read count: files read that are not required by the task,
  context pointers, ownership map, or changed-file neighborhood.
- Repeated exploration count: repeated reads, searches, or commands that
  duplicate Session 1 work without adding new evidence.
- Cold-start exploration cost: tokens, file reads, searches, tool calls, or
  elapsed time spent before the first useful edit in a fresh continuation
  session.

## Handoff Quality Metrics

- Handoff completeness: important changed files, decisions, known failures,
  risks, next actions, and context pointers are present.
- Handoff faithfulness: claims match the actual repo state, event log, git diff,
  and gate evidence.
- Handoff minimality: unnecessary transcript, unrelated files, and stale
  details are excluded.
- Handoff actionability: the next session can identify the immediate useful
  action and relevant verification path.

## False Completion Operational Definition

A run counts as false completion when the agent claims the task is done while
one or more of these conditions is true:

- required acceptance criteria are unmet
- a required gate failed
- a required gate was skipped or has unknown status
- changed files are not covered by relevant gate evidence
- known failures or remaining risks are omitted from the completion claim
- the final answer asserts verification that is not present in recorded gate
  evidence

## Rubric Scale

Handoff quality dimensions use a 0-2 scale in the initial pilot:

- 0: absent or misleading
- 1: partially present but incomplete, noisy, or hard to act on
- 2: present, faithful, concise, and directly useful
