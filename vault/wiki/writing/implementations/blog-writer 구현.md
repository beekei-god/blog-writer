---
type: implementation
domain: writing
project: blog-writer
paths: [server/pipeline.ts, server/research.ts, server/writer.ts, server/titles.ts, server/schema.ts, server/naver.ts, server/rules.ts, server/store.ts, server/fsutil.ts, server/cancel.ts, server/routes/jobs.ts, server/routes/settings.ts, server/routes/edit.ts, server/routes/images.ts, server/editPost.ts, shared/blockDiff.ts, shared/blogStatus.ts, src/job/EditByPrompt.tsx, server/routes/util.ts, shared/length.ts, shared/types.ts, shared/labels.ts, rules/default-writing-rules.md, src/NewJob.tsx, src/WritingPicker.tsx, src/App.tsx, src/job/JobDetail.tsx, src/job/Progress.tsx, src/job/Preview.tsx, src/job/Report.tsx, src/job/PostEditor.tsx, src/job/TitlePicker.tsx, src/job/NextStep.tsx, src/RulesEditor.tsx, tests/writer.test.ts, tests/shared.test.ts, tests/api.test.ts, tests/store.test.ts, tests/editPost.test.ts, tests/writingOptions.test.ts, tests/titles.test.ts, tests/wordpress.test.ts]
last_ingested_commit: afc7c10
updated: 2026-10-10
---
# blog-writer의 writing 구현

괄호 안 숫자는 2026-10-10(커밋 afc7c10) 기준 줄 번호다.

## 파일과 역할
| 파일 | 함수/컴포넌트 | 구현하는 규칙/엔티티 |
|---|---|---|
| `shared/types.ts` | `MAX_LINKS`(25), `WritingTone`·`WRITING_TONES`·`WritingOptions`(58-67), `Settings`(153-163, `writing` 기억값), `PostBlock`(200-207), `TAG_SOURCES`·`TagDetail`(210-218), `MAX_TAGS`(220), `Post`(222-239), `imageSpecAt`·`imageSpecsOf`(242-252), `Source`(254-258), `JobStatus`(260-261, 진행 상태 6종), `BlogStatus`·`BlogState`·`BlogStates`·`PLATFORMS`(263-277), `PublishMode`(280), `WordPressRecord`(283-291), `BUSY_STATUSES`(293), `MANUAL_STATUSES`(295-297, none·posted·published), `EditProposal`(330-353, `writing` 포함), `Job`(355-388, `writingOptions`·`blogs`) | [[writing/entities/Job]], [[writing/entities/Post]], [[writing/business-rules/BR-WRT-004 태그 최대 30개]], [[writing/business-rules/BR-WRT-010 주제와 참고 링크 입력 검증]], [[writing/business-rules/BR-WRT-019 본문 말투 선택]] |
| `shared/labels.ts` | `STATUS_LABEL`(4-11, 진행 상태 6종), `BLOG_STATUS_LABEL`(14), `MANUAL_STATUS_LABEL`(16), `statusLabel`(19), `blogStatusText`(25, "네이버 발행완료"), `PUBLISH_MODE_LABEL`(28), `TONE_LABEL`·`TONE_HINT`(31-37), `errorText`(39) | [[writing/entities/Job]], [[writing/business-rules/BR-WRT-019 본문 말투 선택]] |
| `shared/length.ts` | `DEFAULT_TARGET_CHARS`·`MIN/MAX_TARGET_CHARS`·`LENGTH_PRESETS`(3-12), `maxBodyChars`(16, 목표 × 1.2), `targetRange`(18, ±10%), `targetCharsOf`(19), `countBodyChars`(29-48) | [[writing/business-rules/BR-WRT-001 본문 분량 상한]], [[writing/business-rules/BR-WRT-002 본문 글자수 계산]] |
| `shared/blogStatus.ts` | `blogPositionOf`(6-9), `furthestBlogStatus`(13-17), `StatusFilter`·`BlogFilter`(20-22), `matchesFilter`(36-43) — 블로그별 상태로 목록 거르기·진행 단계 | [[writing/flows/내 글 목록 상태 필터 플로우]], [[writing/entities/Job]] |
| `server/routes/jobs.ts` | `keepImageResults`(28-43), `GET/POST /api/jobs`(45-82, 분량·말투 검사와 기억), `GET /:id`(84-91), `PUT /post`(94-108), `POST /titles`(110-123, 제목 후보 다시 만들기), `POST /post-to-blog`(125-185), `PUT /blogs/:platform/status`(186-215, 블로그별 수기 상태), `/cancel`(217-224), `/retry`(226-236), `DELETE`(238-245) | [[writing/entities/Job]], [[writing/business-rules/BR-WRT-010 주제와 참고 링크 입력 검증]], [[writing/business-rules/BR-WRT-011 작업 중복 실행과 진행 중 변경 금지]], [[writing/business-rules/BR-WRT-013 제목 후보와 키워드]] |
| `server/editPost.ts` | `EDIT_PROMPT_MAX`(13), `SYSTEM`(74-95, 작업의 상한), `rewriteSection`(97-109, 분량·말투 다시 쓰기), `EditInput`(110-123, `writing`·`rewrite`), `proposeEdit`(128-215), `applyProposal`(220-232) | [[writing/business-rules/BR-WRT-016 프롬프트로 글 고치기]], [[writing/business-rules/BR-WRT-017 고친 결과 적용 조건과 잠금]], [[writing/business-rules/BR-WRT-018 고칠 때 이미지는 그대로]] |
| `server/routes/edit.ts` | `POST /edit`(12-38, `writing`이 있으면 요청 생략 가능·범위 금지), `POST /edit/apply`(41-63, 다시 쓰기면 `writingOptions` 바꿈), `DELETE /edit`(66-76) | BR-WRT-016, 017 |
| `server/titles.ts` | `TITLE_COUNT`·`BODY_LIMIT`(6-8), `regenerateTitles`(16-57) | [[writing/business-rules/BR-WRT-013 제목 후보와 키워드]] |
| `shared/blockDiff.ts` | `blockText`, `diffBlocks`, `collapseSame` — 고치기 전·후 비교, 제목 다시 만들기의 본문 텍스트 | [[writing/flows/프롬프트로 글 고치기 플로우]] |
| `src/job/EditByPrompt.tsx` | `rangeLabel`(9-13), `writingLabel`(16), `rangeOf`(19), `EditByPrompt`(25-195): 요청 입력, 분량·말투 다시 쓰기 상자(104-115), 만드는 중 표시·중지, 비교, 상한 경고(175-177), 적용/다시 만들기(`restore`)/버리기 | BR-WRT-016, 017, 018, 001 |
| `server/routes/settings.ts` | 설정 저장 때 `writing` 유지(18-50), 글쓰기 규칙 `GET/PUT /api/rules`, `POST /api/rules/reset`(53-63) | [[writing/business-rules/BR-WRT-009 글쓰기 규칙 적용 시점]], [[writing/business-rules/BR-WRT-001 본문 분량 상한]] |
| `server/routes/util.ts` | `wrap`(7-10), `markBusy`(16-22) | [[writing/entities/Job]] |
| `server/pipeline.ts` | `running`(25), `setBlogStatus`(30-33, 그 블로그만 바꾸고 글은 draft_ready), `requireDraft`(39-43, 초안 없으면 "작성된 초안이 없습니다."), `failStep`(46-53, 실패·중지 공용 처리), `imageRuns`·`isRunning`·`isImageBusy`(56-66), `runDraft`·`doDraft`(69-158, 분량·말투 로그와 전달 120-136), `EditOpts`·`startEdit`·`doEdit`(160-218, 다시 쓰기면 조사 자료 전달), `runImages`·`runImage`·`imagesStep`(223-286), `makeImages`(288-317), `runPost`(390-413), `doWordPressPost`(416-444), `doPost`(450-514) | [[writing/flows/초안 작성 플로우]], [[writing/business-rules/BR-WRT-012 중단 시 작업 상태 복구]] |
| `server/research.ts` | `SYSTEM`(5-23), `deepResearch`(62-88) | [[writing/business-rules/BR-WRT-014 리서치 출처 등급과 열람 제한]], [[writing/business-rules/BR-WRT-003 확인된 사실만 사용]] |
| `server/writer.ts` | `TONE_GUIDE`(7-15), `toneSection`(18-19), `BASE_SYSTEM`(21-53, 목표 분량·말투), `writePost`(131-199, 짧을 때 로그 173-180), `ParsedPostSchema`·`systemFor`(203-205, 처음 작성과 줄여 쓰기가 같은 시스템 프롬프트·스키마를 씀), `stripUpdateLines`(208-211), `enforceLength`(213-245, 상한 = 목표 × 1.2), `verifyTagSources`(253-282), `dedupeTags`(284-289), `isCompleteTable`(292-296), `enforceImageOptions`(299-306) | BR-WRT-001, 003, 004, 005, 006, 007, 008, 013, 019 |
| `server/schema.ts` | `PostSchema`(24-46), `WritingOptionsSchema`(71-74), `POST_JSON_SCHEMA`(94-170) | [[writing/entities/Post]], BR-WRT-001, 019 |
| `server/naver.ts` | `expandQueries`(25-30), `collectAutocomplete`(33-37, 내부 전용), `naverRelated`(47-70, 내부 전용), `collectNaverSuggestions`(80-89) | [[writing/business-rules/BR-WRT-015 네이버 검색어 제안 수집 범위]] |
| `server/rules.ts` | `RULES_FILE`·`DEFAULT_FILE`(11-12), `getRules`(20-27), `saveRules`(29-32), `resetRules`(34-37), `kstDate`(40, 한국 날짜 YYYY-MM-DD, 사용량 집계도 씀), `todayKST`(43) | [[writing/business-rules/BR-WRT-009 글쓰기 규칙 적용 시점]] |
| `server/store.ts` | `DATA_DIR`(13), `DEFAULT_SETTINGS`(20-24, `writing` 기본 2,500·정보형), `getSettings`(29-53), `migrateJob`(60-75, 예전 상태 → 블로그별), `getJob`(77-80), `listJobs`(82-97), `createJob`(107-128, `writingOptions`), `updateJob`(131-140), `log`(142-147), `deleteJob`(149-152), `recoverStuckJobs`(155-173, 글 고치기 running 제안 → failed 포함) | [[writing/entities/Job]], [[writing/business-rules/BR-WRT-012 중단 시 작업 상태 복구]] |
| `server/fsutil.ts` | `writeFileAtomic`(9-15), `readJson`(18-24, 없으면 기본값), `writeJsonAtomic`(26-27), `sleep`(29), `serialQueue`(32-39), `keyedQueue`(42-49) — 작업 파일·규칙 파일의 원자적 쓰기와 id별 직렬화 | [[writing/entities/Job]], [[writing/entities/글쓰기 규칙]] |
| `server/cancel.ts` | `withCancel`(작업마다 여러 신호), `cancelJob`(모두 중지), `throwIfCancelled`, `CancelledError` (1-39) | [[writing/flows/작업 중지와 재시도 플로우]] |
| `rules/default-writing-rules.md` | 1~6장 (1-79). 3장 분량 문장(18) | [[writing/entities/글쓰기 규칙]] |
| `src/NewJob.tsx` | `isHttpUrl`·`linkProblem`(29-44, `MAX_LINKS`는 `shared/types.ts`), `NewJob`(46-243, 분량·말투 기억값 불러오기 75, 검사 100-108, 카드 167) | [[writing/business-rules/BR-WRT-010 주제와 참고 링크 입력 검증]], [[writing/business-rules/BR-WRT-001 본문 분량 상한]] |
| `src/WritingPicker.tsx` | `WritingDraft`·`draftOf`(6-11), `parseWriting`(14-19, 서버와 같은 범위 검사), `WritingPicker`(22-81, 분량 프리셋·직접 입력, 말투 4개) — 새 글 폼과 다시 쓰기가 함께 씀 | [[writing/business-rules/BR-WRT-001 본문 분량 상한]], [[writing/business-rules/BR-WRT-019 본문 말투 선택]] |
| `src/App.tsx` | `FILTERS`·`BLOG_FILTERS`(27-35), 블로그·상태 칩과 목록·배지(132-185), 1.5초 폴링(90) | [[writing/flows/내 글 목록 상태 필터 플로우]] |
| `src/job/JobDetail.tsx` | 자동 저장(43-96, `flush` 47, `edit` 69), 중지·재시도·삭제(156-180), `titleSlot`(186-197), 글자수 칩(199-200, 302-305), 블로그별 글 상태 `StatusPicker`(227), 출처·리서치 노트·규칙 사본(388-418), `SOURCE_KIND`(431) | [[writing/flows/초안 편집과 자동 저장 플로우]], [[writing/flows/작업 중지와 재시도 플로우]], [[writing/entities/Job]] |
| `src/job/Progress.tsx` | `Progress`(6-47) 진행 단계: 자료 조사 → 글 작성 → 이미지 생성 → 초안 검토 → 블로그 임시저장 → 블로그 발행완료 (블로그 단계는 가장 앞선 블로그 상태) | [[writing/flows/초안 작성 플로우]] |
| `src/job/NextStep.tsx` | `StatusPicker`(11-43) 블로그별 상태 직접 변경, `NextStep`(45-147) 다음 할 일(고른 블로그가 발행완료면 안내, 111-139), `ChromeBlogNext`(153-213), `WordPressNext`(366-431) | [[writing/entities/Job]], [[publishing/business-rules/BR-PUB-013 발행 완료 표시]] |
| `src/job/Preview.tsx` | `Linked`(8-27), `Rich`(30-44), `Preview`(46-133, 제목 아래 `titleSlot` 68) | [[writing/flows/초안 편집과 자동 저장 플로우]] |
| `src/job/TitlePicker.tsx` | `TitlePicker`(9-67): 제목 후보, 지금 제목 표시, 제목 다시 만들기 | [[writing/business-rules/BR-WRT-013 제목 후보와 키워드]] |
| `src/job/Report.tsx` | `Report`(6-68): 검색 질문·키워드, 뺀 항목, 태그 근거 (제목 후보는 2026-10-10에 `TitlePicker`로 옮김) | [[writing/business-rules/BR-WRT-005 태그 출처 검증]] |
| `src/job/PostEditor.tsx` | `TagInput`(9-48), `tableToText`·`textToTable`(51-56), `ImageEditor`(58-117), `PostEditor`(119-252, 제목 칸 아래 `titleSlot` 152) | [[writing/business-rules/BR-WRT-004 태그 최대 30개]], [[writing/business-rules/BR-WRT-007 빈 칸 있는 표 행 제거]] |
| `src/RulesEditor.tsx` | `RulesEditor`(6-84) | [[writing/entities/글쓰기 규칙]] |

## 테스트 (vitest, `npm test`)
| 파일 | 다루는 규칙 |
|---|---|
| `tests/shared.test.ts` | 글자수 계산(27-51), 분량 목표·범위·상한(53-65), 상태·블로그 라벨(109-121), 목록 필터 블로그 × 상태·가장 앞선 블로그 상태(170-197) → BR-WRT-001, 002, 내 글 목록 필터 |
| `tests/writer.test.ts` | 날짜 표시줄 제거(6-16), 표 정리(18-27), 이미지 개수 옵션(29-48), 태그 출처 검증(50-68) → BR-WRT-005, 006, 007, 008 |
| `tests/writingOptions.test.ts` | 목표 분량·말투가 프롬프트에 들어감, 예전 작업 기본값, 상한 초과 때만 줄이기, 짧을 때 로그(35-76) → BR-WRT-001, 019 |
| `tests/titles.test.ts` | 제목 다시 만들기 프롬프트·정리·오류, 요청 검사, 글은 그대로(33-81) → BR-WRT-013 |
| `tests/api.test.ts` | 새 글 입력 검증·분량·말투 검사·기억값 유지(80-98), 블로그별 수기 상태 변경(164-190), 예전 글 상태 옮기기(192-215), 중지·삭제(285-300) → BR-WRT-010, 001, Job 전이 |
| `tests/editPost.test.ts` | 범위·글 전체 고치기, 작업의 상한·말투, 분량·말투 다시 쓰기, 이미지 ref 복원·검증, 바뀐 것 없음, 빈 표, 적용 조건, 요청 검사, 시작→제안→적용, 실패·중지(50-270) → BR-WRT-016, 017, 018 |
| `tests/wordpress.test.ts` | 워드프레스에 올리면 그 블로그 상태만 바뀜(127-141) → [[writing/entities/Job]] |
| `tests/store.test.ts` | 데이터 폴더 환경 변수(8-10), 동시 갱신에도 로그 유지·임시 파일 없음(43-54) → [[writing/entities/Job]] 저장 |

테스트는 파일마다 빈 임시 데이터 폴더(`BLOG_WRITER_DATA_DIR`)를 쓴다 (`tests/setup.ts`).

## 다른 도메인과의 접점
- 고치기는 본문 이미지를 건드리지 않고 이미지 추가·삭제는 image 도메인의 API를 쓴다 → [[writing/business-rules/BR-WRT-018 고칠 때 이미지는 그대로]].
- 글 작성 프롬프트가 이미지 지시(`imageInstructions`, `STYLE_GUIDE`)도 함께 준다 → [[image/business-rules/BR-IMG-001 본문 이미지 개수]], [[image/business-rules/BR-IMG-005 이미지 안 문구 길이]].
- 초안 완성 뒤 `makeImages` → [[image/flows/이미지 생성 플로우]].
- 초안을 블로그로(크롬 임시저장 또는 워드프레스 API 등록) → [[publishing/flows/블로그 임시저장 플로우]]. 등록 결과가 그 블로그의 `Job.blogs[블로그]`(posted/scheduled/published)와 `Job.wordpress`에 기록된다 (2026-10-10부터 블로그별, 글 `status`는 draft_ready로 돌아옴).
- 주제 추천의 "이 주제로 글쓰기"가 새 글 폼을 채움 → [[topic/flows/주제 추천 플로우]].
- 모든 Claude 호출은 단계(`research`, `writing`) 모델을 씀 → [[usage/business-rules/BR-USG-002 모델 결정 순서]].
