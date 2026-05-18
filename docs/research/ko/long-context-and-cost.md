# Long Context, Compaction, And Cold-Start Cost

이 문서는 긴 컨텍스트 모델, Codex식 세션 압축, SubQ 같은 long-context
architecture, 그리고 Devflow의 관계를 정리한다.

## 문제

큰 코드베이스에서 사용자가 다음처럼 말하면:

```text
내 프로젝트 파악해줘.
```

에이전트는 보통 다음 탐색을 수행한다.

- README 읽기
- package.json 읽기
- src 구조 탐색
- route/component/test 파일 검색
- 핵심 파일 여러 개 읽기
- 이전 작업 상태 추론

20만 줄 규모의 프로젝트에서는 이 orientation만으로 수만 토큰을 쓸 수 있다.
문제는 이 비용이 세션마다 반복될 수 있다는 점이다.

## 긴 컨텍스트가 해결하는 것

긴 컨텍스트 모델은 더 많은 코드를 한 번에 넣을 수 있게 한다.

장점:

- 더 많은 파일과 과거 대화를 포함할 수 있다.
- 같은 세션 안에서 작업 흐름을 더 오래 유지할 수 있다.
- raw transcript나 큰 repo context를 더 많이 담을 수 있다.

하지만 긴 컨텍스트는 다음을 자동으로 해결하지 않는다.

- 지금 작업에서 어떤 파일이 중요한지
- 어떤 결정이 이미 내려졌는지
- 어떤 테스트가 실패했는지
- 어떤 gate가 아직 실행되지 않았는지
- 에이전트가 완료라고 말해도 되는지

## Compaction의 한계

Codex나 다른 agent는 컨텍스트가 임계점에 가까워지면 세션 내용을 압축해서
이어간다. 이 방식은 실용적이지만 손실 압축이다.

빠질 수 있는 정보:

- 실패한 테스트의 구체적 의미
- 왜 어떤 접근을 포기했는지
- 사용자의 미묘한 제약
- 검증하지 않은 영역
- 완료 주장에 필요한 evidence

따라서 compaction은 useful baseline이지만, verification-aware handoff를
대체한다고 가정하면 안 된다.

## SubQ 같은 long-context architecture에 대한 입장

SubQ 같은 시스템은 더 긴 컨텍스트를 더 낮은 비용으로 처리하려는 방향이다.
이런 모델이 발전하면 "왜 짧은 handoff가 필요한가?"라는 반론이 강해진다.

Devflow의 답은 다음이다.

> 긴 컨텍스트는 많이 읽을 수 있게 해주고, Devflow는 다시 안 읽어도 되게 해준다.

또는 영어로:

> Long context expands what agents can read. Devflow reduces what agents need
> to reread.

긴 컨텍스트가 있어도 active work state와 gate evidence는 별도 가치가 있다.

- 전체 repo를 아는 것과 지금 작업 상태를 아는 것은 다르다.
- 전체 대화 기록을 갖는 것과 완료 가능 여부를 검증하는 것은 다르다.
- 많이 읽을 수 있는 것과 적게 읽어도 되는 것은 다르다.

## 연구에 추가할 baseline

긴 컨텍스트/세션 압축 반론을 반영하려면 실험 조건에 다음을 추가할 수 있다.

```text
H. Compressed continuation baseline
   같은 agent session의 압축된 context로 계속 진행한다.

I. Long-context full-context baseline
   가능한 경우 큰 컨텍스트 모델에 raw repo/session context를 더 많이 제공한다.
```

초기 파일럿에서는 7개 core condition을 유지하고, 비용이 허용될 때 H/I를
확장 조건으로 추가한다.

## 지표

긴 컨텍스트 논의 때문에 다음 지표가 중요해진다.

- token cost
- cached vs uncached input token
- output token
- wall-clock time
- files read before first useful edit
- tool calls before first useful edit
- irrelevant file read count
- repeated exploration count
- false completion rate

## 제품 포지션

Devflow는 token compressor가 아니다. Devflow는 continuity layer다.

좋은 제품 설명:

```text
Devflow keeps the current work state, changed files, gate evidence, and next
actions local to the repo, so the next agent session can resume from a compact
operational brief instead of rediscovering the project from scratch.
```

나쁜 제품 설명:

```text
Devflow solves long context.
```

긴 컨텍스트는 모델/아키텍처 문제다. Devflow는 workflow-state checkpointing
문제다.

