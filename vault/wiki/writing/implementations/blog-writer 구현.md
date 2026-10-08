---
type: implementation
domain: writing
project: blog-writer
paths: [server/pipeline.ts, server/research.ts, server/writer.ts, server/schema.ts, server/naver.ts, server/rules.ts, server/store.ts, server/fsutil.ts, server/cancel.ts, server/routes/jobs.ts, server/routes/settings.ts, server/routes/util.ts, shared/length.ts, shared/types.ts, shared/labels.ts, rules/default-writing-rules.md, src/NewJob.tsx, src/App.tsx, src/job/JobDetail.tsx, src/job/Progress.tsx, src/job/Preview.tsx, src/job/Report.tsx, src/job/PostEditor.tsx, src/job/NextStep.tsx, src/RulesEditor.tsx, tests/writer.test.ts, tests/shared.test.ts, tests/api.test.ts, tests/store.test.ts]
last_ingested_commit: 스냅샷 2026-10-07 (git 없음)
updated: 2026-10-08
---
# blog-writer의 writing 구현

## 파일과 역할
| 파일 | 함수/컴포넌트 | 구현하는 규칙/엔티티 |
|---|---|---|
| `shared/types.ts` | `PostBlock`(169-176), `TAG_SOURCES`·`TagDetail`(178-187), `MAX_TAGS`(189), `Post`(191-208), `Source`(210-216), `JobStatus`(218-229), `PublishMode`(232), `WordPressRecord`(234-243), `BUSY_STATUSES`(245), `Job`(247-270) | [[writing/entities/Job]], [[writing/entities/Post]], [[writing/business-rules/BR-WRT-004 태그 최대 30개]] |
| `shared/labels.ts` | `STATUS_LABEL`(4-14), `errorText`(20) — 화면과 서버 오류 문구가 같은 상태 이름을 씀 | [[writing/entities/Job]] |
| `shared/length.ts` | `MAX_BODY_CHARS`(4), `countBodyChars`(14-33) | [[writing/business-rules/BR-WRT-001 본문 분량 상한]], [[writing/business-rules/BR-WRT-002 본문 글자수 계산]] |
| `server/routes/jobs.ts` | `keepImageResults`(24-39), `GET/POST /api/jobs`(41-72), `GET /:id`(74-82), `PUT /post`(84-98), `MANUAL_TRANSITIONS`·`PUT /status`(147-177), `/cancel`(179-186), `/retry`(188-198), `DELETE`(200-207) | [[writing/business-rules/BR-WRT-010 주제와 참고 링크 입력 검증]], [[writing/business-rules/BR-WRT-011 작업 중복 실행과 진행 중 변경 금지]], [[writing/entities/Job]] |
| `server/routes/settings.ts` | 글쓰기 규칙 `GET/PUT /api/rules`, `POST /api/rules/reset`(48-58) | [[writing/business-rules/BR-WRT-009 글쓰기 규칙 적용 시점]] |
| `server/routes/util.ts` | `wrap`(6-9), `markBusy`(15-20) | [[writing/entities/Job]] |
| `server/pipeline.ts` | `running`(22), `imageRuns`·`isRunning`·`isImageBusy`(29-40), `runDraft`·`doDraft`(42-129), `runImages`·`runImage`·`imagesStep`(131-197), `runPost`(306-317), `doWordPressPost`(321-355), `doPost`(357-415) | [[writing/flows/초안 작성 플로우]], [[writing/business-rules/BR-WRT-012 중단 시 작업 상태 복구]] |
| `server/research.ts` | `SYSTEM`(5-23), `deepResearch`(62-88) | [[writing/business-rules/BR-WRT-014 리서치 출처 등급과 열람 제한]], [[writing/business-rules/BR-WRT-003 확인된 사실만 사용]] |
| `server/writer.ts` | `BASE_SYSTEM`(6-42), `writePost`(108-173), `stripUpdateLines`(178-181), `enforceLength`(184-213), `verifyTagSources`(221-250), `dedupeTags`(252-257), `isCompleteTable`(260-264), `enforceImageOptions`(267-274) | BR-WRT-001, 003, 004, 005, 006, 007, 008, 013 |
| `server/schema.ts` | `PostSchema`(19-41), `POST_JSON_SCHEMA`(79-155) | [[writing/entities/Post]] |
| `server/naver.ts` | `expandQueries`(23-28), `collectAutocomplete`(31-35), `naverRelated`(45-68), `collectNaverSuggestions`(79-88) | [[writing/business-rules/BR-WRT-015 네이버 검색어 제안 수집 범위]] |
| `server/rules.ts` | `RULES_FILE`·`DEFAULT_FILE`(11-12), `getRules`(20-27), `saveRules`(29-32), `resetRules`(34-37), `todayKST`(40-) | [[writing/business-rules/BR-WRT-009 글쓰기 규칙 적용 시점]] |
| `server/store.ts` | `PROJECT_ROOT`·`DATA_DIR`(10-12), `createJob`(89-108), `updateJob`(111-120), `log`(122-127), `deleteJob`(129-133), `recoverStuckJobs`(135-147) | [[writing/entities/Job]], [[writing/business-rules/BR-WRT-012 중단 시 작업 상태 복구]] |
| `server/fsutil.ts` | `writeFileAtomic`(9-15), `writeJsonAtomic`(17-18), `serialQueue`(21-28), `keyedQueue`(31-38) — 작업 파일·규칙 파일의 원자적 쓰기와 id별 직렬화 | [[writing/entities/Job]], [[writing/entities/글쓰기 규칙]] |
| `server/cancel.ts` | `withCancel`(작업마다 여러 신호), `cancelJob`(모두 중지), `throwIfCancelled`, `CancelledError` (1-39) | [[writing/flows/작업 중지와 재시도 플로우]] |
| `rules/default-writing-rules.md` | 1~6장 (1-77) | [[writing/entities/글쓰기 규칙]] |
| `src/NewJob.tsx` | `MAX_LINKS`·`isHttpUrl`·`linkProblem`(22-40), `NewJob`(42-200) | [[writing/business-rules/BR-WRT-010 주제와 참고 링크 입력 검증]] |
| `src/App.tsx` | 상태 필터 `FILTERS`·`matchesFilter`(23-36), 목록·배지(129-167), 1.5초 폴링(88) | [[writing/flows/내 글 목록 상태 필터 플로우]] |
| `src/job/JobDetail.tsx` | 자동 저장(35-90), 중지·재시도·삭제(144-165), 글자수 칩(168, 270-273), 출처·리서치 노트·규칙 사본(315-350), `SOURCE_KIND`(358) | [[writing/flows/초안 편집과 자동 저장 플로우]], [[writing/flows/작업 중지와 재시도 플로우]] |
| `src/job/Progress.tsx` | `Progress`(5-44) 진행 단계 표시 | [[writing/flows/초안 작성 플로우]] |
| `src/job/NextStep.tsx` | `confirmRevert`(6-8), `NextStep`(10-153) 다음 할 일·수기 상태 버튼 | [[writing/entities/Job]], [[publishing/business-rules/BR-PUB-013 발행 완료 표시]] |
| `src/job/Preview.tsx` | `copyToClipboard`, `CopyBar`(24-59), `Preview`(102-185) | [[writing/flows/초안 편집과 자동 저장 플로우]] |
| `src/job/Report.tsx` | `Report`(6-83): 제목 후보, 검색 질문·키워드, 뺀 항목, 태그 근거 | [[writing/business-rules/BR-WRT-013 제목 후보와 키워드]], [[writing/business-rules/BR-WRT-005 태그 출처 검증]] |
| `src/job/PostEditor.tsx` | `TagInput`(8-47), `tableToText`·`textToTable`(49-55), `ImageEditor`(57-116), `PostEditor`(118-207) | [[writing/business-rules/BR-WRT-004 태그 최대 30개]], [[writing/business-rules/BR-WRT-007 빈 칸 있는 표 행 제거]] |
| `src/RulesEditor.tsx` | `RulesEditor`(6-84) | [[writing/entities/글쓰기 규칙]] |

## 테스트 (vitest, `npm test`)
| 파일 | 다루는 규칙 |
|---|---|
| `tests/shared.test.ts` | 글자수 계산·3,000자 상한(24-49), 상태 라벨(86-96), 복사용 텍스트(98-128) → BR-WRT-001, 002 |
| `tests/writer.test.ts` | 날짜 표시줄 제거(6-16), 표 정리(18-27), 이미지 개수 옵션(29-48), 태그 출처 검증(50-68) → BR-WRT-005, 006, 007, 008 |
| `tests/api.test.ts` | 새 글 입력 검증(59-65), 수기 상태 전이(96-111), 중지·삭제(143-148) → BR-WRT-010, Job 전이 |
| `tests/store.test.ts` | 데이터 폴더 환경 변수(8-10), 동시 갱신에도 로그 유지·임시 파일 없음(43-56) → [[writing/entities/Job]] 저장 |

테스트는 파일마다 빈 임시 데이터 폴더(`BLOG_WRITER_DATA_DIR`)를 쓴다 (`tests/setup.ts`).

## 다른 도메인과의 접점
- 글 작성 프롬프트가 이미지 지시(`imageInstructions`, `STYLE_GUIDE`)도 함께 준다 → [[image/business-rules/BR-IMG-001 본문 이미지 개수]], [[image/business-rules/BR-IMG-005 이미지 안 문구 길이]].
- 초안 완성 뒤 `makeImages` → [[image/flows/이미지 생성 플로우]].
- 초안을 블로그로(크롬 임시저장 또는 워드프레스 API 등록) → [[publishing/flows/블로그 임시저장 플로우]]. 등록 결과가 `Job.status`(posted/scheduled/published)와 `Job.wordpress`에 기록된다.
- 주제 추천의 "이 주제로 글쓰기"가 새 글 폼을 채움 → [[topic/flows/주제 추천 플로우]].
- 모든 Claude 호출은 단계(`research`, `writing`) 모델을 씀 → [[usage/business-rules/BR-USG-002 모델 결정 순서]].
