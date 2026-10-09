---
type: data-storage
project: blog-writer
source:
  - blog-writer:server/store.ts:1-149
  - blog-writer:server/categories.ts:1-47
  - blog-writer:server/fsutil.ts:1-49
  - blog-writer:server/usage.ts:1-91
  - blog-writer:server/recommend.ts:13-68
  - blog-writer:server/rules.ts:1-42
  - blog-writer:server/secrets.ts:1-68
  - blog-writer:server/browser/blockedSites.ts:1-37
  - blog-writer:shared/types.ts:142-384
updated: 2026-10-09
---
# 데이터 저장

DB는 없다. 모두 프로젝트 루트의 `data/` 아래 로컬 파일이다. 루트는 실행 폴더가 아니라 `server/store.ts` 위치에서 구하고, `BLOG_WRITER_DATA_DIR`로 다른 폴더를 쓸 수 있다(테스트용) (`blog-writer:server/store.ts:9-12`). `data/`는 `.gitignore` 대상이다.

## 저장소 목록
| 무엇 | 위치 | 형식 | 쓰는 코드 | 읽는 코드 | 보관 |
|---|---|---|---|---|---|
| 작업(Job) | `data/jobs/<uuid>.json` | JSON, 작업 하나 | `createJob`, `updateJob`, `log`, `deleteJob` | `getJob`, `listJobs` | 사용자가 삭제할 때까지 |
| 생성·업로드 이미지 | `data/images/<jobId>/<thumbnail|body-n>-<timestamp>.<ext>`, 업로드는 `<target>-upload-<timestamp>.<ext>` | PNG/JPG/WEBP/GIF | `images/index.ts generateImages`, `routes/images.ts` 업로드 | `/api/images`, 블로그 입력, 워드프레스 업로드 | 작업 삭제 시 폴더째 삭제. 다시 만들거나 올리면 새 파일을 저장한 뒤 예전 파일을 지움(실패해 참조가 사라진 경우는 남음) |
| 설정 | `data/settings.json` | JSON `Settings` (블로그별 `naverBlogId`·`tistoryBlogId`·`wordpressUrl`·`wordpressCategoryId`, `images`, `models`) | `saveSettings` | `getSettings` (예전 `platform`/`blogId` 옮김) | |
| 글쓰기 규칙 수정본 | `data/writing-rules.md` | 마크다운 | `saveRules` (원자적 쓰기) | `getRules` | 초기화 시 삭제 |
| 비밀 정보 | `data/secrets.json` | JSON `{naverClientId?, naverClientSecret?, wpUsername?, wpAppPassword?, geminiApiKey?, openaiApiKey?}` 0600 (예전 `wpcomToken`·`wpcomUsername`은 워드프레스 저장·삭제 때 지움) | `saveNaverKeys`, `saveWordPressAuth`, `saveImageApiKey` (기존 내용을 읽어 자기 항목만 바꿈) | `getNaverKeys`, `getWordPressAuth`, `getImageApiKey` | 항목별 삭제 |
| 주제 추천 | `data/recommendations/<uuid>.json` | JSON `Recommendation` | `startRecommendation`(처음 파일은 바로 씀), `update`(원자적) | `listRecommendations` | 사용자가 삭제할 때까지 |
| Claude 호출 기록 | `data/usage.jsonl` | 줄마다 JSON `UsageRecord` | `recordUsage` (append) | `readRecords` | **90일** (서버 시작 시 정리) |
| 플랜 한도 | `data/plan-limits.json` | JSON `PlanLimits` (마지막 값만) | `savePlanLimits` (원자적) | `readPlan` | 덮어씀 |
| 막힌 사이트 | `data/blocked-sites.json` | JSON `{[platform]:{at,detail}}` (네이버·티스토리만 쓰임) | `markBlocked` | `isBlocked`, `getBlockedSites` | 초기화 시 삭제 |
| 카테고리 기억 | `data/categories.json` | JSON `{lists: {naver?, tistory?: {blogId, names[], fetchedAt}}, last: {[platform]: {id?, name}}}` (비밀 정보 없음). `lists`는 네이버·티스토리가 에디터에서 읽어 온 이름 목록(블로그 ID가 바뀌면 없는 것으로 봄, 워드프레스는 사이트에서 바로 읽으므로 저장 안 함), `last`는 블로그별로 마지막에 올릴 때 고른 카테고리(고르지 않고 올리면 지움). 파일이 없거나 깨지면 빈 값 | `saveCategoryList`, `saveLastCategory` (파일별 `serialQueue`, 원자적 쓰기) | `getSavedCategories`, `getLastCategory` | 덮어씀 (`server/categories.ts`) |
| 앱 전용 크롬 프로필 | `data/chrome-profile/` | 크롬 프로필 | Playwright·로그인 창 | 동일 | 계속 |
| 자동 조작 실패 화면 | `data/last-error.png` | PNG | `runWithChrome` 실패 시 | 사람이 직접 봄 | 덮어씀 |

임시 파일: `os.tmpdir()`에 `bw-js-*.js`(AppleScript로 넘길 스크립트), `bw-img-*.jpg`(줄인 이미지), `bw-alt-*/`(대체 텍스트 이름 사본)를 만들고 바로 지운다.

## 쓰기 안전장치
- **원자적 쓰기**: 공용 `writeFileAtomic`/`writeJsonAtomic`이 무작위 이름의 임시 파일에 쓰고 `rename`한다. 권한을 줄 수 있다(비밀 정보 0600) (`blog-writer:server/fsutil.ts:5-27`). 작업·설정·규칙·비밀 정보·추천 갱신·플랜 한도·사용량 정리가 이것을 쓴다.
- **직렬화**: 작업 파일·설정은 키별 줄(`keyedQueue`)로 읽기-수정-쓰기를 한 번에 처리해 로그와 상태 갱신이 서로 덮어쓰지 않는다 (`blog-writer:server/store.ts:25`, `:107-116`). 추천·사용량·비밀 정보는 파일마다 줄 하나(`serialQueue`) (`blog-writer:server/fsutil.ts:31-49`).
- **경로 제한**: job id와 이미지 파일명은 `path.basename`으로 자른다 (`blog-writer:server/store.ts:56`, `:77`, `:79`, `blog-writer:server/routes/images.ts:202-203`). 초안 JSON의 `file`은 `^(?!\.)[\w.-]+$`만 허용 (`blog-writer:server/schema.ts:16-17`).
- 예외: 막힌 사이트 파일(`blog-writer:server/browser/blockedSites.ts:28-33`)과 새 추천의 첫 파일(`blog-writer:server/recommend.ts:158`)은 원자적 쓰기가 아니다 ([[_system/known-issues]]).

## 스키마
### Job (`data/jobs/*.json`)
`id`, `topic`, `links?`, `status`(researching/writing/generating_images/draft_ready/posting/posted/scheduled/published/failed — `scheduled`·`published`는 2026-10-09부터 네이버·티스토리 예약발행·자동발행에서도 앱이 정한다), `imageOptions`(2026-10-09부터 `method?`·`thumbnailMethod?` 포함), `postingTo?`(마지막으로 올린 블로그), `generatingImages?`, `regeneratingImages?`, `imageRunsOnly?`, `createdAt`, `updatedAt`, `researchNotes?`, `rulesSnapshot?`, `sources[]`({title,url,kind?}), `post?`, `logs[]`({at,message}), `error?`, `wordpress?`(워드프레스에 올린 글: `postId`, `link`, `mode`, `scheduledAt?`, `mediaIds?` 파일 이름→`{id,url}`), `editProposal?`(2026-10-09, 프롬프트로 글 고치기 제안 → 아래 EditProposal) (`blog-writer:shared/types.ts:266-336`). 의미는 [[writing/entities/Job]].

### EditProposal (`job.editProposal`, 2026-10-09)
프롬프트로 글을 고치는 중이거나 결과를 적용하기 전인 제안. 글(`post`)은 "적용"하기 전까지 바뀌지 않는다. `prompt`(수정 요청), `range?`(`{start,end}` 고칠 블록 범위, 처음·끝 포함, 없으면 글 전체), `status`(`running`/`ready`/`failed`), `createdAt`, `error?`, `ready`일 때 `before`·`after`(범위의 원래 블록과 고친 블록, 이미지 블록은 원래 이미지 그대로), 글 전체일 때 `title?`·`summary?`, `note?`(무엇을 고쳤는지), `charsBefore?`·`charsAfter?`(본문 글자 수) (`blog-writer:shared/types.ts:284-306`). 수명: `startEdit`가 `running`으로 기록 → `ready`/`failed`, 중지하면 삭제, 적용·버리기에서 삭제, 새 초안(`doDraft`)이 오면 삭제, 서버 재시작 때 `running`이면 `failed`(`recoverStuckJobs`) (`blog-writer:server/pipeline.ts:157-203`, `blog-writer:server/store.ts:130-149`). 서버 재시작과 상관없이 `ready` 제안은 남는다.

### Post (job.post)
`title`, `summary`, `tags[]`, 리포트 필드(`searchQuestion`, `mainKeyword`, `subKeywords`, `titleCandidates`, `tagDetails`, `tagsCheckedAt`, `omittedItems`), `thumbnail?`(ImageSpec), `blocks[]`(heading/paragraph/list/quote/table/image) (`blog-writer:shared/types.ts:169-228`). 의미는 [[writing/entities/Post]], 이미지는 [[image/entities/ImageSpec]].

### Recommendation
`id`, `field`, `status`(running/done/failed), `anchorKeyword?`, `datalab`(ok/not_configured/failed/pending), `period?`, `candidates[]`, `logs[]`, `error?` (`blog-writer:shared/types.ts:368-384`). [[topic/entities/Recommendation]].

### UsageRecord (`usage.jsonl` 한 줄)
`at`, `stage`, `jobId?`, `callId?`, `model`, `input`, `output`, `cacheRead`, `cacheWrite`, `costUSD` (`blog-writer:server/usage.ts:16-29`). [[usage/entities/UsageRecord]].

### PlanLimits
`fiveHour`/`sevenDay`: `{utilization 0~1, resetsAt ISO}` 또는 null, `status`, `checkedAt` (`blog-writer:shared/types.ts:94-109`). [[usage/entities/PlanLimits]].
