---
type: module
project: blog-writer
module: server-claude
paths: [server/claude.ts, server/usage.ts]
source:
  - blog-writer:server/claude.ts:1-198
  - blog-writer:server/usage.ts:1-162
updated: 2026-10-09
---
# server-claude 모듈

## 책임
로컬 `claude -p` CLI를 자식 프로세스로 실행해 구조화된(JSON 스키마) 결과를 받는 단일 통로, 그리고 그 호출의 토큰·플랜 한도 기록과 집계.

## 파일
| 파일 | 줄 | 역할 | 주요 export | 관련 페이지 |
|---|---|---|---|---|
| `server/claude.ts` | 198 | CLI 인자 구성(도구 허용, MCP 끄기, `--chrome`, `--json-schema`, 모델), stream-json 이벤트 파싱, 중지·타임아웃, 확장 연결·사이트 차단 감지, 사용량 기록 | `runClaude`, `ClaudeOptions` | [[_system/integrations/claude-cli]], [[usage/business-rules/BR-USG-002 모델 결정 순서]] |
| `server/usage.ts` | 162 | `usage.jsonl` 추가·90일 정리(원자적 다시 쓰기), 플랜 한도 저장, 오늘/이번 주/7일/모델별/단계별 집계, 작업별 집계. 날짜는 `rules.ts`의 `kstDate`, 한도 파일 읽기는 `readJson` | `recordUsage`, `savePlanLimits`, `setDefaultModel`, `pruneUsage`, `getUsageSummary`, `getJobUsage` | [[usage/overview]] |

## 의존
- 사용하는 모듈: [[_system/modules/server-core]] (`getSettings`, `DATA_DIR`, `currentSignal`), [[_system/modules/server-browser]] (`claudeChrome.ts`의 오류 클래스·문구 정규식)
- 사용되는 곳: research, writer, recommend, images(plan·svg·webAi), browser(blogPost), routes(확장 연결 확인 `routes/browser.ts`, 한도 확인 `routes/usage.ts`)

## 주의할 점
- CLI는 `cwd: os.tmpdir()`로 실행해 다른 프로젝트의 CLAUDE.md가 섞이지 않게 한다 (`blog-writer:server/claude.ts:55-57`, `:80`).
- 프롬프트는 stdin, 시스템 프롬프트는 `--append-system-prompt` 인자로 넘긴다.
