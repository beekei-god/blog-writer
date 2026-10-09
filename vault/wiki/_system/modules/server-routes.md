---
type: module
project: blog-writer
module: server-routes
paths: [server/index.ts, server/app.ts, server/routes/**]
source:
  - blog-writer:server/index.ts:1-11
  - blog-writer:server/app.ts:1-43
  - blog-writer:server/routes/util.ts:1-28
  - blog-writer:server/routes/settings.ts:1-182
  - blog-writer:server/routes/browser.ts:1-121
  - blog-writer:server/routes/usage.ts:1-35
  - blog-writer:server/routes/recommendations.ts:1-42
  - blog-writer:server/routes/jobs.ts:1-220
  - blog-writer:server/routes/images.ts:1-207
  - blog-writer:server/routes/categories.ts:1-67
  - blog-writer:server/routes/edit.ts:1-68
  - blog-writer:server/routes/keywords.ts:1-25
updated: 2026-10-09
---
# server-routes 모듈

## 책임
HTTP 진입점. 서버 시작(복구·listen), 공통 처리(로컬 전용 검사, JSON 파싱, 오류 응답), 주제별 라우터에서 입력 검증 후 저장소·파이프라인 호출. 2026-10-07 리팩터링 전에는 모두 `server/index.ts` 한 파일(약 700줄)에 있었다.

## 파일
| 파일 | 줄 | 역할 | 주요 export | 관련 페이지 |
|---|---|---|---|---|
| `server/index.ts` | 11 | 서버 시작: `recoverStuckJobs` → `recoverRecommendations` → `pruneUsage` → `127.0.0.1:${PORT ?? 5172}` listen | (진입점) | [[_system/operations]] |
| `server/app.ts` | 42 | `createApp()`: 로컬 전용 검사, JSON 2MB, 라우터 9개 연결, 공통 오류 처리. 테스트도 이것으로 앱을 만든다 | `createApp` | [[_system/api]] |
| `server/routes/util.ts` | 28 | 라우터 공용: 비동기 오류 전달, 작업 전 상태를 먼저 진행 중으로(올리는 블로그 `postingTo`도 기록), 워드프레스 연결 여부 | `wrap`, `markBusy`, `wordpressStatus` | |
| `server/routes/settings.ts` | 182 | 설정(`SettingsSchema` 블로그별 형식 검사), 글쓰기 규칙, 데이터랩 키, 네이버 검색광고 키(`/api/searchad`: GET·PUT("날씨"로 확인 후 저장)·DELETE, 값은 안 돌려줌, 2026-10-09), 이미지 API 키(Gemini·OpenAI, 확인 후 저장, 값은 안 돌려줌), 워드프레스 연결 (2026-10-09에 기본 카테고리 설정 `wordpressCategoryId`와 `GET /api/wordpress/categories` 삭제) | `router` | [[publishing/entities/블로그 설정]], [[_system/integrations/wordpress-rest]], [[_system/integrations/image-api]], [[_system/integrations/naver-searchad]] |
| `server/routes/browser.ts` | 121 | Claude in Chrome 확장 확인, 막힌 블로그 목록, 로그인 창(블로그별) | `router` | [[publishing/business-rules/BR-PUB-017 로그인 창은 한 블로그씩]] |
| `server/routes/usage.ts` | 35 | 사용량 요약·한도 확인·작업별 토큰 | `router` | [[usage/flows/사용량 확인 플로우]] |
| `server/routes/recommendations.ts` | 42 | 주제 추천 시작·중지·삭제 | `router` | [[topic/flows/주제 추천 플로우]] |
| `server/routes/jobs.ts` | 220 | 글 목록·생성(참고 링크 최대 `MAX_LINKS`)·초안 저장(`keepImageResults`, 이미지 목록은 `imageSpecsOf`)·블로그 등록(2026-10-09부터 네이버·티스토리도 예약발행·자동발행 허용: 예약은 `checkSchedule`(1분 이상 뒤), 네이버는 `NAVER_MINUTE_STEP`=10분 단위)·블로그 등록에 `category`(`BlogCategorySchema`) 검사·`saveLastCategory`(2026-10-09), 수기 상태 변경(`MANUAL_TRANSITIONS`를 없애고 `MANUAL_STATUSES`·`canSetStatus`로)·중지·재시도·삭제 | `router` | [[writing/entities/Job]], [[publishing/flows/블로그 임시저장 플로우]] |
| `server/routes/images.ts` | 207 | 이미지 다시 만들기(여러 장: 작업 잠금 / 한 장: 그 이미지 기준 잠금, 다른 이미지와 동시, `method`), 직접 올리기(그 이미지 기준, 기록은 생성과 같은 `recordImageFile`), 본문 이미지 자리 추가(`POST /images`: 고른 블록 뒤에 파일 없는 이미지 블록, 최대 6장)·이미지 삭제(`DELETE /images/:target`, 파일 삭제는 글에서 뺀 뒤), `regenerate-images`에 `thumbnailMethod`(2026-10-09), 미리보기 파일(`jobImagePath`). 이미지 자리 확인은 `imageSpecAt`, 열거형은 `schema.ts`의 `ProviderEnum`·`StyleEnum`·`MethodEnum` | `router` | [[image/flows/이미지 다시 만들기 플로우]], [[image/business-rules/BR-IMG-014 한 장씩 다시 만들기 동시 실행]] |
| `server/routes/categories.ts` | 69 | (2026-10-09 새 파일) 카테고리 목록 조회(`GET /api/categories/:platform`: 워드프레스는 사이트에서 live(2026-10-09부터 설정의 기본 카테고리를 처음 값으로 쓰지 않고 마지막으로 고른 값만), 네이버·티스토리는 저장된 목록)와 불러오기(`POST …/refresh`: 네이버·티스토리만, `enqueueBrowser`로 크롬 작업 큐에 넣어 `readNaverCategories`(macOS만)/`readTistoryCategoriesWithChrome` 실행 후 `saveCategoryList`; 실패는 502에 `CategoryError.dialog` 화면 구조를 최대 3,000자 붙임) | `router` | [[_system/api]], [[_system/integrations/blog-editors]], [[_system/modules/server-browser]] |
| `server/routes/keywords.ts` | 25 | (2026-10-09 새 파일) `GET /api/keywords?q=`: `q`(trim 200자 이하, 비워도 됨) 검사 후 `exploreKeywords`. 키가 없으면 400 안내, `SearchAdError`는 400, 그 밖은 502 | `router` | [[_system/api]], [[_system/modules/server-recommend]], [[_system/integrations/naver-searchad]] |
| `server/routes/edit.ts` | 68 | (2026-10-09 새 파일) 프롬프트로 글 고치기: 시작(`POST /api/jobs/:id/edit` → `startEdit`, 202), 적용(`POST …/edit/apply` → `applyProposal`, 범위가 바뀌었으면 409), 버리기(`DELETE …/edit`, 만드는 중이면 409) | `router` | [[_system/api]], [[_system/modules/server-pipeline]] |

엔드포인트 전체 표는 [[_system/api]].

## 주요 동작
- `keepImageResults`: 화면이 보낸 초안의 이미지 `file`/`error`를 서버 값으로 덮어쓴다 (프롬프트가 같은 이미지, 없으면 개수가 같을 때 같은 순서) (`blog-writer:server/routes/jobs.ts:21-40`) → [[image/business-rules/BR-IMG-008 이미지 결과는 서버 기록 우선]].
- `markBusy`: 백그라운드 작업 전 상태를 먼저 진행 중으로 (`blog-writer:server/routes/util.ts:12-23`).
- 수기 상태 변경: 지금 상태가 `canSetStatus`(초안 검토·임시저장 완료·발행 예약·발행완료)이고 바꿀 상태가 `MANUAL_STATUSES`(초안 검토·임시저장 완료·발행완료) 중 지금과 다른 것일 때만 허용 (`blog-writer:server/routes/jobs.ts:163-190`).
- 라우터 연결 순서는 settings → browser → usage → recommendations → jobs → images → categories → edit → keywords이며, 경로가 겹치지 않아 순서에 의존하지 않는다 (`blog-writer:server/app.ts:34`).

## 의존
- 사용하는 모듈: [[_system/modules/server-core]], [[_system/modules/server-pipeline]], [[_system/modules/server-wordpress]], [[_system/modules/server-recommend]] (`explore.ts`·`searchad.ts`), [[_system/modules/server-claude]], [[_system/modules/server-browser]], [[_system/modules/shared]]
- 사용되는 곳: [[_system/modules/web-app]] (HTTP), [[_system/modules/tests]] (`createApp`)

## 주의할 점
- 진행 중 여부(`isRunning`)와 확인 중 플래그(`checkingExtension`, `checkingPlan`)는 메모리에만 있다 ([[_system/known-issues]]).
