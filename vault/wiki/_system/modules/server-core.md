---
type: module
project: blog-writer
module: server-core
paths: [server/store.ts, server/categories.ts, server/fsutil.ts, server/cancel.ts, server/rules.ts, server/secrets.ts]
source:
  - blog-writer:server/store.ts:1-149
  - blog-writer:server/categories.ts:1-47
  - blog-writer:server/fsutil.ts:1-49
  - blog-writer:server/cancel.ts:1-39
  - blog-writer:server/rules.ts:1-43
  - blog-writer:server/secrets.ts:1-113
updated: 2026-10-09
---
# server-core 모듈

## 책임
공통 기반: 로컬 파일 저장(원자적 쓰기·쓰기 줄 세우기), 작업 중지 신호, 글쓰기 규칙 파일, 비밀 정보 파일(데이터랩 키, 네이버 검색광고 키, 워드프레스 연결, 이미지 API 키). HTTP 라우터는 2026-10-07에 [[_system/modules/server-routes]]로 옮겼다.

## 파일
| 파일 | 줄 | 역할 | 주요 export | 관련 페이지 |
|---|---|---|---|---|
| `server/store.ts` | 149 | 프로젝트 루트·`data/` 경로(`BLOG_WRITER_DATA_DIR`로 바꿀 수 있음), 설정 읽기(기본값 병합, 예전 `platform`/`blogId`를 블로그별 칸으로 옮기고, 예전 `mouseSpeed`와 2026-10-09에 삭제된 `wordpressCategoryId`는 읽을 때 버림 — `blog-writer:server/store.ts:30-31`)·작업 JSON 저장, id별 쓰기 큐, 교체된 이미지 파일 삭제, 재시작 복구. `getJob`은 `readJson` 사용 | `PROJECT_ROOT`, `DATA_DIR`, `CHROME_PROFILE_DIR`, `getSettings`, `saveSettings`, `getJob`, `listJobs`, `createJob`, `updateJob`, `log`, `deleteJob`, `jobImageDir`, `jobImagePath`(2026-10-09: 이미지 폴더 안 파일 경로, 파일명은 basename으로 제한), `removeImageFile`, `recoverStuckJobs`(2026-10-09: 만드는 중이던 글 고치기 제안 `editProposal`도 `failed`+"서버가 재시작되어 글 고치기가 중단되었습니다."로) | [[_system/data-storage]], [[writing/entities/Job]], [[publishing/entities/블로그 설정]] |
| `server/categories.ts` | 47 | (2026-10-09 새 파일) 블로그 카테고리 기억 `data/categories.json`(비밀 값 없음): `lists`(네이버·티스토리가 에디터에서 읽어 온 이름 목록 `{blogId,names,fetchedAt}`, 워드프레스는 사이트에서 바로 읽으므로 저장 안 함), `last`(블로그별 마지막으로 올릴 때 고른 카테고리, 다음번 처음 값). 읽기는 `readJson`, 쓰기는 `serialQueue`+`writeJsonAtomic`. 저장된 목록은 `blogId`가 같을 때만 돌려줌 | `CategoryFile`(타입), `getSavedCategories`, `saveCategoryList`, `getLastCategory`, `saveLastCategory` | [[_system/data-storage]], [[_system/api]], [[publishing/entities/블로그 설정]] |
| `server/fsutil.ts` | 49 | 임시 파일에 쓰고 이름을 바꾸는 원자적 쓰기(권한 지정 가능), JSON 읽기(없거나 깨지면 기본값), 대기, 하나씩 실행하는 줄, 키별 줄. 2026-10-09에 파일마다 따로 있던 `sleep`·JSON 읽기를 여기로 모았다 | `writeFileAtomic`, `writeJsonAtomic`, `readJson`, `sleep`, `serialQueue`, `keyedQueue` | [[_system/data-storage]] |
| `server/cancel.ts` | 39 | 작업별 중지 신호(AbortController, 한 작업에 여러 개 가능: 이미지 한 장씩 동시 실행) + AsyncLocalStorage. `cancelJob`은 그 작업의 신호를 모두 보냄 | `withCancel`, `cancelJob`, `currentSignal`, `throwIfCancelled`, `CancelledError` | [[writing/flows/작업 중지와 재시도 플로우]], [[image/business-rules/BR-IMG-014 한 장씩 다시 만들기 동시 실행]] |
| `server/rules.ts` | 43 | 글쓰기 규칙 읽기/저장/초기화, 한국 시간 날짜(`kstDate`: YYYY-MM-DD, `usage.ts`도 사용)와 오늘 날짜(`todayKST`: YYYY.MM.DD) | `getRules`, `saveRules`, `resetRules`, `kstDate`, `todayKST` | [[writing/entities/글쓰기 규칙]] |
| `server/secrets.ts` | 113 | 비밀 정보 한 파일(`data/secrets.json`, 권한 0600): 데이터랩 키(환경변수 우선), 네이버 검색광고 키 3개(고객 ID·API 키·비밀 키, 환경변수 `SEARCHAD_*` 셋 다 있으면 우선, 2026-10-09), 워드프레스 사용자명·Application Password, 이미지 API 키 Gemini·OpenAI(환경변수 `GEMINI_API_KEY`·`OPENAI_API_KEY` 우선). 저장할 때마다 기존 내용을 읽어 자기 항목만 바꾼다(한 줄로 직렬화). 읽기는 `readJson` | `getNaverKeys`, `saveNaverKeys`, `getWordPressAuth`, `saveWordPressAuth`, `getImageApiKey`, `saveImageApiKey`, `getSearchAdKeys`, `saveSearchAdKeys`, `SearchAdKeys` | [[topic/business-rules/BR-TOP-006 데이터랩 키 확인과 우선순위]], [[_system/integrations/wordpress-rest]], [[_system/integrations/image-api]], [[_system/integrations/naver-searchad]] |

## 주요 동작
- 원자적 쓰기: 임시 파일 이름에 무작위 값을 붙여 동시에 써도 서로의 임시 파일을 덮지 않는다 (`blog-writer:server/fsutil.ts:9-15`). 작업·설정(`store.ts`), 추천, 사용량 한도·정리, 규칙, 비밀 정보가 이것을 쓴다. 막힌 블로그 목록(`blockedSites.ts`)만 아직 바로 쓴다.
- 작업 파일은 id별 줄(`keyedQueue`)로, 비밀 정보·추천·사용량은 파일별 한 줄(`serialQueue`)로 읽기-수정-쓰기를 직렬화한다 (`blog-writer:server/store.ts:25`, `blog-writer:server/secrets.ts:31-36`).
- 예전 설정 옮기기: `platform`+`blogId`를 그 블로그 칸이 비었을 때만 옮긴다. 워드프레스였는데 값이 주소가 아니라 단순 ID면 네이버 ID로 본다 (`blog-writer:server/store.ts:27-50`).
- 서버 시작 시 복구: 진행 중으로 남은 작업은 초안이 있으면 초안 검토(`draft_ready`), 없으면 실패로. 글 고치기 제안이 `running`이면 그 제안만 `failed`로 둔다(글은 그대로) (`blog-writer:server/store.ts:130-149`). 시작 순서는 [[_system/modules/server-routes]].

## 의존
- 사용하는 모듈: [[_system/modules/shared]]
- 사용되는 곳: [[_system/modules/server-routes]] (`routes/categories.ts`·`routes/jobs.ts`가 `categories.ts` 사용), 그리고 거의 모든 서버 모듈이 `store.ts`를 쓴다

## 주의할 점
- `data/`와 기본 규칙 파일 경로는 2026-10-07부터 실행 폴더가 아니라 `store.ts` 위치 기준(`PROJECT_ROOT`)이다 (`blog-writer:server/store.ts:9-12`).
- 진행 중 여부는 메모리에만 있다 ([[_system/known-issues]]).
