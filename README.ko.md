# Devflow Native

[English README](README.md)

Devflow Native는 Claude Code, Codex 같은 AI 코딩 에이전트가 작업하는
과정을 로컬 저장소 안에서 기록하고, 검증하고, 다음 세션으로 넘겨주는
workflow continuity 도구입니다.

에이전트 자체가 아닙니다. 코드는 Codex, Claude Code, shell session, 사람
리뷰어가 작성합니다. Devflow는 그 주변의 작업 상태, 검증 근거, 리뷰 상태,
다음 세션 프롬프트를 잃어버리지 않게 유지합니다.

## 빠른 설치

```powershell
npm install -g devflow-native
devflow --help
devflow --version
```

## 추천 사용 방식

사용자가 직접 MCP, 플러그인, hook 설정을 하나씩 따라 치는 제품이
아닙니다. Devflow는 이미 쓰는 Codex나 Claude Code에게 설치와 점검을
맡기는 흐름을 우선합니다.

설치하려는 저장소에서 Codex 또는 Claude Code를 열고 아래 프롬프트를
붙여넣으세요.

```text
Install Devflow Native for this repository.

Use the published npm package `devflow-native` when possible. Do not replace
existing project instructions. Inspect the current repo first, install only the
missing Devflow harness pieces, configure MCP/plugin/hook integration when the
host supports it, verify the result, and tell me exactly whether I need to
restart Codex or Claude Code.

Expected verification:
- `devflow --help` works.
- `devflow doctor` and `devflow status` work for this repo.
- `devflow harness health` is ok, or the remaining host limitation is explicit.
- Existing AGENTS.md, CLAUDE.md, README, tests, and project rules are preserved.
```

## 직접 확인할 때

```powershell
devflow doctor --platform windows-powershell --json
devflow status --simple
devflow harness inspect --json
devflow harness plan --json
devflow harness install --confirm --json
devflow harness health
```

## Devflow가 하는 일

- 현재 작업, agent/manual session, gate evidence, risk, handoff를 로컬에 기록
- Codex와 Claude Code용 repo-local plugin/hook/MCP harness를 설치 및 점검
- `continue`, `next`, `finish`, `review` 같은 짧은 지시를 다음 작업 흐름으로 연결
- 검증 없는 완료 선언을 막기 위해 gate evidence와 review evidence를 확인
- 다음 세션이 바로 이어받을 수 있는 handoff prompt를 유지

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

## 주요 명령

```powershell
devflow --help
devflow doctor --platform windows-powershell --json
devflow status --simple
devflow finish --guided
devflow prompt latest
devflow harness health
npm run mcp:stdio
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
plugins/devflow   repo-local Codex and Claude Code plugin drafts
docs              product, architecture, roadmap, examples, and public notes
.devflow          dogfood project contract; runtime state is gitignored
```

## 현재 상태

현재 MVP는 npm package, CLI, MCP handler, repo-local Codex/Claude plugin draft,
hook, finish guard를 포함합니다. Hosted sync, richer artifact generation,
broader adapter coverage는 이후 작업입니다.

연구 노트, 논문 초안, 평가 fixture, 비공개 데이터는 별도 private repository에
둡니다. 이 공개 저장소에는 제품 구현과 공개 문서만 둡니다.
