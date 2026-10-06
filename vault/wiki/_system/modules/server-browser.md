---
type: module
project: blog-writer
module: server-browser
paths: [server/browser/**]
source:
  - blog-writer:server/browser/blogPost.ts:1-212
  - blog-writer:server/browser/userChrome.ts:1-483
  - blog-writer:server/browser/adapters.ts:1-386
  - blog-writer:server/browser/runner.ts:1-93
  - blog-writer:server/browser/claudeChrome.ts:1-105
  - blog-writer:server/browser/blockedSites.ts:1-37
  - blog-writer:server/browser/loginWindow.ts:1-65
  - blog-writer:server/browser/mouse.ts:1-74
  - blog-writer:server/browser/postHtml.ts:1-35
updated: 2026-10-07
---
# server-browser 모듈

## 책임
초안을 네이버·티스토리 글쓰기 화면에 넣고 임시저장하는 세 가지 경로와 크롬 관련 공통 기능. 워드프레스는 크롬 대신 API로 올린다 → [[_system/modules/server-wordpress]].
1. **Claude in Chrome** (기본): Claude가 평소 크롬을 조작 — `blogPost.ts`
2. **평소 크롬 + AppleScript** (네이버 + macOS, Claude in Chrome이 막을 때) — `userChrome.ts`
3. **앱 전용 크롬 자동 조작** (그 밖에 막힐 때) — `runner.ts` + `adapters.ts` + `mouse.ts`

## 파일
| 파일 | 줄 | 역할 | 주요 export | 관련 페이지 |
|---|---|---|---|---|
| `server/browser/blogPost.ts` | 212 | 본문을 HTML 조각(소제목 `<h3>`)·이미지 조각으로 나누고 네이버·티스토리 안내와 함께 Claude in Chrome에 입력·임시저장 지시 | `postWithClaudeInChrome`, `buildSegments`, `BlogLoginRequired` | [[_system/integrations/claude-in-chrome]], [[publishing/flows/블로그 임시저장 플로우]] |
| `server/browser/userChrome.ts` | 483 | macOS AppleScript로 평소 크롬 새 탭을 열고 JS를 실행해 SmartEditor ONE에 붙여넣기(소제목은 `<p>`로 붙인 뒤 서식 변경), 이미지 업로드, 소제목 서식, 결과 검증, 임시저장 | `postNaverInUserChrome`, `userChromeSupported`, `UserChromeError` | [[_system/integrations/chrome-applescript]], [[publishing/business-rules/BR-PUB-011 입력 결과 검증]] |
| `server/browser/adapters.ts` | 386 | Playwright로 네이버·티스토리 화면을 마우스·키보드로 입력 (예전 방식, 워드프레스 어댑터는 API 등록으로 바뀌며 삭제) | `ADAPTERS`, `AdapterContext` | [[_system/integrations/playwright-chrome]], [[_system/integrations/blog-editors]] |
| `server/browser/runner.ts` | 93 | 앱 전용 크롬 프로필로 Playwright 실행, 로그인 창과 충돌 방지, 실패 스크린샷 | `withChrome`, `postWithChrome`, `isAutomationRunning`, `closeAutomationWindow` | [[_system/integrations/playwright-chrome]] |
| `server/browser/claudeChrome.ts` | 105 | 확장 ID·설치 확인(크롬 프로필 파일), 연결 상태 기억, 오류 클래스, 공통 브라우저 규칙 프롬프트 | `installedProfiles`, `extensionStatus`, `assertExtensionInstalled`, `rememberConnection`, `ChromeExtensionError`, `SiteBlockedError`, `SITE_BLOCKED_TEXT`, `NOT_CONNECTED_TEXT`, `BROWSER_RULES` | [[_system/integrations/claude-in-chrome]] |
| `server/browser/blockedSites.ts` | 37 | Claude in Chrome이 막은 플랫폼 기억 (`data/blocked-sites.json`) | `isBlocked`, `markBlocked`, `clearBlocked`, `getBlockedSites` | [[publishing/entities/막힌 사이트]] |
| `server/browser/loginWindow.ts` | 65 | 자동화 없이 앱 전용 프로필 크롬을 띄우는 로그인 창. 어느 블로그용으로 열었는지 기억 | `openLoginWindow`, `closeLoginWindow`, `isLoginWindowOpen`, `loginWindowFor` | [[publishing/business-rules/BR-PUB-017 로그인 창은 한 블로그씩]] |
| `server/browser/mouse.ts` | 74 | 곡선 궤적 마우스 이동·클릭, 커서 오버레이 (쓰이지 않던 속도 옵션·`idle()`은 2026-10-07에 삭제) | `HumanMouse`, `CURSOR_OVERLAY_SCRIPT` | [[_system/integrations/playwright-chrome]] |
| `server/browser/postHtml.ts` | 35 | `shared/postHtml` 재수출, 에디터 붙여넣기용 블록 HTML(소제목 태그만 경로마다 다름), 네이버용 대체 텍스트 파일 이름 | `pasteBlockHtml`, `altFileName` | [[publishing/business-rules/BR-PUB-009 네이버 이미지 파일 이름과 크기]] |

## 의존
- 사용하는 모듈: [[_system/modules/server-claude]], [[_system/modules/server-core]] (`jobImageDir`, `DATA_DIR`, `CHROME_PROFILE_DIR`), [[_system/modules/shared]] (`postHtml`, `types`)
- 사용되는 곳: [[_system/modules/server-pipeline]] (`doPost`), [[_system/modules/server-images]] (`webAi.ts`가 `BROWSER_RULES` 등 사용), [[_system/modules/server-routes]] (확장·막힌 블로그·로그인 창 엔드포인트), [[_system/modules/server-claude]] (오류 감지)

## 주의할 점
- 세 경로가 본문을 HTML로 바꾸는 방식이 조금씩 다르다: Claude in Chrome은 소제목을 `<h3>`로, 평소 크롬은 `<p>`로 붙인 뒤 서식을 "소제목"으로 바꾸고(둘 다 `pasteBlockHtml`), 자동 조작은 타이핑한다 → [[publishing/business-rules/BR-PUB-007 소제목 위 빈 줄]].
- 셀렉터·문구 의존이 많다 ([[_system/known-issues]]).
