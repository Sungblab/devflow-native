# 다음 개발 Slice: task-001 A-H Pilot Inputs

이 문서는 다음 세션에서 바로 구현할 개발 작업을 고정한다. 지금 할 일은 CLI
기능 추가가 아니라 research experiment harness를 실제 파일럿 입력까지 밀어내는
것이다.

## 한 문장 목표

`task-001`에 대해 canonical interrupted snapshot, hidden evaluator metadata,
observable-only provenance, A-H condition input fixture를 만들어 첫 파일럿 실행이
가능한 상태로 만든다.

## 하지 않는 것

- 새 CLI 명령을 만들지 않는다.
- MCP tool을 추가하지 않는다.
- agent 자동 실행을 구현하지 않는다.
- Semble/CodeGraph integration을 구현하지 않는다.
- 논문 문장을 더 다듬는 데 시간을 쓰지 않는다.

이번 slice는 `experiments/` 아래의 fixture, schema, scorer/test 보강에 집중한다.

## 배경

현재 연구 문서는 core condition을 A-H로 정의한다.

| ID | Condition | 목적 |
| --- | --- | --- |
| A | No handoff | 세션 단절 기준선 |
| B | Raw transcript | noisy하지만 많은 정보의 효과 |
| C | Token-matched summary | 길이가 아니라 구조화 효과 분리 |
| D | Artifact-only | 파일/로그 노출 효과 분리 |
| E | Structured handoff | workflow-state 구조화 효과 |
| F | Gate evidence only | 검증 증거 효과 |
| G | Structured handoff + gate evidence | 제안 방식 |
| H | Human oracle | 사람이 만든 상한선 |

`task-001`은 이미 `experiments/fixtures/tasks/task-001.json`에 존재하지만, 현재는
structured handoff plus gate evidence 샘플만 있다. 다음 작업은 이 task를 실제
실험 입력 8종으로 확장하는 것이다.

## 핵심 원칙

### 1. Gold label은 절대 agent-visible input에 넣지 않는다

Session 2에 보이는 파일에는 다음을 넣지 않는다.

- `goldNextAction`
- expected final fix
- hidden acceptance oracle
- gold changed files
- gold context pointers
- final semantic success label

이 값들은 hidden evaluator metadata에만 존재한다.

### 2. Observable-only provenance를 남긴다

각 input fixture의 중요한 claim은 Session 1에서 관찰 가능한 artifact로 추적
가능해야 한다.

허용 출처:

- original prompt
- raw transcript
- file read
- edit
- git diff
- command log
- gate output
- user statement

최종 정답 patch나 hidden test를 보고 만든 사후 diagnosis는 leakage로 본다.

### 3. Artifact-only는 narrative diagnosis를 금지한다

`03-artifact-only`는 changed files, git diff, command logs, gate outputs만 제공한다.
`무엇을 해야 한다`, `이 파일을 고쳐라`, `backend가 남았다` 같은 해석형 문장은
넣지 않는다.

## 추가할 파일

```text
experiments/fixtures/inputs/task-001/
  00-no-handoff.md
  01-raw-transcript.md
  02-token-matched-summary.md
  03-artifact-only.md
  04-structured-handoff.json
  05-gate-only.json
  06-structured-handoff-plus-gate.json
  07-human-oracle.md
  provenance.json
  hidden-eval.json
```

필요하면 schema도 추가한다.

```text
experiments/schemas/input-fixture.schema.json
experiments/schemas/provenance.schema.json
experiments/schemas/hidden-eval.schema.json
```

## 파일별 요구사항

### `00-no-handoff.md`

포함:

- original task prompt
- frozen filesystem/git snapshot id 또는 설명

금지:

- changed files
- failed gate
- known blocker
- next action

### `01-raw-transcript.md`

포함:

- Session 1에서 관찰 가능한 transcript/command 흐름
- 파일 탐색, 수정, test 실행/미실행 로그

금지:

- transcript 밖 diagnosis
- hidden gold state

### `02-token-matched-summary.md`

포함:

- structured handoff와 비슷한 token budget의 free-form summary
- token budget 또는 character budget metadata

금지:

- schema label을 흉내 내는 field structure
- hidden gold state

### `03-artifact-only.md`

포함:

- changed files
- git diff summary 또는 fixture-local diff block
- command logs
- gate outputs

금지:

- narrative diagnosis
- explicit next action
- hidden gold state

### `04-structured-handoff.json`

포함:

- `devflow.handoff.v1` 형식
- task goal
- current status
- changed files
- decisions
- known failures
- remaining risks
- context pointers
- do-not-repeat

주의:

- gate evidence block은 넣지 않는다.
- next actions는 observable Session 1 evidence에서 도출 가능한 수준으로만 둔다.

### `05-gate-only.json`

포함:

- `devflow.gateEvidence.v1` 형식의 gate evidence
- failed/skipped/unknown gate status
- relevance
- remaining risk

금지:

- full structured handoff
- broader task diagnosis

### `06-structured-handoff-plus-gate.json`

포함:

- structured handoff
- gate evidence
- remaining risks

이 조건이 제안 방식이다.

### `07-human-oracle.md`

포함:

- 사람이 작성한 고품질 handoff
- author time metadata
- observable-only 여부

주의:

- final patch를 본 privileged oracle이면 그렇게 표시한다.
- 기본값은 observable-only human oracle로 둔다.

### `provenance.json`

포함:

- condition id
- claim id
- claim text 또는 JSON pointer
- source artifact type
- source reference
- observable 여부

### `hidden-eval.json`

포함:

- gold next action
- expected final fix summary
- gold changed files
- gold context pointers
- hidden acceptance notes
- expected false-completion risks

금지:

- 이 파일을 Session 2 input으로 사용하지 않는다.

## 테스트 요구사항

최소 테스트:

- A-H input fixture 파일이 모두 존재한다.
- `hidden-eval.json`의 gold field가 visible input에 문자열 그대로 들어가지 않는다.
- `03-artifact-only.md`에 narrative next-action 문구가 없다.
- JSON fixture가 valid JSON이다.
- `04`, `05`, `06` JSON fixture의 `version` 값이 schema와 맞다.
- `provenance.json`의 claim source가 허용 source type 중 하나다.

## 검증 명령

```powershell
npm run docs:check
npm test
```

fixture/schema test를 추가했다면 focused test를 먼저 돌린 뒤 전체 test를 돌린다.

## 완료 조건

- `task-001` A-H input fixture가 모두 존재한다.
- hidden evaluator metadata와 visible input이 분리되어 있다.
- observable-only provenance가 있다.
- docs/check와 test가 통과한다.
- 다음 세션이 8개 condition을 보고 수동 pilot run을 시작할 수 있다.

## 다음 세션 프롬프트

```text
너는 solo-devflow-os의 research experiment harness를 구현하는 maintainer다.

목표:
`docs/research/ko/next-development-slice.md`에 정의된 task-001 A-H pilot input
fixtures를 만든다. CLI/MCP 기능은 추가하지 말고, experiments fixture/schema/test에
집중한다.

먼저 읽을 파일:
- AGENTS.md
- docs/research/experiment-design.md
- docs/research/metrics.md
- docs/research/baselines.md
- docs/research/ko/next-development-slice.md
- experiments/README.md
- experiments/fixtures/tasks/task-001.json
- packages/core/src/schemas/handoff.schema.json
- packages/core/src/schemas/gate-evidence.schema.json

구현:
- experiments/fixtures/inputs/task-001/ 아래 A-H input fixture를 만든다.
- hidden-eval.json과 provenance.json을 만든다.
- 필요하면 input/provenance/hidden-eval schema를 추가한다.
- leakage 방지 테스트를 추가한다.

검증:
- npm run docs:check
- npm test

주의:
- gold next action, expected final fix, hidden oracle은 Session 2 visible input에 넣지 않는다.
- artifact-only condition에는 narrative diagnosis를 넣지 않는다.
- 이번 slice에서는 CLI/MCP 명령을 추가하지 않는다.
```
