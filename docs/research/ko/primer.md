# 한국어 연구 입문서

이 문서는 Solo Devflow OS 연구를 영어 논문을 잘 모르는 상태에서도
설명할 수 있게 만든 한국어 입문서다.

## 한 문장 요약

AI 코딩 에이전트가 하던 작업을 다음 세션이 이어받을 때, 그냥 긴
대화기록이나 자유 요약을 넘기는 것보다 "무엇을 바꿨고, 무엇을
검증했고, 무엇이 아직 위험한지"를 구조화해서 넘기면 더 잘 이어받는지
실험하는 연구다.

## 쉬운 예시

나쁜 시작:

```text
내 프로젝트 파악해줘. 어제 하던 거 이어서 해줘.
```

이렇게 시작하면 에이전트는 README, package.json, src 디렉터리, 테스트
파일, 라우트, 컴포넌트 등을 다시 뒤진다. 큰 프로젝트에서는 이 탐색만
수만 토큰을 쓸 수 있다.

좋은 시작:

```text
현재 작업: checkout flow bug
관련 파일:
- apps/web/src/routes/checkout.tsx
- apps/api/src/routes/payments.ts
- packages/shared/src/payment-schema.ts

최근 변경:
- payment schema에 couponCode 추가
- frontend validation은 수정됨
- backend route는 아직 미수정

검증:
- npm test 실패: payments route test
- npm run typecheck 미실행

다음 행동:
- backend route에서 couponCode 처리 추가
- payments route test 통과 확인
```

이런 시작점이 있으면 에이전트는 프로젝트 전체를 다시 읽기보다 지금
작업에 필요한 파일과 검증 경로부터 볼 수 있다.

## 핵심 용어

- **handoff**: 다음 세션에 넘기는 인수인계서.
- **structured handoff**: 목표, 상태, 변경 파일, 검증, 위험, 다음 행동을
  정해진 형식으로 쓰는 인수인계서.
- **gate evidence**: 테스트, 타입체크, 린트, 빌드 같은 검증을 실제로
  실행했다는 근거.
- **false completion**: 아직 끝나지 않았거나 검증되지 않았는데
  에이전트가 "완료"라고 말하는 것.
- **baseline**: 비교 대상. 예: handoff 없음, raw transcript, 자유 요약.
- **ablation**: 무엇이 효과를 냈는지 쪼개서 보는 실험. 예: 구조화 때문인지
  gate evidence 때문인지 분리해서 비교한다.
- **cold-start exploration cost**: 새 세션이 첫 유효 수정에 도달하기 전까지
  프로젝트를 다시 파악하느라 쓰는 토큰, 파일 읽기, 검색, 명령 실행 비용.

## 이 연구가 아닌 것

이 연구는 새 코딩 에이전트를 만드는 연구가 아니다.

이 연구는 "에이전트 메모리가 필요하다"는 일반론도 아니다. 그런 도구와
아이디어는 이미 많다.

이 연구는 "큰 컨텍스트 모델이 필요하다"는 주장도 아니다. 긴 컨텍스트는
많이 읽을 수 있게 해주지만, 지금 무엇을 이어받아야 하는지와 무엇이
검증됐는지를 자동으로 보장하지 않는다.

## 이 연구가 보는 것

이 연구는 더 좁은 질문을 본다.

```text
같은 코딩 작업이 중간에 끊겼을 때,
다음 세션이 어떤 정보를 받으면
덜 헤매고, 덜 반복 탐색하고, 검증 없이 완료했다고 덜 말하는가?
```

## 왜 당연한 말인데도 실험할 가치가 있는가

"인수인계를 잘하면 좋다"는 말은 당연하다. 그래서 그 자체는 연구 가치가
약하다.

연구 가치는 다음 질문을 측정하는 데 있다.

- handoff 없음보다 structured handoff가 실제로 나은가?
- raw transcript처럼 정보를 많이 주는 방식보다 구조화된 짧은 handoff가
  나은가?
- 같은 길이의 자유 요약보다 structured handoff가 나은가?
- gate evidence만 주면 false completion이 줄어드는가?
- structured handoff와 gate evidence를 합치면 가장 나은가?
- 긴 컨텍스트나 세션 압축과 비교해도 여전히 이점이 있는가?

즉, 새 아이디어를 발명했다는 주장이 아니라, 실무에서 당연해 보이는
인수인계 방식을 통제된 조건에서 비교해 보는 연구다.

## 교수님께 설명하는 1분 버전

AI 코딩 에이전트는 긴 작업을 하다 보면 세션이 끊기거나 context가
압축됩니다. 그 다음 세션은 이전에 어떤 파일을 왜 바꿨는지, 어떤 테스트가
실패했는지, 무엇을 아직 검증하지 않았는지를 잘 모르는 상태에서 다시
프로젝트를 탐색합니다. 이 과정에서 토큰을 많이 쓰고, 같은 파일을 다시
읽고, 검증 없이 완료했다고 말하는 문제가 생깁니다.

저는 이 문제를 일반적인 에이전트 메모리 문제가 아니라, software
engineering workflow의 same-task handoff 문제로 좁히고 싶습니다. 구체적으로
structured handoff와 gate evidence를 다음 세션에 제공했을 때, no handoff,
raw transcript, 자유 요약, gate-only 조건보다 continuation success와 false
completion이 어떻게 달라지는지 비교하려고 합니다.

## 영어 논문을 읽을 때 볼 부분

논문 전체를 처음부터 다 읽을 필요는 없다. 처음에는 아래만 보면 된다.

1. Abstract: 이 논문이 어떤 문제를 푸는지.
2. Introduction 마지막: 저자들이 주장하는 contribution.
3. Evaluation: 어떤 baseline과 metric을 썼는지.
4. Limitations 또는 Threats to Validity: 어디까지 주장할 수 있는지.
5. Related Work: 내 연구와 어떤 축에서 겹치는지.

읽고 나서 한국어로 네 문장만 정리하면 된다.

```text
이 논문은 무엇을 봤나?
내 연구와 어디가 겹치나?
내 연구와 어디가 다른가?
내 실험에 어떤 baseline/metric을 빌려올 수 있나?
```

