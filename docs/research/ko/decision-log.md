# Research Decision Log

이 문서는 대화 중 정리된 연구 판단을 durable하게 남긴 기록이다. 목적은
나중에 방향을 다시 잡을 때 같은 논의를 반복하지 않는 것이다.

## 2026-05-18: 연구 정체성

### 결정

Solo Devflow OS 연구는 "AI agent memory system"으로 포지셔닝하지 않는다.

대신 다음처럼 포지셔닝한다.

> AI coding agent의 same-task multi-session workflow에서 active work state와
> deterministic gate evidence를 구조화해서 넘기는 continuity layer를 만들고,
> 이것이 작업 재개 성공률과 false completion에 미치는 영향을 검증한다.

### 이유

agent memory, project memory, session search, AGENTS.md, CLAUDE.md,
repo map, long context, orchestration 도구는 이미 많다. 따라서 "메모리가
필요하다"는 넓은 주장은 새롭지 않다.

방어 가능한 기여는 좁은 실험 질문이다.

- 같은 작업이 세션 사이에서 끊겼을 때
- structured handoff와 gate evidence가
- no handoff, raw transcript, token-matched summary, gate-only, oracle과 비교해
- continuation success와 false completion에 어떤 영향을 주는가

## 2026-05-18: 제품과 연구의 분리

### 결정

`packages/core`는 제품 core로 유지한다. 연구 하네스는 `docs/research/`와
`experiments/`로 분리한다.

### 이유

제품은 실제 사용 가능한 repo-local continuity layer여야 한다. 연구 하네스는
그 제품 layer가 효과 있는지 측정하는 별도 소비자다. 실험 코드가 제품 core를
오염시키면 레포의 방향이 흐려진다.

## 2026-05-18: HTML은 source of truth가 아님

### 결정

HTML artifact는 참고와 human inspection용 view일 뿐이다. 연구/제품의 source
of truth는 Markdown 문서, JSON schema, `.devflow` state, append-only event
log다.

### 이유

HTML은 사람이 읽기 좋지만 agent나 실험 하네스가 안정적으로 소비할 durable
contract로는 부적합하다.

## 2026-05-18: 실험이 핵심

### 결정

Devflow 연구 가치는 새 도구 자체보다 controlled comparison에 있다.

반드시 비교해야 할 조건:

- no handoff
- raw transcript
- token-matched free-form summary
- structured handoff
- gate evidence only
- structured handoff plus gate evidence
- human oracle handoff

### 이유

이 조건들이 있어야 다음을 분리할 수 있다.

- 정보가 많아서 좋아진 것인가?
- 구조화가 좋아서 좋아진 것인가?
- gate evidence가 false completion을 줄인 것인가?
- 사람이 만든 최적 handoff와 비교해 얼마나 가까운가?

## 2026-05-18: 연구 가치 판단

### 결정

연구 가치는 있다. 다만 "최초의 memory/handoff system"으로 주장하면 안 된다.

### 강한 주장

> Structured workflow-state handoff with gate evidence is a harness-level
> intervention for same-task multi-session coding agents, and its effect on
> continuation success, false completion, token cost, and repeated exploration
> can be measured through ablation.

### 약한 주장

> Coding agents need memory.

이 주장은 너무 넓고 이미 많은 도구와 연구가 다루고 있다.

## 2026-05-18: 긴 컨텍스트와 세션 압축에 대한 입장

### 결정

긴 컨텍스트나 Codex식 session continuation/compaction을 적으로 두지 않는다.
대신 비교 baseline이나 complementary mechanism으로 본다.

### 이유

긴 컨텍스트는 많은 정보를 읽게 해주지만, 검증된 완료 여부를 보장하지 않는다.
compaction은 유용하지만 손실 압축이다. 긴 세션이든 새 세션이든 중요한 것은
세션 경계에서 active work state와 gate evidence를 명시적으로 checkpoint하는
것이다.

### 좋은 문장

> Long context expands what agents can read. Devflow reduces what agents need
> to reread.

한국어:

> 긴 컨텍스트는 많이 읽을 수 있게 해주고, Devflow는 다시 안 읽어도 되게 해준다.

## 2026-05-18: 오픈소스/제품 중복성

### 결정

AICTX, Vexp, repo map, agent memory, AGENTS.md sync, MCP memory 도구처럼
비슷한 문제를 다루는 도구가 있다는 사실을 related work에 정직하게 포함한다.

### 이유

중복 도구가 있다는 것은 이 문제가 실무적으로 실제라는 증거다. 하지만 Devflow는
"repo를 덜 읽게 하는 최초 도구"가 아니라, "same-task continuation에서
handoff/evidence 조건을 비교하는 연구 하네스"로 좁혀야 한다.

## 2026-05-18: 초보/바이브코딩 관점

### 결정

바이브코딩 관점의 제품 가치는 cold-start exploration cost 감소로 설명한다.

### 이유

큰 프로젝트에서 "내 프로젝트 파악해줘"는 수만 토큰을 쉽게 소모한다. 초보자는
어떤 파일을 봐야 하는지, 어떤 테스트를 돌려야 하는지 모르는 경우가 많다.
Devflow는 전체 프로젝트를 다시 읽게 하는 대신 active work, related files,
changed files, gates, next actions를 제공한다.

연구 지표로는 다음을 사용한다.

- token cost
- time to first useful edit
- irrelevant file read count
- repeated exploration count
- cold-start exploration cost

