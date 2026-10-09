---
type: implementation
domain: publishing
project: blog-writer
paths: [server/browser/**, server/wordpress.ts, shared/postHtml.ts, shared/labels.ts, server/pipeline.ts, server/routes/jobs.ts, server/routes/browser.ts, server/routes/settings.ts, server/secrets.ts, src/job/NextStep.tsx, src/job/JobDetail.tsx, src/job/Progress.tsx, src/BlockedSites.tsx, src/LoginWindow.tsx, src/ExtensionStatus.tsx, src/SettingsPanel.tsx, tests/publish.test.ts]
last_ingested_commit: 65bfa3e
updated: 2026-10-09
---
# blog-writer의 publishing 구현

## 파일과 역할
| 파일 | 함수/컴포넌트 | 구현하는 규칙/엔티티 |
|---|---|---|
| `shared/types.ts` | `Platform`(3), `NAVER_MINUTE_STEP`(17), `Settings`(132-150), `blogIdOf`(152-154), `PostSettings`·`settingsFor`(157-161), `JobStatus`(243-254), `PublishMode`(257), `WordPressRecord`(260-268), `MANUAL_STATUSES`·`ManualStatus`·`canSetStatus`(273-276), `Job.postingTo`(287), `Job.wordpress`(304) | [[publishing/entities/블로그 설정]], BR-PUB-013, 014, 015, 016, 019 |
| `shared/labels.ts` | `STATUS_LABEL`(4-14), `statusLabel`(17), `PLATFORM_LABEL`(19), `PLATFORM_SHORT_LABEL`(21), `PUBLISH_MODE_LABEL`(24) | 화면·서버 문구, BR-PUB-013, 014 |
| `shared/postHtml.ts` | `rich`(31), `plain`(33), `tableHtml`(38-45), `skippedImageLabel`(48), `BLANK_LINE`(51), `TAG_GAP_LINES`(54), `tagLine`(57) | BR-PUB-006, 007, 008 |
| `server/store.ts` | `DEFAULT_SETTINGS`(19-22), `getSettings` 예전 설정 옮기기(27-50) | [[publishing/entities/블로그 설정]] |
| `server/secrets.ts` | `getWordPressAuth`(59-62), `saveWordPressAuth`(64-68, 예전 `wpcom*` 삭제) | [[publishing/entities/블로그 설정]] |
| `server/routes/settings.ts` | `SettingsSchema`(17-35), `/api/wordpress`·`/categories`(127-162) | BR-PUB-002, [[publishing/flows/워드프레스 API 등록 플로우]] |
| `server/routes/browser.ts` | `/chrome-extension`(17-57), `/blocked-sites`(61-77), `blogLoginUrl`(79-82), `/browser/login`(86-121) | BR-PUB-003, 004, 017 |
| `server/routes/jobs.ts` | `/post-to-blog`(100-152: 방식·예약 시각·네이버 10분 단위 검사), `MANUAL_LOG`·`/status`(154-181) | BR-PUB-001, 013, 014, 015 |
| `server/routes/util.ts` | `markBusy`(16-22, `postingTo` 기록), `wordpressStatus`(25-28) | BR-PUB-019 |
| `server/pipeline.ts` | `enqueueBrowser`(25), `requireDraft`(31-35), `failStep`(38-45), `runPost`(319-329), `doWordPressPost`(332-360), `doPost`(366-429: 경로 선택, 방식별 상태, `PublishStepError` → `posted`+오류) | BR-PUB-001, 003, 004, 014, 018, [[publishing/flows/블로그 임시저장 플로우]] |
| `server/wordpress.ts` | `normalizeSite`(26-31), `wp`(53-116), `testWordPress`(124-130), `listCategories`(133-137), `ensureMedia`(149-171), `resolveTagIds`(175-194), `wpTableHtml`(199-200), `postToBlocks`(203-236), `WP_STATUS`(245), `checkSchedule`(248-253, 네이버·티스토리 요청 검사도 사용), `publishToWordPress`(255-320) | BR-PUB-005, 006, 008, 009, 012, 014, 016 → [[_system/integrations/wordpress-rest]] |
| `server/browser/publish.ts` (2026-10-09 추가) | `PublishRequest`(12-16), `PublishStepError`(19-22, `dialog`로 멈춘 순간의 발행 창 구조), `PUBLISH_DUMP_JS`(28-43), `kstParts`·`kstText`(47-69), `PublishStep`(72-80), `PUBLISH_HELPERS`(83-141, 발행 창 찾기 `layer`·`OPENER`), `scheduleSteps`(145-200), `finishSteps`(202-222), `naverPublishSteps`(226-243), `tistoryPublishSteps`(245-264), `runPublishSteps`(271-293), `withDialog`(295-299), `stepError`(301-305), `publishedText`(307-309), `publishPrompt`(311-336) | BR-PUB-001, 014, 018 |
| `server/browser/blogPost.ts` | `buildSegments`(24-57), `PLATFORM_GUIDE`(60-79, 네이버·티스토리), `ResultSchema`(87-93, `published`·`scheduled` 추가), `BlogLoginRequired`(107), `postWithClaudeInChrome`(113-214: 방식별 목표, `publishPrompt`, 결과 비교) | BR-PUB-001, 005, 006, 007, 008, 009, 018 |
| `server/browser/userChrome.ts` | `segmentsOf`(138-186), `shrinkImage`(192-208), `expectedAtoms`(228-262), `readEditor`(265-282), `verifyEditor`(287-340), `postNaverInUserChrome`(353-494: 저장 확인 뒤 문제 없으면 발행 창 단계) | BR-PUB-009, 010, 011, 012, 018 |
| `server/browser/adapters.ts` | `AdapterContext.publish`(24), `publishIfAsked`(28-32), `insertTableOrList`(111-122), `fillPlainBody`(133-159), `waitForLogin`(162-165), `clickSaveDraft`(178-188), `naver`(211-285), `tistory`(313-393), `ADAPTERS`(396-399, 네이버·티스토리만) | BR-PUB-001, 005, 006, 007, 012, 018 |
| `server/browser/runner.ts` | `isAutomationRunning`(22), `withChrome`(34-44), `runWithChrome`(46-85), `postWithChrome`(87-94, `publish` 인자) | BR-PUB-001, 004 |
| `server/browser/claudeChrome.ts` | `SITE_BLOCKED_TEXT`(28), `SiteBlockedError`(31-35), `installedProfiles`(47-72, 내부 전용), `extensionStatus`(88-90), `BROWSER_RULES`(98-105) | BR-PUB-001, 003, 012 |
| `server/browser/blockedSites.ts` | `isBlocked`(24), `markBlocked`(28), `clearBlocked`(35) | [[publishing/entities/막힌 사이트]] |
| `server/browser/loginWindow.ts` | `procFor`(13), `loginWindowFor`(34), `openLoginWindow`(36-52), `closeLoginWindow`(55-65) | BR-PUB-004, 017 |
| `server/browser/mouse.ts` | `HumanMouse` | (자동 조작 입력 방식) |
| `server/browser/postHtml.ts` | `pasteBlockHtml`(7-20), `writeUrl`(23-24), `altFileName`(30-38) | BR-PUB-002, 007, 009 |
| `src/SettingsPanel.tsx` | `BLOG_ID`(12-23, 네이버·티스토리만), `SETTINGS_FIELDS`(27-32), `saveGroup`(86-101), 블로그 카드(172-196, 안내 문구 186), 워드프레스 카드(198-258), Claude in Chrome 카드(346-376) | BR-PUB-002, 015, [[publishing/entities/블로그 설정]] |
| `src/App.tsx` | 상태 필터(23-38), 블로그별 `ready`(102-107) | BR-PUB-013, 015 |
| `src/job/JobDetail.tsx` | `destPick`·`postToBlog`(102-111), `StatusPicker` 표시(194-197), 로그인 창 상자(206-215), 올릴 곳 선택(223-243) | BR-PUB-012, 013, 015 |
| `src/job/NextStep.tsx` | `StatusPicker`(11-30), `NextStep`(32-128), `ChromeBlogNext`(134-196), `WP_MODE_HINT`·`CHROME_MODE_HINT`(200-209), `usePublishMode`(222-236), `PublishModeFields`(239-259), `WordPressNext`(262-328) | BR-PUB-001, 013, 014, 016, 019 |
| `src/job/Progress.tsx` | `Progress` (블로그 임시저장·블로그 발행완료 단계, 예약은 임시저장 단계까지 완료) | BR-PUB-013 |
| `src/labels.ts` | `STATUS_LABEL`·`statusLabel` 다시 내보내기 | |
| `src/ExtensionStatus.tsx` | `ExtensionStatus` | [[publishing/flows/Claude in Chrome 연결 확인 플로우]] |
| `src/BlockedSites.tsx` | `BlockedSites` | BR-PUB-003 |
| `src/LoginWindow.tsx` | `LoginWindow` (블로그별) | BR-PUB-017 |
| `src/api.ts` | `postToBlog`(102-103), WordPress 호출(104-108), `setStatus`(110-111), 로그인 창(114-118) | |
| `tests/publish.test.ts` (2026-10-09 추가) | 한국 시간, 발행 창 단계 순서·10분 단위·js 문법, 단계 실행·ERR·중지, 프롬프트 | BR-PUB-018 → [[_system/modules/tests]] |
| `tests/wordpress.test.ts`, `tests/api.test.ts` | 워드프레스 등록(가짜 사이트), 요청 거절 경로(네이버·티스토리 예약 포함)·수기 상태 변경·로그인 창 | BR-PUB-013, 014, 016, 017 → [[_system/modules/tests]] |

## 다른 도메인과의 접점
- 입력하는 내용은 [[writing/entities/Post]], 이미지는 [[image/entities/ImageSpec]]의 `file`. 작업 상태(`posted`·`scheduled`·`published`)와 이름은 [[writing/entities/Job]].
- 크롬 큐를 웹 AI 이미지와 공유 → [[image/flows/이미지 생성 플로우]].
- 블로그 입력 Claude 호출(Claude in Chrome 경로, 예약·자동발행 절차 포함)은 `browser` 단계 모델 → [[usage/business-rules/BR-USG-001 단계별 추천 모델]]. 워드프레스 API 등록과 평소 크롬·자동 조작의 발행 창 단계는 Claude를 쓰지 않는다.
- 중지는 `server/cancel.ts`의 `throwIfCancelled`를 발행 창 단계에서도 쓴다 → [[writing/flows/작업 중지와 재시도 플로우]].

## 변경 이력
| 날짜 | 변경 |
|---|---|
| 2026-10-07 | 라우트가 `server/index.ts`에서 `server/routes/*.ts`로, 글 화면이 `src/JobDetail.tsx`에서 `src/job/*.tsx`로 옮겨짐. `server/wordpress.ts` 추가, 워드프레스 크롬 어댑터 삭제 |
| 2026-10-09 | `server/browser/publish.ts`·`tests/publish.test.ts` 추가 (네이버·티스토리 예약발행·자동발행). `NextStep`에 `StatusPicker`·`ChromeBlogNext`·공용 `PublishModeFields`/`usePublishMode`, `MANUAL_TRANSITIONS` → `MANUAL_STATUSES`/`canSetStatus`. `shared/postHtml.ts`의 `postToHtml`·`postToText`(본문 복사) 삭제, `writeUrl`이 `server/browser/postHtml.ts`로, `skippedImageLabel`·`tableHtml(cellExtra, tableExtra)` 공용화. 내부 전용으로 바뀐 export: `buildSegments`, `withChrome`, `installedProfiles` 등. 커밋 7a8a0ea·65bfa3e |
