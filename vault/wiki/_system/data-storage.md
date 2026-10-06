---
type: data-storage
project: blog-writer
source:
  - blog-writer:server/store.ts:1-146
  - blog-writer:server/fsutil.ts:1-38
  - blog-writer:server/usage.ts:1-96
  - blog-writer:server/recommend.ts:13-68
  - blog-writer:server/rules.ts:1-39
  - blog-writer:server/secrets.ts:1-71
  - blog-writer:server/browser/blockedSites.ts:1-37
  - blog-writer:shared/types.ts:122-320
updated: 2026-10-07
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
| 비밀 정보 | `data/secrets.json` | JSON `{naverClientId?, naverClientSecret?, wpUsername?, wpAppPassword?}` 0600 (예전 `wpcomToken`·`wpcomUsername`은 워드프레스 저장·삭제 때 지움) | `saveNaverKeys`, `saveWordPressAuth` (기존 내용을 읽어 자기 항목만 바꿈) | `getNaverKeys`, `getWordPressAuth` | 항목별 삭제 |
| 주제 추천 | `data/recommendations/<uuid>.json` | JSON `Recommendation` | `startRecommendation`(처음 파일은 바로 씀), `update`(원자적) | `listRecommendations` | 사용자가 삭제할 때까지 |
| Claude 호출 기록 | `data/usage.jsonl` | 줄마다 JSON `UsageRecord` | `recordUsage` (append) | `readRecords` | **90일** (서버 시작 시 정리) |
| 플랜 한도 | `data/plan-limits.json` | JSON `PlanLimits` (마지막 값만) | `savePlanLimits` (원자적) | `readPlan` | 덮어씀 |
| 막힌 사이트 | `data/blocked-sites.json` | JSON `{[platform]:{at,detail}}` (네이버·티스토리만 쓰임) | `markBlocked` | `isBlocked`, `getBlockedSites` | 초기화 시 삭제 |
| 앱 전용 크롬 프로필 | `data/chrome-profile/` | 크롬 프로필 | Playwright·로그인 창 | 동일 | 계속 |
| 자동 조작 실패 화면 | `data/last-error.png` | PNG | `runWithChrome` 실패 시 | 사람이 직접 봄 | 덮어씀 |

임시 파일: `os.tmpdir()`에 `bw-js-*.js`(AppleScript로 넘길 스크립트), `bw-img-*.jpg`(줄인 이미지), `bw-alt-*/`(대체 텍스트 이름 사본)를 만들고 바로 지운다.

## 쓰기 안전장치
- **원자적 쓰기**: 공용 `writeFileAtomic`/`writeJsonAtomic`이 무작위 이름의 임시 파일에 쓰고 `rename`한다. 권한을 줄 수 있다(비밀 정보 0600) (`blog-writer:server/fsutil.ts:5-18`). 작업·설정·규칙·비밀 정보·추천 갱신·플랜 한도·사용량 정리가 이것을 쓴다.
- **직렬화**: 작업 파일·설정은 키별 줄(`keyedQueue`)로 읽기-수정-쓰기를 한 번에 처리해 로그와 상태 갱신이 서로 덮어쓰지 않는다 (`blog-writer:server/store.ts:25`, `:111-120`). 추천·사용량·비밀 정보는 파일마다 줄 하나(`serialQueue`) (`blog-writer:server/fsutil.ts:20-38`).
- **경로 제한**: job id와 이미지 파일명은 `path.basename`으로 자른다 (`blog-writer:server/store.ts:56`, `:83`, `:87`, `blog-writer:server/routes/images.ts:142`). 초안 JSON의 `file`은 `^(?!\.)[\w.-]+$`만 허용 (`blog-writer:server/schema.ts:12-13`).
- 예외: 막힌 사이트 파일(`blog-writer:server/browser/blockedSites.ts:28-33`)과 새 추천의 첫 파일(`blog-writer:server/recommend.ts:158`)은 원자적 쓰기가 아니다 ([[_system/known-issues]]).

## 스키마
### Job (`data/jobs/*.json`)
`id`, `topic`, `links?`, `status`(researching/writing/generating_images/draft_ready/posting/posted/scheduled/published/failed), `imageOptions`, `generatingImages?`, `regeneratingImages?`, `createdAt`, `updatedAt`, `researchNotes?`, `rulesSnapshot?`, `sources[]`({title,url,kind?}), `post?`, `logs[]`({at,message}), `error?`, `wordpress?`(워드프레스에 올린 글: `postId`, `link`, `mode`, `scheduledAt?`, `mediaIds?` 파일 이름→`{id,url}`) (`blog-writer:shared/types.ts:235-272`). 의미는 [[writing/entities/Job]].

### Post (job.post)
`title`, `summary`, `tags[]`, 리포트 필드(`searchQuestion`, `mainKeyword`, `subKeywords`, `titleCandidates`, `tagDetails`, `tagsCheckedAt`, `omittedItems`), `thumbnail?`(ImageSpec), `blocks[]`(heading/paragraph/list/quote/table/image) (`blog-writer:shared/types.ts:149-208`). 의미는 [[writing/entities/Post]], 이미지는 [[image/entities/ImageSpec]].

### Recommendation
`id`, `field`, `status`(running/done/failed), `anchorKeyword?`, `datalab`(ok/not_configured/failed/pending), `period?`, `candidates[]`, `logs[]`, `error?` (`blog-writer:shared/types.ts:304-320`). [[topic/entities/Recommendation]].

### UsageRecord (`usage.jsonl` 한 줄)
`at`, `stage`, `jobId?`, `callId?`, `model`, `input`, `output`, `cacheRead`, `cacheWrite`, `costUSD` (`blog-writer:server/usage.ts:15-28`). [[usage/entities/UsageRecord]].

### PlanLimits
`fiveHour`/`sevenDay`: `{utilization 0~1, resetsAt ISO}` 또는 null, `status`, `checkedAt` (`blog-writer:shared/types.ts:74-89`). [[usage/entities/PlanLimits]].
