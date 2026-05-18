# 한국어 논문 개요

## 작업 제목

AGENTS.md를 넘어서: 다중 세션 AI 코딩 에이전트를 위한 검증 인식
워크플로우 상태 핸드오프

## 한 문장 논지

AI 코딩 에이전트가 같은 작업을 여러 세션에 걸쳐 이어갈 때, 현재 작업 상태와
검증 증거를 구조화해서 넘기면 반복 탐색과 허위 완료를 줄일 수 있는지
측정한다.

## 이 논문이 주장하지 않는 것

- 우리가 최초의 agent memory system을 만들었다.
- 긴 컨텍스트는 필요 없다.
- AGENTS.md는 쓸모 없다.
- Devflow가 코드 정답을 보장한다.
- AI judge가 모든 평가를 대신한다.

## 이 논문이 주장할 수 있는 것

- coding agent의 세션 경계 문제는 실제 workflow 문제다.
- static repo context와 active work state는 다르다.
- raw transcript와 structured handoff는 서로 다른 continuation interface다.
- gate evidence는 자연어 완료 주장보다 더 나은 false-completion guard가 될 수
  있다.
- 이 효과는 baseline/ablation 실험으로 측정할 수 있다.

## 초록 초안

AI 코딩 에이전트는 파일을 읽고, 코드를 수정하고, 테스트를 실행하며 점점 더
긴 소프트웨어 엔지니어링 작업을 수행한다. 그러나 현실적인 작업은 한 세션
안에서 끝나지 않는 경우가 많다. 세션이 종료되거나 컨텍스트가 압축되면, 다음
세션은 이전 세션이 어떤 파일을 왜 바꿨는지, 어떤 검증을 실행했는지, 어떤
위험이 남았는지 다시 추론해야 한다. 이 과정에서 반복 탐색, 토큰 비용 증가,
검증 누락, 허위 완료가 발생한다.

본 연구는 다중 세션 AI 코딩 에이전트를 위한 검증 인식 구조화 핸드오프를
평가한다. 제안 방식은 작업 목표, 현재 상태, 변경 파일, 결정 사항, 알려진
실패, gate evidence, 남은 위험, 다음 행동을 repo-local state로 기록하고 다음
세션에 전달한다. 우리는 no handoff, raw transcript, token-matched free-form
summary, structured handoff, gate evidence only, structured handoff plus gate
evidence, human oracle handoff를 비교하여 continuation success, false
completion, token cost, time to first useful edit, irrelevant file reads,
repeated exploration, handoff quality를 측정한다. 이 연구는 새로운 코딩
에이전트를 만드는 것이 아니라, 세션 경계에서 어떤 workflow-state package가
더 신뢰성 있는 continuation을 만드는지 평가하는 데 초점을 둔다.

## 연구 질문

### RQ1. 작업 재개 성공률

Structured handoff는 no handoff, raw transcript, token-matched free-form
summary보다 같은 작업의 다음 세션 성공률을 높이는가?

### RQ2. 검증 증거와 허위 완료

Gate evidence를 포함하면 structured handoff alone이나 gate-only 조건보다 false
completion이 줄어드는가?

### RQ3. 비용과 반복 탐색

Structured handoff는 token cost, cold-start exploration cost, irrelevant file
read count, repeated exploration count, time to first useful edit를 줄이는가?

### RQ4. 핸드오프 품질

Structured handoff는 자유 요약보다 completeness, faithfulness, minimality,
actionability가 높은가?

## 비교 조건

| 조건 | 설명 | 왜 필요한가 |
| --- | --- | --- |
| A. No handoff | 원래 task와 현재 파일 상태만 제공 | 세션 단절 기준선 |
| B. Raw transcript | 이전 세션 대화/로그 전체 제공 | 정보량은 많지만 noisy한 조건 |
| C. Token-matched summary | structured handoff와 비슷한 길이의 자유 요약 | 구조화 효과 분리 |
| D. Structured handoff | 정해진 schema로 상태 전달 | 구조화 자체의 효과 |
| E. Gate evidence only | 검증 결과와 위험만 제공 | 검증 증거 효과 분리 |
| F. Structured handoff + gate evidence | 제안 방식 | 최종 평가 조건 |
| G. Human oracle | 사람이 만든 최적 인수인계 | 상한선 |
| H. Compressed continuation | 같은 세션의 압축된 context로 계속 진행 | Codex식 continuation 반론 반영 |
| I. Long-context full context | 큰 컨텍스트 모델에 더 많은 repo/session context 제공 | long-context 반론 반영 |

초기 파일럿은 A-G를 우선하고, 비용이 허용되면 H/I를 확장 조건으로 둔다.

## 핵심 지표

- continuation success
- false completion
- token cost
- cold-start exploration cost
- time to first useful edit
- irrelevant file read count
- repeated exploration count
- handoff completeness
- handoff faithfulness
- handoff minimality
- handoff actionability

## 검증 전략

### 코드 성공 여부

AI judge가 아니라 deterministic evidence로 본다.

- 테스트 통과 여부
- 타입체크 통과 여부
- lint/build 통과 여부
- acceptance criteria 만족 여부
- expected changed files와 실제 diff 비교

### False completion

가능한 rule-based로 판정한다.

```text
agent가 완료를 주장했다
AND required gate가 실패/누락/unknown/skipped다
=> false completion
```

### Handoff quality

의미 판단이 필요하므로 AI judge를 보조적으로 쓸 수 있다. 하지만 AI judge를
최종 진실로 두지 않는다.

원칙:

- 고정 rubric 사용
- 0/1/2 점수
- evidence citation 요구
- JSON output
- temperature 0
- 여러 모델로 sensitivity check
- 사람이 일부 spot-check

## 예상 반론과 답

### "그냥 당연한 말 아닌가?"

맞다. 좋은 인수인계가 좋다는 말은 당연하다. 연구 가치는 당연한 말을
controlled baseline과 metric으로 검증하는 데 있다.

### "비슷한 도구 이미 있지 않나?"

있다. 그래서 최초 시스템이라고 주장하지 않는다. 차별점은 same-task
continuation에서 structured handoff와 gate evidence의 효과를 ablation으로
측정하는 것이다.

### "긴 컨텍스트 모델이 나오면 필요 없지 않나?"

긴 컨텍스트는 많이 읽을 수 있게 해준다. Devflow는 다시 안 읽어도 되게 한다.
또한 긴 컨텍스트는 완료 주장의 검증 여부를 자동으로 보장하지 않는다.

## 첫 제출 목표

처음부터 top conference를 목표로 잡지 않는다. 현실적인 첫 목표는 다음 중
하나다.

- 학부 연구/졸업 논문
- 교수님 연구실 내부 보고서
- workshop short paper
- poster/demo paper

파일럿 결과가 좋으면 ASE/ICSE/FSE 계열 시스템+평가 논문으로 확장한다.

## 당장 해야 할 일

1. `task-001`을 7개 condition 전체 fixture로 확장한다.
2. task를 5개로 늘린다.
3. AI judge prompt와 rubric을 고정한다.
4. 작은 pilot을 수동 실행한다.
5. 결과표를 만들고 claim 수위를 다시 조정한다.

