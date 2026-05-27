# 2026-05-26 연구 리서치 갱신

이 문서는 Solo Devflow OS 연구 주제를 다시 넓게 훑은 뒤 남기는 현재 판단이다.
초점은 TencentDB Agent Memory 같은 단일 도구가 아니라, Devflow 연구 자체다.

## 결론

Devflow의 강한 연구 포지션은 여전히 다음이다.

```text
same-task multi-session coding workflow에서
active work state와 deterministic gate evidence를 구조화해서 넘기면
다음 세션의 continuation success, false completion, token cost,
repeated exploration이 어떻게 달라지는가?
```

다만 related work를 다시 보면 이 주제는 "agent memory" 하나로 묶기보다 네 축에
걸쳐 설명해야 한다.

1. coding-agent harness/interface
2. context retrieval and experience reuse
3. multi-session memory and task resumption
4. verification, evidence, and trust

## 새로 강해진 판단

### 1. "더 많은 context"가 아니라 "더 나은 resumption state"가 핵심이다

ContextBench와 SWE-ContextBench는 관련 context를 찾고 재사용하는 문제가 이미
중요한 평가 축이라는 점을 보여준다. 하지만 Devflow는 completed prior task
experience reuse보다 더 좁다. 같은 작업이 끊긴 뒤 다음 세션이 무엇을 이어야
하는지 묻는다.

따라서 Devflow의 실험은 다음을 분리해야 한다.

- 관련 artifact를 보여준 효과
- narrative summary를 준 효과
- schema-based workflow state를 준 효과
- gate evidence를 준 효과

현재 A-H 조건은 이 분리를 잘 한다. 없애지 않는다.

### 2. static repo instructions는 baseline이지 답이 아니다

AGENTS.md 평가와 ContextCov는 정반대 방향에서 같은 결론을 만든다. 자연어
instruction file은 유용할 수 있지만, 너무 넓으면 비용과 탐색이 늘고 passive
text라서 위반될 수 있다. ContextCov처럼 실행 가능한 guardrail이 필요한 영역도
있다.

Devflow의 위치:

- AGENTS.md: durable project rules
- ContextCov류 guardrail: executable constraint enforcement
- Devflow: current interrupted task state, gate evidence, finish/handoff guard

이 세 가지를 섞지 말고 논문에서 분리해서 설명해야 한다.

### 3. memory granularity 반론에 대비해야 한다

Structurally Aligned Subtask-Level Memory는 coarse instance-level memory가
잘못된 reasoning stage를 가져올 수 있다고 주장한다. 이건 Devflow에 우호적인
근거다. Devflow handoff는 "이전 세션 전체 요약"이 아니라 다음 단위로 쪼개야
한다.

- task goal
- current status
- changed files
- decisions
- known failures
- skipped or failed gates
- remaining risks
- next useful action

즉 handoff schema는 memory chunk가 아니라 workflow-state decomposition이다.

### 4. long-horizon coding은 pass/fail만 보면 부족하다

LongCLI-Bench는 long-horizon CLI task에서 초기 단계 실패와 step-level failure가
중요하다는 쪽이고, SlopCodeBench는 agents가 반복 확장을 하며 checkpoint를
일부 통과해도 구조가 무너질 수 있음을 보여준다.

Devflow 파일럿의 1차 지표는 continuation success와 false completion이지만,
확장 연구에서는 다음도 봐야 한다.

- duplicated code
- complexity concentration
- architecture drift
- old decision violation
- gate coverage versus changed files

이것들은 지금 core A-H pilot 뒤의 2단계 연구로 둔다.

### 5. 인간 개발자의 interrupted task 연구도 넣어야 한다

Parnin의 interrupted programming work는 AI가 아니라 사람 대상 연구지만,
Devflow 문제 정의에는 중요하다. 프로그래밍 작업 재개는 예전부터 file/method
context만으로 충분하지 않았고, plans, progress, failure/evaluation state가
필요했다.

Devflow는 이 문제를 AI coding agent 환경으로 옮긴다.

## 논문에서 피해야 할 말

- "we solve agent memory"
- "more context improves coding agents"
- "Devflow replaces AGENTS.md or memory systems"
- "gate evidence proves correctness"
- "workflow OS"를 논문 contribution으로 전면 주장

## 논문에서 써야 할 말

- verification-aware workflow-state handoff
- interrupted same-task continuation
- active work state rather than static repository context
- deterministic gate evidence rather than unsupported completion claims
- harness-level intervention
- structured resumption cue for coding agents

## 실험 설계 반영

core A-H 조건은 유지한다.

```text
A no handoff
B raw transcript
C token-matched free-form summary
D artifact-only
E structured handoff
F gate evidence only
G structured handoff plus gate evidence
H human oracle handoff
```

추가 baseline은 core pilot 이후로 미룬다.

- AGENTS.md-only
- ContextCov/guardrail-assisted condition
- Semble or CodeGraph-assisted search
- symbolic canvas condition
- long-context or compressed-continuation condition
- maintainability/drift condition inspired by SlopCodeBench

## 다음 문서 작업

1. `related-work.md`에 missing works를 계속 보강한다.
2. `paper-outline.md`의 related-work section을 네 축으로 재정렬한다.
3. `experiment-design.md`에 "why A-H must stay"를 더 명시한다.
4. core pilot 이후 extension condition은 별도 section으로 유지한다.

## 현재 우선순위

리서치 문장을 더 늘리는 것보다 `task-001` A-H pilot fixture와 dry-run result
schema를 먼저 닫는 것이 맞다. 지금 주장 자체는 충분히 방어 가능하다. 다음
증거는 더 많은 related work가 아니라 작은 파일럿 결과다.
