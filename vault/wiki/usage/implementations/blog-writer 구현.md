---
type: implementation
domain: usage
project: blog-writer
paths: [server/claude.ts, server/usage.ts, server/claudeAuth.ts, server/cancel.ts, server/routes/usage.ts, server/routes/claudeAuth.ts]
last_ingested_commit: 73f47a6
updated: 2026-11-02
---
# blog-writer의 usage 구현

## 파일과 역할
| 파일 | 함수/컴포넌트 | 구현하는 규칙/엔티티 |
|---|---|---|
| `server/claude.ts` | `runClaude`, `modelFor`, `ClaudeOptions` | [[usage/business-rules/BR-USG-001 단계별 모델 선택]], [[usage/business-rules/BR-USG-002 Claude 호출 방식]] |
| `server/usage.ts` | `recordUsage`, `getUsageSummary`, `getJobUsage`, `pruneUsage`, `savePlanLimits` | BR-USG-003/004/005 |
| `server/claudeAuth.ts`, `server/routes/claudeAuth.ts` | 로그인 상태·시작·취소·로그아웃 | [[usage/business-rules/BR-USG-006 Claude 로그인 관리]] |
| `server/routes/usage.ts` | `/api/usage`, `/api/usage/check`, `/api/jobs/:id/usage` | BR-USG-004/005 |
| `server/cancel.ts` | `withCancel`, `cancelJob`, `throwIfCancelled` | BR-USG-002 |
| `shared/types.ts` | `STAGES`, `MODEL_CHOICES`, `RECOMMENDED_MODELS`, `PlanLimits`, `UsageSummary` | BR-USG-001 |

## 테스트
| 테스트 파일 | 확인하는 것 | 규칙 |
|---|---|---|
| `tests/claudeAuth.test.ts` | 로그인 상태·시작·취소 | BR-USG-006 |
| `tests/imageParallel.test.ts` | 중지 전파 | BR-USG-002 |
| `tests/usageSummary.test.ts` | 한국 시간 기준 오늘·주·7일 집계, 호출 수 중복 제거, 정렬 | BR-USG-005 |
| `tests/claude.test.ts` | 모델 결정, 결과·오류, 시간 초과, 사용량 기록(가짜 CLI) | BR-USG-001/002/003 |
