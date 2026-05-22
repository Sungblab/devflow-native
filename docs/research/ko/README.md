# 연구 한국어 문서

이 폴더는 Solo Devflow OS 연구를 한국어로 이해하고 운영하기 위한 1차
문서다. 영어 논문 형식은 나중에 필요할 때 만들고, 지금은 이 폴더를 먼저
읽으면 된다.

## 먼저 읽을 순서

1. [입문서](./primer.md)
   - 이 연구가 뭔지, 왜 필요한지, 핵심 용어가 뭔지 설명한다.
2. [연구 판단 로그](./decision-log.md)
   - 지금까지 대화에서 결정한 방향, 하지 말아야 할 주장, 연구 가치 판단을
     기록한다.
3. [긴 컨텍스트와 비용](./long-context-and-cost.md)
   - Codex식 compaction, 20만 줄 프로젝트, SubQ/long-context 반론, token cost
     문제를 정리한다.
4. [한국어 논문 개요](./paper-outline-ko.md)
   - 논문/보고서를 한국어로 어떤 구조로 쓸지 잡는다.
5. [논문 HTML 미리보기](./paper-preview.html)
   - 현재 연구가 논문 형태로 어떻게 보일지 빠르게 확인한다.
6. [다음 개발 slice](./next-development-slice.md)
   - `task-001` A-H pilot input fixture를 만드는 다음 구현 작업을 고정한다.
7. [Contract-First Sliced Execution](./contract-first-sliced-execution.md)
   - 프로젝트 계약, slice spec, implementation plan, 질문 예산, plan-bounded
     agent session 운영 모델을 설명한다.

## 연구 한 문장

AI 코딩 에이전트가 하던 작업을 다음 세션이 이어받을 때, 긴 대화기록이나
자유 요약을 넘기는 것보다 "무엇을 바꿨고, 무엇을 검증했고, 무엇이 아직
위험한지"를 구조화해서 넘기면 더 잘 이어받는지 실험하는 연구다.

## 지금 방향

이 연구는 "새로운 AI agent memory system"을 만든다는 주장이 아니다.

더 좁고 방어 가능한 주장은 다음이다.

```text
same-task multi-session coding workflow에서
structured handoff와 gate evidence가
continuation success, false completion, token cost,
repeated exploration에 어떤 영향을 주는지 비교한다.
```

## 영어 문서와의 관계

영어 문서는 외부 공개, 논문 초안, schema/contract 설명용이다. 한국어 문서는
연구 이해와 운영용이다.

- 한국어 이해: 이 폴더
- 영어 연구 계획: [../research-plan.md](../research-plan.md)
- 영어 related work: [../related-work.md](../related-work.md)
- 영어 paper outline: [../paper-outline.md](../paper-outline.md)
- 실험 설계: [../experiment-design.md](../experiment-design.md)
- 지표/루브릭: [../metrics.md](../metrics.md)
