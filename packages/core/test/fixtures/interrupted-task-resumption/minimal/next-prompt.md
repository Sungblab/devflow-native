Resume interrupted-resumption-fixture: Repair login redirect flow

Changed files:
- apps/web/src/login.tsx
- apps/web/test/login.test.ts

Evidence commands:
- npm test

Risks:
- Prior session interrupted: context-window-reset.

Next task: Fix the redirect assertion and rerun the unit gate.

