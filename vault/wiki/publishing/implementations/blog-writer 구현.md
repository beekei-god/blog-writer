---
type: implementation
domain: publishing
project: blog-writer
paths: [server/browser/**, server/wordpress.ts, shared/postHtml.ts, shared/labels.ts, server/pipeline.ts, server/routes/jobs.ts, server/routes/browser.ts, server/routes/settings.ts, server/secrets.ts, src/job/NextStep.tsx, src/job/JobDetail.tsx, src/job/Progress.tsx, src/BlockedSites.tsx, src/LoginWindow.tsx, src/ExtensionStatus.tsx, src/SettingsPanel.tsx]
last_ingested_commit: 스냅샷 2026-10-07 (git 없음)
updated: 2026-10-07
---
# blog-writer의 publishing 구현

## 파일과 역할
| 파일 | 함수/컴포넌트 | 구현하는 규칙/엔티티 |
|---|---|---|
| `shared/types.ts` | `Platform`(3), `Settings`(122-135), `blogIdOf`(138-140), `PostSettings`·`settingsFor`(143-147), `JobStatus`(218-229), `PublishMode`(232), `WordPressRecord`(235-243), `Job.wordpress`(269) | [[publishing/entities/블로그 설정]], BR-PUB-013, 014, 015, 016 |
| `shared/labels.ts` | `STATUS_LABEL`(4-14), `PLATFORM_LABEL`(16), `PLATFORM_SHORT_LABEL`(18) | 화면·서버 오류 문구 |
| `shared/postHtml.ts` | `rich`·`tableHtml`(31-42), `BLANK_LINE`(45), `TAG_GAP_LINES`(48), `tagLine`(58), `postToHtml`(91-124), `postToText`(127-157) | BR-PUB-006, 007 |
| `server/store.ts` | `DEFAULT_SETTINGS`(19-22), `getSettings` 예전 설정 옮기기(27-50) | [[publishing/entities/블로그 설정]] |
| `server/secrets.ts` | `getWordPressAuth`(62-65), `saveWordPressAuth`(67-71, 예전 `wpcom*` 삭제) | [[publishing/entities/블로그 설정]] |
| `server/routes/settings.ts` | `SettingsSchema`(16-34), `/api/wordpress`·`/categories`(90-125) | BR-PUB-002, [[publishing/flows/워드프레스 API 등록 플로우]] |
| `server/routes/browser.ts` | `/chrome-extension`(17-57), `/blocked-sites`(60-77), `blogLoginUrl`(79-82), `/browser/login`(84-121) | BR-PUB-003, 004, 017 |
| `server/routes/jobs.ts` | `/post-to-blog`(100-143), `MANUAL_TRANSITIONS`·`/status`(145-177) | BR-PUB-001, 013, 014, 015 |
| `server/routes/util.ts` | `markBusy`(15-20), `wordpressStatus`(23-26) | |
| `server/pipeline.ts` | `enqueueBrowser`(24), `runPost`(306-317), `doWordPressPost`(321-355), `doPost`(357-415) | BR-PUB-003, 004, 014, [[publishing/flows/블로그 임시저장 플로우]] |
| `server/wordpress.ts` | `normalizeSite`(26-31), `wp`(53-116), `testWordPress`(124-130), `listCategories`(133-137), `ensureMedia`(149-171), `resolveTagIds`(175-194), `postToBlocks`(199-234), `checkSchedule`(245-250), `publishToWordPress`(252-314) | BR-PUB-005, 006, 008, 009, 012, 014, 016 → [[_system/integrations/wordpress-rest]] |
| `server/browser/blogPost.ts` | `buildSegments`(25-59), `writeUrl`(61-66), `PLATFORM_GUIDE`(69-88, 네이버·티스토리), `postWithClaudeInChrome`(119-212) | BR-PUB-001, 005, 006, 007, 008, 009 |
| `server/browser/userChrome.ts` | `segmentsOf`(137-185), `shrinkImage`(191-207), `verifyEditor`(286-339), `postNaverInUserChrome`(349-483) | BR-PUB-009, 010, 011, 012 |
| `server/browser/adapters.ts` | `fillPlainBody`(123-150), `waitForLogin`(152-155), `naver`(201-273), `tistory`(301-380), `ADAPTERS`(383-386, 네이버·티스토리만) | BR-PUB-005, 006, 007, 012 |
| `server/browser/runner.ts` | `isAutomationRunning`(21), `withChrome`(33-43), `runWithChrome`(45-84), `postWithChrome`(86-93) | BR-PUB-001, 004 |
| `server/browser/claudeChrome.ts` | `SiteBlockedError`(31-35), `installedProfiles`(47-72), `extensionStatus`(88-90), `BROWSER_RULES`(98-105) | BR-PUB-001, 003, 012 |
| `server/browser/blockedSites.ts` | `isBlocked`, `markBlocked`, `clearBlocked` | [[publishing/entities/막힌 사이트]] |
| `server/browser/loginWindow.ts` | `procFor`(13), `loginWindowFor`(34), `openLoginWindow`(36-52), `closeLoginWindow`(55-65) | BR-PUB-004, 017 |
| `server/browser/mouse.ts` | `HumanMouse` | (자동 조작 입력 방식) |
| `server/browser/postHtml.ts` | `pasteBlockHtml`(7-20), `altFileName`(27-35) | BR-PUB-007, 009 |
| `src/SettingsPanel.tsx` | `BLOG_ID`(10-26), `SETTINGS_FIELDS`·`saveGroup`(29-35, 87-104), 블로그 카드(171-197), 워드프레스 카드(201-261), Claude in Chrome 카드(347-377) | BR-PUB-002, 015, [[publishing/entities/블로그 설정]] |
| `src/App.tsx` | 블로그별 `ready`(100-105), 상태 필터(24-36) | BR-PUB-013, 015 |
| `src/job/JobDetail.tsx` | `destPick`·`postToBlog`(102-111), 로그인 창 상자(203-212), 올릴 곳 선택(214-246) | BR-PUB-012, 015 |
| `src/job/NextStep.tsx` | `confirmRevert`(6-8), `NextStep`(10-153), `WordPressNext`(175-267) | BR-PUB-001, 013, 014, 016 |
| `src/job/Progress.tsx` | `Progress` (예약됨은 임시저장 단계까지 완료) | BR-PUB-013 |
| `src/ExtensionStatus.tsx` | `ExtensionStatus` | [[publishing/flows/Claude in Chrome 연결 확인 플로우]] |
| `src/BlockedSites.tsx` | `BlockedSites` | BR-PUB-003 |
| `src/LoginWindow.tsx` | `LoginWindow` (블로그별) | BR-PUB-017 |
| `src/api.ts` | `postToBlog`(86-88), WordPress 호출(89-93), `setStatus`(94-96), 로그인 창(99-103) | |
| `tests/wordpress.test.ts`, `tests/api.test.ts` | 워드프레스 등록(가짜 사이트), 거절 경로·수기 전이·로그인 창 | BR-PUB-013, 014, 016, 017 → [[_system/modules/tests]] |

## 다른 도메인과의 접점
- 입력하는 내용은 [[writing/entities/Post]], 이미지는 [[image/entities/ImageSpec]]의 `file`. 작업 상태(`posted`·`scheduled`·`published`)는 [[writing/entities/Job]].
- 크롬 큐를 웹 AI 이미지와 공유 → [[image/flows/이미지 생성 플로우]].
- 블로그 입력 Claude 호출은 `browser` 단계 모델 → [[usage/business-rules/BR-USG-001 단계별 추천 모델]]. 워드프레스 API 등록은 Claude를 쓰지 않는다.

## 변경 이력
| 날짜 | 변경 |
|---|---|
| 2026-10-07 | 라우트가 `server/index.ts`에서 `server/routes/*.ts`로, 글 화면이 `src/JobDetail.tsx`에서 `src/job/*.tsx`로 옮겨짐. `server/wordpress.ts` 추가, 워드프레스 크롬 어댑터 삭제 |
