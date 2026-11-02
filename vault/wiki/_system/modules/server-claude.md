---
type: module
project: blog-writer
module: server-claude
paths: [server/claude.ts, server/usage.ts, server/claudeAuth.ts]
source:
  - blog-writer:server/claude.ts
  - blog-writer:server/usage.ts
  - blog-writer:server/claudeAuth.ts
updated: 2026-11-02
---
# server-claude (Claude 호출·사용량·로그인)

## 역할
`claude` CLI 호출 한 곳, 사용량 기록·집계, 로그인 관리 → [[usage/implementations/blog-writer 구현]]

## 주요 파일과 export
- `claude.ts`: `runClaude(opts)`, `ClaudeOptions`
- `usage.ts`: `recordUsage`, `getUsageSummary`, `getJobUsage`, `pruneUsage`, `savePlanLimits`, `clearPlanLimits`, `setDefaultModel`
- `claudeAuth.ts`: `getClaudeAuthStatus`, `startClaudeLogin`, `cancelClaudeLogin`, `claudeLogout`

## 의존하는 모듈 / 쓰이는 곳
거의 모든 서버 모듈이 `runClaude`를 쓴다. `browser/claudeChrome.ts`의 오류 클래스를 던진다.

## 주의할 점
- 새 호출은 반드시 `stage`를 지정한다(모델 선택과 사용량 기록이 stage로 정해진다) → [[usage/business-rules/BR-USG-001 단계별 모델 선택]]
- 결과는 JSON 스키마 구조화 출력만 받는다. 스키마와 zod 검사를 둘 다 맞춰야 한다.
