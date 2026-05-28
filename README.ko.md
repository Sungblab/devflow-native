# Devflow Native

[English README](README.md)

Devflow Native는 Codex, Claude Code 같은 AI 코딩 에이전트 주변에 붙는
local-first workflow harness입니다.

코드를 대신 짜는 도구가 아닙니다. 대신 repo가 에이전트가 무엇을 했고, 무엇을
검증했고, 무엇이 아직 위험하고, 다음 세션이 어디서 이어가야 하는지 기억하게
만듭니다.

## 왜 필요한가

AI 코딩 에이전트는 점점 코드를 잘 생성합니다. 하지만 실제 병목은 종종
continuity입니다.

- 지난 세션에서 무엇이 바뀌었는가?
- 어떤 테스트, 타입체크, 빌드, 리뷰가 실제로 실행됐는가?
- 무엇이 실패했고 무엇은 아직 안 했는가?
- 다음 에이전트가 어떤 repo 문서와 규칙을 믿어야 하는가?
- 정말 완료됐다고 말해도 되는가?

긴 context, chat history, session compaction은 도움이 됩니다. 하지만 이것들은
프로젝트 안에 남는 작업 상태 기록과 같지 않습니다. Devflow는 다음 Codex,
Claude Code, shell, 사람 리뷰 세션이 처음부터 다시 추측하지 않도록 repo 안에
작업 상태를 남깁니다.

## 다른 도구와의 위치

Devflow는 주변 도구를 대체하려는 제품이 아닙니다.

```text
Superpowers: agent가 따라야 할 개발 습관과 workflow skill
CodeGraph:   codebase 구조와 context 탐색
Codex/Claude: coding agent 실행 host
Devflow:    작업 상태, 검증 기록, 리뷰 상태, 다음 세션 prompt
```

쉽게 말하면, 이전 세션이 어디서 멈췄는지 다음 에이전트가 추측하지 않게 만드는
쪽입니다.

## Devflow가 하는 일

- gate와 review 정책이 들어간 `.devflow/config.json` 프로젝트 계약 생성
- Codex/Claude용 local plugin, hook, MCP harness 설치 및 점검
- repo 상태, 변경 파일, work/session 상태, gate, 최신 인수인계 상태 표시
- 완료 전에 review evidence와 gate evidence 기록
- `finish --dry-run`으로 정말 완료라고 말해도 되는지 미리 점검
- 다음 에이전트 세션이 이어받을 prompt 생성

## 빠르게 써보기

권장 흐름은 agent-native setup입니다. 대상 repo에서 Codex나 Claude Code를 열고,
설치와 점검을 에이전트에게 맡기세요.

```text
Install Devflow Native for this repository.

Inspect the repo first. Preserve existing AGENTS.md, CLAUDE.md, README, tests,
and project rules. Use npx devflow-native@latest if devflow is not already
installed.

Initialize the Devflow scaffold when missing, install only missing Codex/Claude
harness files, run doctor/status/harness health, and tell me exactly what files
changed and whether I need to restart the agent host.
```

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
```

`.devflow/state/`, `.devflow/next-prompt.md` 같은 runtime state는 기본적으로
local-only입니다. `.devflow/config.json` 같은 공개 프로젝트 계약은 저장소가
Devflow workflow를 채택할 때 커밋할 수 있습니다.

## 주요 명령

```powershell
devflow --help
devflow doctor --platform windows-powershell --json
devflow status --simple
devflow finish --guided
devflow prompt latest
devflow harness health
devflow mcp stdio
```

## 문서

- [Quickstart](docs/quickstart.md)
- [Release Checklist](docs/release.md)
- [Product Plan](docs/product-plan.md)
- [Architecture](docs/architecture.md)
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

현재 MVP는 npm package, CLI, MCP handler, repo-local Codex/Claude plugin draft,
hook, finish guard를 포함합니다. Hosted sync, richer artifact generation,
broader adapter coverage는 이후 작업입니다.

연구 노트, 논문 초안, 평가 fixture, 비공개 데이터는 별도 private repository에
둡니다. 이 공개 저장소에는 제품 구현과 공개 문서만 둡니다.
