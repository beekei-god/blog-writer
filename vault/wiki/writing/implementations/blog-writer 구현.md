---
type: implementation
domain: writing
project: blog-writer
paths: [server/pipeline.ts, server/research.ts, server/writer.ts, server/schema.ts, server/naver.ts, server/rules.ts, server/store.ts, server/fsutil.ts, server/cancel.ts, server/routes/jobs.ts, server/routes/settings.ts, server/routes/edit.ts, server/routes/images.ts, server/editPost.ts, shared/blockDiff.ts, src/job/EditByPrompt.tsx, server/routes/util.ts, shared/length.ts, shared/types.ts, shared/labels.ts, rules/default-writing-rules.md, src/NewJob.tsx, src/App.tsx, src/job/JobDetail.tsx, src/job/Progress.tsx, src/job/Preview.tsx, src/job/Report.tsx, src/job/PostEditor.tsx, src/job/NextStep.tsx, src/RulesEditor.tsx, tests/writer.test.ts, tests/shared.test.ts, tests/api.test.ts, tests/store.test.ts, tests/editPost.test.ts]
last_ingested_commit: b7ced30
updated: 2026-10-09
---
# blog-writer의 writing 구현

## 파일과 역할
| 파일 | 함수/컴포넌트 | 구현하는 규칙/엔티티 |
|---|---|---|
| `shared/types.ts` | `MAX_LINKS`(19), `PostBlock`(183-190), `TAG_SOURCES`·`TagDetail`(193-201), `MAX_TAGS`(203), `Post`(205-222), `imageSpecAt`·`imageSpecsOf`(225-233), `Source`(237-241), `JobStatus`(243-254), `PublishMode`(257), `WordPressRecord`(260-268), `BUSY_STATUSES`(270), `MANUAL_STATUSES`·`canSetStatus`(273-276), `Job`(278-305) | [[writing/entities/Job]], [[writing/entities/Post]], [[writing/business-rules/BR-WRT-004 태그 최대 30개]], [[writing/business-rules/BR-WRT-010 주제와 참고 링크 입력 검증]] |
| `shared/labels.ts` | `STATUS_LABEL`(4-14), `statusLabel`(17, 2026-10-09부터 블로그와 관계없이 `STATUS_LABEL` 그대로), `PUBLISH_MODE_LABEL`(24), `errorText`(26) — 화면과 서버 오류 문구가 같은 상태 이름을 씀 | [[writing/entities/Job]] |
| `shared/length.ts` | `MAX_BODY_CHARS`(4), `countBodyChars`(14-33) | [[writing/business-rules/BR-WRT-001 본문 분량 상한]], [[writing/business-rules/BR-WRT-002 본문 글자수 계산]] |
| `server/routes/jobs.ts` | `keepImageResults`(24-39), `GET/POST /api/jobs`(41-72), `GET /:id`(74-81), `PUT /post`(84-98), `POST /post-to-blog`(100-152), `MANUAL_LOG`·`PUT /status`(154-181), `/cancel`(183-190), `/retry`(192-202), `DELETE`(204-211) | [[writing/business-rules/BR-WRT-010 주제와 참고 링크 입력 검증]], [[writing/business-rules/BR-WRT-011 작업 중복 실행과 진행 중 변경 금지]], [[writing/entities/Job]] |
| `server/editPost.ts` | `EDIT_PROMPT_MAX`(13), `SYSTEM`(74-95), `proposeEdit`(111-190), `applyProposal`(195-207) | [[writing/business-rules/BR-WRT-016 프롬프트로 글 고치기]], [[writing/business-rules/BR-WRT-017 고친 결과 적용 조건과 잠금]], [[writing/business-rules/BR-WRT-018 고칠 때 이미지는 그대로]] |
| `server/routes/edit.ts` | `POST /edit`(11-31), `POST /edit/apply`(34-55), `DELETE /edit`(58-68) | BR-WRT-016, 017 |
| `shared/blockDiff.ts` | `blockText`, `diffBlocks`, `collapseSame` — 고치기 전·후 비교 | [[writing/flows/프롬프트로 글 고치기 플로우]] |
| `src/job/EditByPrompt.tsx` | `EditByPrompt`(20-166) 요청 입력, 만드는 중 표시·중지, 비교, 적용/다시 만들기/버리기 | BR-WRT-016, 017, 018 |
| `server/routes/settings.ts` | 글쓰기 규칙 `GET/PUT /api/rules`, `POST /api/rules/reset`(48-58) | [[writing/business-rules/BR-WRT-009 글쓰기 규칙 적용 시점]] |
| `server/routes/util.ts` | `wrap`(7-10), `markBusy`(16-22) | [[writing/entities/Job]] |
| `server/pipeline.ts` | `running`(23), `requireDraft`(31-35, 초안 없으면 "작성된 초안이 없습니다."), `failStep`(38-45, 실패·중지 공용 처리), `imageRuns`·`isRunning`·`isImageBusy`(48-58), `runDraft`·`doDraft`(61-147), `runImages`·`runImage`·`imagesStep`(152-215), `makeImages`(217-246), `runPost`(319-329), `doWordPressPost`(332-360), `doPost`(366-429), `startEdit`(157-170)·`doEdit`(172-197) 글 고치기 제안 | [[writing/flows/초안 작성 플로우]], [[writing/business-rules/BR-WRT-012 중단 시 작업 상태 복구]] |
| `server/research.ts` | `SYSTEM`(5-23), `deepResearch`(62-88) | [[writing/business-rules/BR-WRT-014 리서치 출처 등급과 열람 제한]], [[writing/business-rules/BR-WRT-003 확인된 사실만 사용]] |
| `server/writer.ts` | `BASE_SYSTEM`(6-43), `writePost`(109-174), `ParsedPostSchema`·`systemFor`(178-179, 처음 작성과 줄여 쓰기가 같은 시스템 프롬프트·스키마를 씀), `stripUpdateLines`(183-185), `enforceLength`(188-217), `verifyTagSources`(225-254), `dedupeTags`(256-261), `isCompleteTable`(264-268), `enforceImageOptions`(271-278) | BR-WRT-001, 003, 004, 005, 006, 007, 008, 013 |
| `server/schema.ts` | `PostSchema`(23-45), `POST_JSON_SCHEMA`(85-161) | [[writing/entities/Post]] |
| `server/naver.ts` | `expandQueries`(25-30), `collectAutocomplete`(33-37, 내부 전용), `naverRelated`(47-70, 내부 전용), `collectNaverSuggestions`(80-89) | [[writing/business-rules/BR-WRT-015 네이버 검색어 제안 수집 범위]] |
| `server/rules.ts` | `RULES_FILE`·`DEFAULT_FILE`(11-12), `getRules`(20-27), `saveRules`(29-32), `resetRules`(34-37), `kstDate`(40, 한국 날짜 YYYY-MM-DD, 사용량 집계도 씀), `todayKST`(43) | [[writing/business-rules/BR-WRT-009 글쓰기 규칙 적용 시점]] |
| `server/store.ts` | `DATA_DIR`(12), `getJob`(58, `readJson`), `createJob`(85-104), `updateJob`(107-116), `log`(118-123), `deleteJob`(125-128), `recoverStuckJobs`(131-143, 글 고치기 running 제안 → failed 포함) | [[writing/entities/Job]], [[writing/business-rules/BR-WRT-012 중단 시 작업 상태 복구]] |
| `server/fsutil.ts` | `writeFileAtomic`(9-15), `readJson`(18-24, 없으면 기본값), `writeJsonAtomic`(26-27), `sleep`(29), `serialQueue`(32-39), `keyedQueue`(42-49) — 작업 파일·규칙 파일의 원자적 쓰기와 id별 직렬화 | [[writing/entities/Job]], [[writing/entities/글쓰기 규칙]] |
| `server/cancel.ts` | `withCancel`(작업마다 여러 신호), `cancelJob`(모두 중지), `throwIfCancelled`, `CancelledError` (1-39) | [[writing/flows/작업 중지와 재시도 플로우]] |
| `rules/default-writing-rules.md` | 1~6장 (1-77) | [[writing/entities/글쓰기 규칙]] |
| `src/NewJob.tsx` | `isHttpUrl`·`linkProblem`(26-42, `MAX_LINKS`는 `shared/types.ts`), `NewJob`(44-227) | [[writing/business-rules/BR-WRT-010 주제와 참고 링크 입력 검증]] |
| `src/App.tsx` | 상태 필터 `StatusFilter`·`FILTERS`·`matchesFilter`(23-38), 목록·배지(131-169), 1.5초 폴링(90) | [[writing/flows/내 글 목록 상태 필터 플로우]] |
| `src/job/JobDetail.tsx` | 자동 저장(35-90), 중지·재시도·삭제(144-165), 글자수 칩(168, 272-275), 글 상태 줄 `StatusPicker`(195-197), 출처·리서치 노트·규칙 사본(314-350), `SOURCE_KIND`(358) | [[writing/flows/초안 편집과 자동 저장 플로우]], [[writing/flows/작업 중지와 재시도 플로우]], [[writing/entities/Job]] |
| `src/job/Progress.tsx` | `Progress`(5-44) 진행 단계: 자료 조사 → 글 작성 → 이미지 생성 → 초안 검토 → 블로그 임시저장 → 블로그 발행완료 | [[writing/flows/초안 작성 플로우]] |
| `src/job/NextStep.tsx` | `StatusPicker`(11-30) 글 상태 직접 변경, `NextStep`(32-128) 다음 할 일, `ChromeBlogNext`(134-196), `WordPressNext`(262-328) | [[writing/entities/Job]], [[publishing/business-rules/BR-PUB-013 발행 완료 표시]] |
| `src/job/Preview.tsx` | `Linked`(8-27), `Rich`(30-44), `Preview`(46-129). 복사 막대 `CopyBar`·`copyToClipboard`는 2026-10-09 삭제 | [[writing/flows/초안 편집과 자동 저장 플로우]] |
| `src/job/Report.tsx` | `Report`(6-83): 제목 후보, 검색 질문·키워드, 뺀 항목, 태그 근거 | [[writing/business-rules/BR-WRT-013 제목 후보와 키워드]], [[writing/business-rules/BR-WRT-005 태그 출처 검증]] |
| `src/job/PostEditor.tsx` | `TagInput`(9-48), `tableToText`·`textToTable`(51-56), `ImageEditor`(58-117), `PostEditor`(119-208) | [[writing/business-rules/BR-WRT-004 태그 최대 30개]], [[writing/business-rules/BR-WRT-007 빈 칸 있는 표 행 제거]] |
| `src/RulesEditor.tsx` | `RulesEditor`(6-84) | [[writing/entities/글쓰기 규칙]] |

## 테스트 (vitest, `npm test`)
| 파일 | 다루는 규칙 |
|---|---|
| `tests/shared.test.ts` | 글자수 계산·3,000자 상한(23-48), 상태·블로그 라벨(92-103, 올리는 중 라벨이 블로그와 관계없이 같음) → BR-WRT-001, 002. 복사용 텍스트 테스트는 기능과 함께 삭제 |
| `tests/writer.test.ts` | 날짜 표시줄 제거(6-16), 표 정리(18-27), 이미지 개수 옵션(29-48), 태그 출처 검증(50-68) → BR-WRT-005, 006, 007, 008 |
| `tests/api.test.ts` | 새 글 입력 검증(59-65), 수기 상태 변경(102-126), 중지·삭제(158-163) → BR-WRT-010, Job 전이 |
| `tests/editPost.test.ts` | 범위·글 전체 고치기, 이미지 ref 복원·검증, 바뀐 것 없음, 빈 표, 적용 조건, 요청 검사, 시작→제안→적용, 실패·중지(50-223) → BR-WRT-016, 017, 018 |
| `tests/store.test.ts` | 데이터 폴더 환경 변수(8-10), 동시 갱신에도 로그 유지·임시 파일 없음(43-56) → [[writing/entities/Job]] 저장 |

테스트는 파일마다 빈 임시 데이터 폴더(`BLOG_WRITER_DATA_DIR`)를 쓴다 (`tests/setup.ts`).

## 다른 도메인과의 접점
- 고치기는 본문 이미지를 건드리지 않고 이미지 추가·삭제는 image 도메인의 API를 쓴다 → [[writing/business-rules/BR-WRT-018 고칠 때 이미지는 그대로]].
- 글 작성 프롬프트가 이미지 지시(`imageInstructions`, `STYLE_GUIDE`)도 함께 준다 → [[image/business-rules/BR-IMG-001 본문 이미지 개수]], [[image/business-rules/BR-IMG-005 이미지 안 문구 길이]].
- 초안 완성 뒤 `makeImages` → [[image/flows/이미지 생성 플로우]].
- 초안을 블로그로(크롬 임시저장 또는 워드프레스 API 등록) → [[publishing/flows/블로그 임시저장 플로우]]. 등록 결과가 `Job.status`(posted/scheduled/published)와 `Job.wordpress`에 기록된다.
- 주제 추천의 "이 주제로 글쓰기"가 새 글 폼을 채움 → [[topic/flows/주제 추천 플로우]].
- 모든 Claude 호출은 단계(`research`, `writing`) 모델을 씀 → [[usage/business-rules/BR-USG-002 모델 결정 순서]].
