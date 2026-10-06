---
type: implementation
domain: usage
project: blog-writer
paths: [server/claude.ts, server/usage.ts, server/routes/usage.ts, server/index.ts, shared/types.ts, src/Usage.tsx, src/labels.ts, src/SettingsPanel.tsx, src/App.tsx, src/job/JobUsage.tsx]
last_ingested_commit: 스냅샷 2026-10-07 (git 없음)
updated: 2026-10-07
---
# blog-writer의 usage 구현

## 파일과 역할
| 파일 | 함수/컴포넌트 | 구현하는 규칙/엔티티 |
|---|---|---|
| `shared/types.ts` | `STAGES`·`UsageStage`(55-58), `MODEL_CHOICES`(61-63), `RECOMMENDED_MODELS`(66-72), `PlanWindow`·`PlanLimits`(74-88), `TokenTotals`(90-98), `UsageSummary`(100-116) | BR-USG-001, [[usage/entities/PlanLimits]] |
| `server/claude.ts` | `modelFor`(32-37), `toWindow`(49-52), 이벤트 처리(137-146), 기록(166-181) | BR-USG-002, 006 |
| `server/usage.ts` | `UsageRecord`(15-27), `setDefaultModel`(30-33), `recordUsage`(37-43), `savePlanLimits`(45-47), `pruneUsage`(76-83), `getJobUsage`(85-94), `add`(104-117), `kstWeekStart`(120-125), `getUsageSummary`(127-168) | BR-USG-003, 004 |
| `server/fsutil.ts` | `serialQueue`(기록·한도·정리를 하나씩), `writeJsonAtomic`·`writeFileAtomic` | [[_system/modules/server-core]] |
| `server/routes/usage.ts` | `GET /api/usage`(9), `POST /api/usage/check`(11-33), `GET /api/jobs/:id/usage`(35) | [[usage/flows/사용량 확인 플로우]] |
| `server/routes/settings.ts` | 설정 저장 시 단계별 모델 enum 검사(24) | BR-USG-001 |
| `server/index.ts` | 서버 시작 시 `pruneUsage`(10) | BR-USG-003 |
| `src/labels.ts` | `STAGE_LABEL`·`STAGE_HINT`(26-41), `MODEL_REASON`(44-50), `MODEL_CHOICE_LABEL`(53-58), `prettyModel`(61-66), `fmtTokens`·`totalTokens`·`fmtUSD`(69-71), `resetText`(81-87) | BR-USG-001, 005 |
| `src/Usage.tsx` | `Usage`(23-171), `Meter`(173-201), `Tile`(203-214), `DailyBars`(224-316) | BR-USG-004, 005 |
| `src/SettingsPanel.tsx` | "Claude 모델 설정" 카드(291-345, 이 카드의 저장 버튼은 모델 설정만 저장) | BR-USG-001 |
| `src/App.tsx` | 사용량 폴링(75-82), `PlanPct`(229-237) | BR-USG-005 |
| `src/job/JobUsage.tsx` | `JobUsage`(7-29) | 작업별 사용량 |

API 라우터 구성은 [[_system/modules/server-routes]], 작업 화면 구성은 [[_system/modules/web-job]] 참고.

## 다른 도메인과의 접점
- 모든 Claude 호출이 단계를 갖는다: research·writing → [[writing/overview]], images·browser(이미지) → [[image/overview]], browser(블로그) → [[publishing/overview]], recommend → [[topic/overview]].
