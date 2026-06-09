# Devflow Native

[English README](README.md)

AI 코딩 에이전트가 증거 없이 "완료"라고 말하지 못하게 만듭니다.

Devflow Native는 Codex, Claude Code, shell session 주변에 붙는 repo-local
evidence gate, handoff layer, reviewed mistake-memory loop입니다. 코드를
대신 짜는 도구가 아닙니다. 대신 repo가 에이전트가 무엇을 바꿨고, 무엇을
실제로 검증했고, 어떤 실수를 반복하고, 다음 세션이 어디서 이어가야 하는지
기억하게 만듭니다.

```text
Agent: done.
Devflow: not yet.
- no gate evidence recorded
- no review evidence recorded
- repeated mistake candidate: skipped the repo's PowerShell-safe command rule
Next: run the configured gate or record why it was skipped.
```

## 왜 필요한가

AI 코딩 에이전트는 점점 코드를 잘 생성합니다. 하지만 실제 병목은 종종 신뢰와
continuity입니다.

- 지난 세션에서 무엇이 바뀌었는가?
- 어떤 테스트, 타입체크, 빌드, 리뷰가 실제로 실행됐는가?
- 무엇이 실패했고 무엇은 아직 안 했는가?
- 다음 에이전트가 어떤 repo 문서와 규칙을 믿어야 하는가?
- 정말 완료됐다고 말해도 되는가?
- `ㄱㄱ`나 `끝내` 같은 짧은 지시가 continue, finish, review, handoff 중
  무엇을 뜻했는가?

긴 context, chat history, session compaction은 도움이 됩니다. 하지만 이것들은
프로젝트 안에 남는 작업 상태 기록과 같지 않습니다. Devflow는 다음 Codex,
Claude Code, shell, 사람 리뷰 세션이 처음부터 다시 추측하지 않도록 repo 안에
작업 상태를 남깁니다.

## 실수를 repo 규칙으로 바꾸기

Devflow는 단순히 세션이 있었다는 사실만 기억하지 않습니다. shell mismatch,
unsafe command, 누락된 setup, encoding 문제, path 처리 실패, 잘못된 완료 선언
같은 반복 agent 실수를 기록합니다.

실수는 먼저 local evidence로 남고, 반복되면 promotion candidate가 됩니다. 그
다음 review evidence를 거쳐야만 `AGENTS.md`, Devflow skill, hook rule 같은
durable repo-local rule로 승격됩니다. 그래서 다음 agent session은 같은 실패를
반복하는 대신 그 repo에서 이미 배운 규칙을 들고 시작합니다.

## 다른 도구와의 위치

Devflow는 주변 도구를 대체하려는 제품이 아닙니다.

| 도구 층위 | 맡는 일 |
| --- | --- |
| Codex / Claude Code | repo 안에서 coding agent 실행 |
| Claude hooks / Codex skills | host별 자동화와 지시문 제공 |
| Superpowers | TDD, 디버깅, 계획, 리뷰 같은 작업 습관 제공 |
| TaskMaster류 도구 | task와 agent 작업 queue 관리 |
| Devflow Native | repo-local evidence 기록, 안전하지 않은 완료 선언 차단, 검토된 실수 규칙 승격, 다음 세션 handoff 생성 |

쉽게 말하면, Devflow는 이전 세션이 어디서 멈췄는지 다음 에이전트가 추측하지
않게 만들고, 현재 에이전트가 증거 없이 "완료"라고 말하지 못하게 만드는
쪽입니다.

## Devflow가 하는 일

- gate와 review 정책이 들어간 `.devflow/config.json` 프로젝트 계약 생성
- Codex/Claude용 local plugin, hook, MCP harness 설치 및 점검
- repo 상태, 변경 파일, work/session 상태, gate, 최신 인수인계 상태 표시
- 완료 전에 review evidence와 gate evidence 기록
- `finish --dry-run`으로 정말 완료라고 말해도 되는지 미리 점검
- 다음 에이전트 세션이 이어받을 prompt 생성
- 반복되는 agent 실수를 기록하고, 반복 관측을 집계한 뒤 review evidence가
  있을 때만 repo-local durable rule, skill, hook으로 승격

## 빠르게 써보기

가장 중요한 흐름은 agent-native setup입니다. Devflow는 Codex와 Claude Code
둘 다에 붙을 수 있는 local harness file을 제공합니다. 여기에는 plugin
manifest, skill/command, hook, MCP 설정이 포함됩니다. 전역 npm 설치는
`devflow` CLI를 잡아주는 단계이고, 실제 agent 경험은 대상 repo에 Devflow
harness를 설치한 뒤 필요하면 Codex나 Claude Code를 재시작/리로드할 때
시작됩니다.

대상 repo에서 Codex나 Claude Code를 열고 아래 prompt를 붙여 넣으세요.

```text
Install Devflow Native for this repository.

Inspect the repo first. Preserve existing AGENTS.md, CLAUDE.md, README, tests,
and project rules. Use npx devflow-native@latest if devflow is not already
installed.

Initialize the Devflow scaffold when missing, install only missing Codex/Claude
harness files, run doctor/status/harness health, and tell me exactly what files
changed and whether I need to restart the agent host.
```

짧은 maintainer 지시도 의도한 workflow에 포함됩니다. Prompt hook은 짧은 말을
workflow intent로 바꾸고, agent가 다음에 실행할 Devflow action을 같이 줍니다.

- `ㄱㄱ`, `진행해`, `계속`, `continue`, `next`, `go` -> `devflow status --json`,
  `devflow prompt latest`에서 이어가기
- `끝내`, `마무리`, `완료`, `finish`, `done` -> `devflow finish --guided`를
  실행하고 review/gate blocker를 처리한 뒤 완료 선언
- `다음 세션 프롬프트 줘`, `여기까지`, `handoff` -> `devflow status --json`,
  `devflow prompt next`로 인수인계 생성
- `리뷰`, `pr`, `pull request` -> review evidence 요청 및 기록
- `html`, `리포트`, `보드` -> 먼저 상태를 확인하고, 명시적으로 유용할 때만
  artifact 생성

Prompt 안에 신호가 섞이면 Devflow는 `finish > handoff > review/pr > artifact
> continue` 우선순위를 씁니다. 다만 agent는 여전히 repo 상태를 확인하고,
필요한 gate를 실행하고, review evidence를 기록해야 완료라고 말할 수 있습니다.

Quick Try 이후 기대 상태:

- `devflow` CLI가 `npx` 또는 전역 npm 설치를 통해 동작합니다.
- 대상 repo에는 local `.devflow/` 프로젝트 상태와, 확인 후
  `plugins/devflow/` Codex/Claude Code harness file이 생깁니다.
- Codex는 이 repo의 `.agents/plugins/marketplace.json`에서 Devflow를 설치하고,
  재시작 또는 새 thread 이후 bundled skill, MCP server, hook을 로드할 수
  있습니다.
- Claude Code는 같은 repo marketplace에서 Devflow를 설치하고, 재시작 또는
  `/reload-plugins` 이후 bundled skill, command, MCP server, hook을 로드할 수
  있습니다.
- 이후 그 repo의 새 agent session은 compact Devflow context를 자동으로
  받습니다.

Host-native 설치 명령:

```powershell
codex plugin marketplace add Sungblab/devflow-native
codex plugin add devflow@devflow-native-local

claude plugin marketplace add Sungblab/devflow-native
claude plugin install devflow@devflow-native-local
```

MCP만 붙이는 fallback:

```powershell
codex mcp add devflow -- npx --yes devflow-native@latest mcp stdio
claude mcp add devflow -- npx --yes devflow-native@latest mcp stdio
```

fallback은 tool만 노출합니다. skill, command, hook까지 포함한 전체 Devflow
경험은 plugin 또는 repo-local harness가 로드되어야 합니다.

## 직접 실행할 때

```powershell
npx devflow-native@latest --help
npx devflow-native@latest init --confirm
npx devflow-native@latest harness install --confirm
npx devflow-native@latest harness health
npx devflow-native@latest status --simple
```

`harness install --confirm`은 생성된 `plugins/devflow/` 하네스 파일을 기본적으로
`.gitignore`에 추가해 로컬 파일로 둡니다. 대상 저장소가 그 플러그인 파일을
공개 개발 워크플로로 커밋해야 할 때만 `--repo-visible`을 사용하세요.

반복해서 쓸 프로젝트라면 전역 설치도 괜찮습니다.

```powershell
npm install -g devflow-native
devflow harness health
```

전역 npm 설치와 agent plugin 등록은 다릅니다. 전역 설치는 `devflow` 명령을
어디서나 쓸 수 있게 해줄 뿐입니다. Codex나 Claude Code에서 자동 hook/skill/MCP
경험을 쓰려면 Quick Try prompt 또는 `devflow harness install --confirm`으로
해당 agent 환경의 Devflow harness/plugin 등록 상태까지 확인해야 합니다.

이미 설치한 Devflow를 업데이트할 때는:

```powershell
devflow update
npm install -g devflow-native@latest
devflow --version
devflow harness health
```

전역 설치를 바꾸지 않고 한 번만 최신 버전을 쓸 때는:

```powershell
npx devflow-native@latest --version
npx devflow-native@latest update
```

## Devflow가 하지 않는 일

- 자체적으로 코드를 작성하는 autonomous coding agent가 아닙니다.
- Codex, Claude Code, Superpowers, git, tests, PR review를 대체하지 않습니다.
- HTML dashboard나 생성 artifact를 source of truth로 삼지 않습니다.
- 특정 agent runtime이나 methodology에 종속되지 않습니다.

## 기본 루프

```text
Codex 또는 Claude Code가 저장소를 연다
  -> Devflow session-start hook이 compact repo context를 주입한다

사용자가 "continue" 또는 "next"라고 말한다
  -> Devflow prompt hook이 workflow intent를 분류한다
  -> agent가 status, active work, handoff state를 읽고 시작한다

사용자가 "finish" 또는 "review"라고 말한다
  -> Devflow finish flow가 docs impact, gates, risks, next prompt를 확인한다
  -> completion evidence가 .devflow/state/events.jsonl에 기록된다

agent가 repo-specific 실수를 반복한다
  -> Devflow가 .devflow/mistakes.json에 실수를 감지하거나 기록한다
  -> 반복된 high-confidence 관측이 promotion candidate가 된다
  -> promote --dry-run은 durable file을 수정하지 않고 patch candidate만 보여준다
  -> review evidence가 있어야 promote --apply가 AGENTS.md, Devflow skill, hook/config rule로 승격한다
```

`.devflow/state/`, `.devflow/next-prompt.md` 같은 runtime state는 기본적으로
local-only입니다. `.devflow/config.json` 같은 공개 프로젝트 계약은 저장소가
Devflow workflow를 채택할 때 커밋할 수 있습니다.

## Dogfood Smoke

Devflow Native는 OpenCairn 같은 큰 Windows/PowerShell monorepo에 직접 적용해
검증합니다. 새 저장소 데모가 아니라, 이미 문서/규칙/dirty worktree가 있는
성숙한 repo를 안전하게 채택하는지 보기 위한 smoke입니다.

최근 로컬 smoke는 `C:\Users\Sungbin\Documents\GitHub\opencairn-monorepo`에서
아래 명령으로 확인했습니다.

```powershell
devflow harness inspect --json
devflow harness health --json
devflow gates run docs-check --work local-work --json
devflow finish --json
```

2026-05-29 관찰 결과:

- Codex와 Claude harness target이 `ready`로 보고됐습니다.
- Harness health는 `status: ok`였고 plugin manifest, MCP config, hook script,
  `review.required`가 통과했습니다.
- `docs-check`는 `local-work`에 gate evidence로 기록했을 때 통과했습니다.
- `finish`는 review evidence가 기록되기 전까지 `canClaimDone: false`를
  유지했습니다. 이게 의도한 완료 guardrail입니다.

이건 성능 benchmark가 아니라 smoke record입니다. 현재 harness가 실제 repo에서
설치, 점검, hook 실행, gate evidence 기록, 안전하지 않은 finish claim 차단까지
동작한다는 증거입니다.

## 주요 명령

```powershell
devflow --help
devflow update
devflow doctor --platform windows-powershell --json
devflow status --simple
devflow finish --guided
devflow prompt latest
devflow mistakes detect --platform windows-powershell --command "node script.mjs << 'EOF'" --stderr "ParserError: Missing file specification after redirection operator." --record --json
devflow mistakes promote --id powershell-bash-heredoc-redirection --target agents --dry-run --json
devflow mistakes review --id powershell-bash-heredoc-redirection --status approved --summary "Repeated PowerShell heredoc correction is repo-relevant." --json
devflow mistakes promote --id powershell-bash-heredoc-redirection --target skill --apply --json
devflow mistakes rules --json
devflow harness health
devflow mcp stdio
```

## 문서

- [Quickstart](docs/quickstart.md)
- [Release Checklist](docs/release.md)
- [Product Plan](docs/product-plan.md)
- [Architecture](docs/architecture.md)
- [Repeated Mistake Loop](docs/architecture/repeated-mistake-loop.md)
- [Harness](docs/harness.md)
- [Research Boundary](docs/research/README.md)
- [Roadmap](docs/roadmap.md)

## 저장소 구조

```text
packages/core     shared product model, local state, gates, handoff contracts
packages/cli      terminal command surface over core contracts
packages/mcp      MCP handler and stdio transport over the same contracts
packages/adapters agent/session history adapters
plugins/devflow   dogfood Codex and Claude Code plugin drafts
docs              product, architecture, roadmap, examples, and public notes
.devflow          dogfood project contract; runtime state is gitignored
```

## 현재 상태

현재 v0.1 foundation release는 npm package, CLI, MCP handler, repo-local
Codex/Claude plugin draft, hook, finish guard, review-gated repeated-mistake
promotion loop를 포함합니다. Hosted sync, richer artifact generation, broader
adapter coverage, 더 많은 detector family는 이후 작업입니다.

연구 노트, 논문 초안, 평가 fixture, 비공개 데이터는 별도 private repository에
둡니다. 이 공개 저장소에는 제품 구현과 공개 문서만 둡니다.
