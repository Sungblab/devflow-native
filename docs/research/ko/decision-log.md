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

## 2026-05-18: Contract-first sliced execution

### 결정

Devflow의 운영 모델은 순수 워터폴이나 순수 바이브코딩이 아니라
contract-first sliced execution으로 잡는다.

```text
project contract
  -> slice spec
  -> implementation plan
  -> plan-bounded agent session
  -> gate evidence
  -> finish guard
  -> next-session handoff
```

### 이유

에이전트가 매번 사용자에게 질문하면 input/output token이 계속 늘고, 결정이
chat에만 남아 다음 세션에서 유실된다. 반대로 처음부터 전체를 오래 설계하면
구현이 늦어진다.

따라서 durable project contract는 먼저 만들고, 구현은 slice 단위로 spec과
plan을 만든 뒤, 다음 세션 에이전트가 plan 파일 중심으로 구현하게 한다.

### 질문 예산

에이전트는 다음 경우에만 질문한다.

- local docs와 state로 답할 수 없다.
- 틀린 가정이 실제 위험을 만든다.
- public behavior, data model, security, billing, irreversible work, major
  architecture boundary에 영향을 준다.

그 외에는 보수적인 기본값을 선택하고 assumption을 spec, plan, event log,
handoff에 기록한다.

## 2026-05-20: Semble과 code-search 반론

### 결정

Semble과 CodeGraph 같은 code search / code graph 도구는 related work와 향후
baseline 후보에 포함한다. 단, Devflow의 중심 주장은 code search가 아니라
same-task workflow-state handoff와 gate evidence로 유지한다.

### 이유

Semble은 agent가 grep 후 파일 전체를 읽는 방식보다 적은 토큰으로 관련 코드
chunk를 찾게 해주는 도구다. CodeGraph는 local code knowledge graph로 symbol
relationship, call graph, impact analysis를 제공한다. 이것은 "새 세션이 repo를
다시 파악하느라 토큰을 많이 쓴다"는 Devflow의 문제의식이 실제 도구 시장에서도
중요하게 다뤄지고 있다는 증거다.

하지만 Semble/CodeGraph는 관련 코드를 찾고 구조를 이해하는 문제를 풀고,
Devflow는 이전 세션의 작업 상태, 검증 증거, 완료 차단 요인, 다음 행동을
보존하는 문제를 푼다.

### 실험 반영

초기 core condition A-H는 유지한다. 이후 확장 실험으로 다음 조건을 고려한다.

- no handoff + Semble-assisted search
- structured handoff + gate evidence + Semble
- no handoff + CodeGraph-assisted navigation
- structured handoff + gate evidence + CodeGraph
- 모든 조건에 동일한 검색/그래프 도구를 허용한 상태에서 handoff 조건만 비교

## 2026-05-22: 연구 기여 축소와 canonical snapshot

### 결정

논문 기여는 `solo-devflow-os` 전체 제품이 아니라 다음 세 가지로 좁힌다.

1. workflow-state handoff schema
2. gate evidence model
3. multi-session interruption evaluation protocol

제품명 `Solo Devflow OS`는 유지하되, 논문 본문에서는 `Devflow Handoff
Protocol`, `workflow continuity layer`, `verification-aware handoff protocol`을
우선 사용한다.

### 이유

`OS`, `agent memory`, `all-in-one AI development workflow` 같은 표현은 연구
범위를 넓히고 Hermes, long-term memory, dashboard/workflow tool과 불필요하게
비교되게 만든다. 현재 가장 방어 가능한 주장은 same-task multi-session coding
workflow에서 active work state와 deterministic gate evidence가 continuation
success와 false completion에 미치는 효과다.

### 실험 프로토콜

Session 1을 매 조건마다 자연 실행하지 않는다. 각 task마다 하나의 canonical
interrupted snapshot을 만든다.

agent-visible snapshot은 다음을 포함한다.

- partial implementation
- changed files와 git diff
- command log
- failing gate
- skipped 또는 unknown gate
- known blocker

gold next action, expected final fix, hidden acceptance oracle, gold changed
files, gold context pointers는 hidden evaluator metadata에만 둔다.

모든 조건 A-H는 같은 snapshot에서 시작하고, 다른 것은 Session 2에 제공되는
handoff/input package뿐이어야 한다.

### Observable-only audit

Session 2에 제공되는 handoff의 모든 claim은 Session 1에서 관찰 가능한 artifact에
추적 가능해야 한다. 출처는 prompt, transcript, file read, edit, git diff, command
log, gate output, user statement 중 하나여야 한다. 최종 정답 patch나 hidden test를
보고 만든 사후 diagnosis는 leakage로 본다.

### Artifact-only baseline

core condition에 artifact-only baseline을 추가한다. 이 조건은 changed files, git
diff, command logs, gate outputs만 제공하고 narrative diagnosis는 제공하지 않는다.
이 baseline은 structured handoff의 효과가 단순히 "관련 파일과 로그를 제공한 효과"인지,
아니면 workflow-state 구조화의 효과인지 분리하기 위해 필요하다.

### 파일럿 규모

처음부터 10 tasks x 8 conditions x 3 repeats로 가지 않는다. 우선순위는 다음이다.

```text
1 task x 8 conditions x 2 repeats = 16 runs
3 tasks x 8 conditions x 2 repeats = 48 runs
5 tasks x 8 conditions x 2 repeats = 80 runs
10 tasks x 8 conditions x 3 repeats = 240 runs
```

AGENTS.md, Semble, CodeGraph, long-context, compressed-continuation baseline은
core A-H 파일럿이 돌아간 뒤 확장 조건으로 추가한다.

## 2026-05-26: TencentDB Agent Memory 리서치 반영

### 확인한 내용

[TencentDB Agent Memory](https://github.com/Tencent/TencentDB-Agent-Memory)는
OpenClaw/Hermes에 붙는 memory plugin으로, Devflow 같은 workflow OS가 아니다.
현재 npm 패키지 설명은 `L0→L1→L2→L3` four-layer local memory system이고,
README는 다음 두 축을 강조한다.

- symbolic short-term memory: verbose tool log를 외부 파일과 JSONL로 빼고,
  Mermaid task canvas만 context에 남긴다.
- layered long-term memory: L0 Conversation, L1 Atom, L2 Scenario, L3 Persona로
  conversation memory를 계층화한다.

소스 기준으로도 short-term offload record에는 `node_id`, `summary`,
`result_ref`, `tool_call_id`가 있고, Mermaid node는 다시 raw result ref로
드릴다운할 수 있다. 검색 도구는 `tdai_memory_search`와
`tdai_conversation_search`이며, L1 memory search는 FTS5 keyword와 embedding
검색을 RRF로 합치는 hybrid path를 둔다.

### 판단

이 시스템은 Devflow의 직접 경쟁자라기보다 "상위 구조 + 하위 증거" 설계의 좋은
related work다. 특히 compact Mermaid canvas와 `node_id`/`result_ref` trace는
Devflow의 `status`, `finish`, `next prompt`가 나중에 그래프 view를 만들 때
참고할 만하다.

하지만 Devflow 연구 주장은 여전히 agent memory가 아니다. Devflow가 검증해야
할 것은 persona recall이나 장기 사용자 기억이 아니라, interrupted coding task의
active work state, changed files, failed/skipped gates, remaining risk가 다음
세션의 continuation success와 false completion에 미치는 영향이다.

### 문서/실험 반영

core A-H 조건은 그대로 둔다. TencentDB식 symbolic canvas는 core 파일럿 뒤의
확장 조건으로 둔다.

확장 후보:

- canvas-only: event/gate/file ref가 붙은 compact Mermaid workflow graph만 제공
- structured handoff plus canvas: structured handoff와 gate evidence에 graph view 추가
- raw transcript plus canvas: raw transcript 위에 자동 생성 task graph를 추가

Devflow canvas가 생기더라도 source of truth는 Mermaid가 아니라 append-only event
log, gate evidence, changed-file records, handoff schema여야 한다.
