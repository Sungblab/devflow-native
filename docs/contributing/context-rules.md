# Context Rules

The product exists to reduce repeated context reconstruction. These rules define
what must become durable state instead of being repeated in chat.

## Durable Context

Keep these in project files:

- product decisions
- architecture boundaries
- command/gate definitions
- work item ownership
- task completion evidence
- next-session prompts
- examples that should be reused

## Ephemeral Context

Keep these in chat only unless they affect product behavior:

- quick opinions
- temporary alternatives
- discarded names
- one-off command output

## Handoff Requirements

A handoff must not claim success without evidence. It should include:

- exact files changed
- commands run
- pass/fail result
- skipped checks and why
- unresolved risks
- next prompt

## Profile Rules

Profiles change the workflow strictness, not the product model.

- `plain`: minimal prompt and gate structure.
- `superpowers`: design/plan/TDD/review-heavy workflow.
- `gstack`: product, CEO, design, QA, ship-style reviews.
- `openharness`: harness/runtime/plugin compatibility.
- `hermes`: personal memory and long-running agent patterns.

No profile should be required for the core project model to work.

