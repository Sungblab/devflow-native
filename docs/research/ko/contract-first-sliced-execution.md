# Contract-First Sliced Execution

이 문서는 바이브코딩, 애자일, 워터폴, 랄프식 빠른 반복, Devflow 운영 모델을
정리한다.

## 핵심 결론

바이브코딩에는 순수 워터폴도, 순수 즉흥 프롬프트도 잘 맞지 않는다.

Devflow가 지향할 방식은 다음이다.

```text
project contract
  -> slice spec
  -> implementation plan
  -> plan-bounded agent session
  -> gate evidence
  -> finish guard
  -> next-session handoff
```

한국어로 말하면:

```text
프로젝트 계약
  -> 작업 단위 스펙
  -> 구현 계획
  -> 계획 안에서 실행하는 에이전트 세션
  -> 검증 증거
  -> 완료 가능 여부 판단
  -> 다음 세션 인수인계
```

## 왜 필요한가

AI가 코드를 빨리 만들수록 병목은 코드 작성에서 다른 곳으로 이동한다.

- 무엇을 만들 것인가
- 무엇을 만들지 말 것인가
- 도메인에서 맞는 동작은 무엇인가
- 어떤 제약을 절대 깨면 안 되는가
- 어떤 검증이 충분한가
- 다음 세션이 무엇을 이어받아야 하는가

즉, 구현 노동은 줄어들지만 도메인 제약, 작업 상태, 검증 근거를 관리하는
노동은 더 중요해진다.

좋은 문장:

> 코딩 에이전트가 구현 비용을 낮출수록, 병목은 코드 작성에서 도메인 제약
> 명세, 작업 상태 보존, 완료 주장 검증으로 이동한다.

영어:

> As coding agents reduce the cost of implementation, the bottleneck shifts
> toward specifying domain constraints, preserving workflow state, and verifying
> completion claims.

## 워터폴과 다른 점

워터폴은 전체 제품을 처음부터 끝까지 크게 설계하고, 그 뒤 구현하는 방식에
가깝다.

Devflow식 contract-first sliced execution은 전체 원칙은 먼저 고정하지만,
구현은 작은 slice로 반복한다.

```text
워터폴:
  큰 설계 전체를 오래 고정
  -> 나중에 구현

Devflow:
  도메인/아키텍처/검증 원칙은 고정
  -> 작은 slice마다 spec/plan
  -> 구현과 검증 반복
```

## 순수 바이브코딩과 다른 점

순수 바이브코딩은 빠르지만 사용자가 도메인을 모르면 빈틈이 생긴다.

예:

```text
예약 기능 만들어줘
```

이 말만 주면 에이전트는 날짜 선택, 시간 선택, 저장 기능을 만들 수 있다.
하지만 실제 도메인은 다음을 요구할 수 있다.

- 중복 예약을 막아야 하는가?
- 예약 취소 정책은?
- 결제 전 hold 시간은?
- 타임존은?
- 영업일/공휴일은?
- 관리자 override는?
- 노쇼 처리는?
- 개인정보 보관 기간은?

사용자가 모르면 에이전트도 임의 결정하거나 놓친다. Devflow는 이런 결정을
chat에 흘려보내지 않고 spec, plan, decision log, handoff에 남기게 해야 한다.

## 질문 예산

에이전트가 사용자에게 매번 물어보는 것도 비용이다.

- 질문 생성에 output token을 쓴다.
- 사용자 답변을 다시 input token으로 넣는다.
- 대화가 길어져 context가 커진다.
- 결정이 chat에만 남으면 다음 세션에서 유실된다.
- 다른 세션이 같은 질문을 반복할 수 있다.

따라서 Devflow의 질문 원칙은 다음이다.

```text
Ask only when:
- local docs cannot answer
- wrong assumption would cause real risk
- decision affects public behavior, data model, security, billing,
  irreversible work, or major architecture boundaries

Otherwise:
- choose a conservative default
- record the assumption
- continue
```

## Spec 문서가 가져야 할 것

작업 단위 spec은 다음을 포함해야 한다.

- 목표
- 범위
- non-goals
- acceptance criteria
- 도메인 제약
- 관련 파일/모듈
- 변경하면 안 되는 것
- 모르는 점과 가정
- 필요한 gate

## Plan 문서가 가져야 할 것

implementation plan은 다음을 포함해야 한다.

- 수정할 파일
- 작업 순서
- 테스트 순서
- gate 실행 계획
- 예상 위험
- fallback 또는 rollback 기준
- 완료 조건

## Plan-Bounded Agent Session

새 세션의 에이전트는 plan 파일을 중심으로 구현해야 한다.

좋은 행동:

- plan에 적힌 파일과 작업부터 본다.
- plan 밖 refactor를 피한다.
- 막히면 evidence를 남긴다.
- assumption을 기록한다.
- gate evidence를 확인한다.
- finish에서 다음 handoff를 남긴다.

나쁜 행동:

- repo 전체를 다시 탐색한다.
- plan과 무관한 개선을 같이 한다.
- 검증 없이 완료를 선언한다.
- 질문을 계속 던진다.
- 결정 내용을 chat에만 남긴다.

## Devflow가 해야 할 일

제품 기능으로는 다음이 필요하다.

- project contract scaffold
- work item registry
- spec draft
- plan draft
- gate recommendation
- assumption logging
- decision logging
- plan-bounded session start prompt
- finish guard
- structured handoff

연구적으로는 이 운영 모델 전체를 한 번에 검증하지 않는다. 초기 연구는 그중
세션 경계의 structured handoff와 gate evidence 효과에 집중한다.

## 연구와의 연결

이 운영 모델은 큰 배경이고, 논문 실험은 좁게 유지한다.

넓은 철학:

> AI 개발은 즉흥 프롬프트가 아니라, 프로젝트 계약 -> 슬라이스 스펙 -> 구현
> 플랜 -> 검증 증거 -> 다음 세션 핸드오프로 이어질 때 안정해진다.

좁은 실험:

> structured handoff와 gate evidence가 same-task multi-session continuation에서
> continuation success, false completion, token cost, repeated exploration에 어떤
> 영향을 주는가?

