---
type: module
project: blog-writer
module: server-routes
paths: [server/index.ts, server/app.ts, server/routes/**]
source:
  - blog-writer:server/index.ts:1-11
  - blog-writer:server/app.ts:1-40
  - blog-writer:server/routes/util.ts:1-28
  - blog-writer:server/routes/settings.ts:1-125
  - blog-writer:server/routes/browser.ts:1-121
  - blog-writer:server/routes/usage.ts:1-35
  - blog-writer:server/routes/recommendations.ts:1-42
  - blog-writer:server/routes/jobs.ts:1-207
  - blog-writer:server/routes/images.ts:1-146
updated: 2026-10-07
---
# server-routes 모듈

## 책임
HTTP 진입점. 서버 시작(복구·listen), 공통 처리(로컬 전용 검사, JSON 파싱, 오류 응답), 주제별 라우터에서 입력 검증 후 저장소·파이프라인 호출. 2026-10-07 리팩터링 전에는 모두 `server/index.ts` 한 파일(약 700줄)에 있었다.

## 파일
| 파일 | 줄 | 역할 | 주요 export | 관련 페이지 |
|---|---|---|---|---|
| `server/index.ts` | 11 | 서버 시작: `recoverStuckJobs` → `recoverRecommendations` → `pruneUsage` → `127.0.0.1:${PORT ?? 3001}` listen | (진입점) | [[_system/operations]] |
| `server/app.ts` | 40 | `createApp()`: 로컬 전용 검사, JSON 2MB, 라우터 6개 연결, 공통 오류 처리. 테스트도 이것으로 앱을 만든다 | `createApp` | [[_system/api]] |
| `server/routes/util.ts` | 28 | 라우터 공용: 비동기 오류 전달, 작업 전 상태를 먼저 진행 중으로(올리는 블로그 `postingTo`도 기록), 워드프레스 연결 여부 | `wrap`, `markBusy`, `wordpressStatus` | |
| `server/routes/settings.ts` | 125 | 설정(`SettingsSchema` 블로그별 형식 검사), 글쓰기 규칙, 데이터랩 키, 워드프레스 연결·카테고리 | `router` | [[publishing/entities/블로그 설정]], [[_system/integrations/wordpress-rest]] |
| `server/routes/browser.ts` | 121 | Claude in Chrome 확장 확인, 막힌 블로그 목록, 로그인 창(블로그별) | `router` | [[publishing/business-rules/BR-PUB-017 로그인 창은 한 블로그씩]] |
| `server/routes/usage.ts` | 35 | 사용량 요약·한도 확인·작업별 토큰 | `router` | [[usage/flows/사용량 확인 플로우]] |
| `server/routes/recommendations.ts` | 42 | 주제 추천 시작·중지·삭제 | `router` | [[topic/flows/주제 추천 플로우]] |
| `server/routes/jobs.ts` | 207 | 글 목록·생성·초안 저장(`keepImageResults`)·블로그 등록·수기 상태 변경(`MANUAL_TRANSITIONS`)·중지·재시도·삭제 | `router` | [[writing/entities/Job]], [[publishing/flows/블로그 임시저장 플로우]] |
| `server/routes/images.ts` | 146 | 이미지 다시 만들기(여러 장/한 장), 직접 올리기, 미리보기 파일 | `router` | [[image/flows/이미지 다시 만들기 플로우]] |

엔드포인트 전체 표는 [[_system/api]].

## 주요 동작
- `keepImageResults`: 화면이 보낸 초안의 이미지 `file`/`error`를 서버 값으로 덮어쓴다 (프롬프트가 같은 이미지, 없으면 개수가 같을 때 같은 순서) (`blog-writer:server/routes/jobs.ts:17-39`) → [[image/business-rules/BR-IMG-008 이미지 결과는 서버 기록 우선]].
- `markBusy`: 백그라운드 작업 전 상태를 먼저 진행 중으로 (`blog-writer:server/routes/util.ts:12-23`).
- 라우터 연결 순서는 settings → browser → usage → recommendations → jobs → images이며, 경로가 겹치지 않아 순서에 의존하지 않는다 (`blog-writer:server/app.ts:31`).

## 의존
- 사용하는 모듈: [[_system/modules/server-core]], [[_system/modules/server-pipeline]], [[_system/modules/server-wordpress]], [[_system/modules/server-recommend]], [[_system/modules/server-claude]], [[_system/modules/server-browser]], [[_system/modules/shared]]
- 사용되는 곳: [[_system/modules/web-app]] (HTTP), [[_system/modules/tests]] (`createApp`)

## 주의할 점
- 진행 중 여부(`isRunning`)와 확인 중 플래그(`checkingExtension`, `checkingPlan`)는 메모리에만 있다 ([[_system/known-issues]]).
