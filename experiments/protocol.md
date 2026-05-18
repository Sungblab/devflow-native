# Experiment Protocol

This protocol is a skeleton for controlled multi-session coding-agent
experiments. It does not automate agent execution yet.

## Flow

1. Select a task fixture that has objective acceptance criteria and required
   gates.
2. Create or restore the interruption snapshot.
3. Generate the condition-specific context package.
4. Run Session 2 from the same snapshot.
5. Save a run JSON record.
6. Score the run and aggregate results across tasks and conditions.

## Records

- Task fixtures follow [`task.schema.json`](./schemas/task.schema.json).
- Session outputs follow [`run.schema.json`](./schemas/run.schema.json).
- Scored outputs follow [`result.schema.json`](./schemas/result.schema.json).

## Scoring Boundary

The current scripts only provide deterministic placeholder scoring. Human or
LLM-assisted scoring is still needed for semantic judgments such as whether an
edit was useful or whether a handoff was faithful to the actual repository
state.
