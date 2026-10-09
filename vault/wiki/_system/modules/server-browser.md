---
type: module
project: blog-writer
module: server-browser
paths: [server/browser/**]
source:
  - blog-writer:server/browser/blogPost.ts:1-215
  - blog-writer:server/browser/userChrome.ts:1-490
  - blog-writer:server/browser/adapters.ts:1-406
  - blog-writer:server/browser/runner.ts:1-99
  - blog-writer:server/browser/publish.ts:1-336
  - blog-writer:server/browser/claudeChrome.ts:1-105
  - blog-writer:server/browser/blockedSites.ts:1-37
  - blog-writer:server/browser/loginWindow.ts:1-65
  - blog-writer:server/browser/mouse.ts:1-74
  - blog-writer:server/browser/postHtml.ts:1-38
updated: 2026-10-09
---
# server-browser 모듈

## 책임
초안을 네이버·티스토리 글쓰기 화면에 넣고 임시저장하는 세 가지 경로, 사용자가 고르면 임시저장 뒤 블로그 발행 창에서 예약발행·자동발행까지 하는 단계, 크롬 관련 공통 기능. 워드프레스는 크롬 대신 API로 올린다 → [[_system/modules/server-wordpress]].
1. **Claude in Chrome** (기본): Claude가 평소 크롬을 조작 — `blogPost.ts` (발행은 프롬프트 `publishPrompt`로 지시)
2. **평소 크롬 + AppleScript** (네이버 + macOS, Claude in Chrome이 막을 때) — `userChrome.ts` (발행은 `naverPublishSteps`를 `runJs`로 실행)
3. **앱 전용 크롬 자동 조작** (그 밖에 막힐 때) — `runner.ts` + `adapters.ts` + `mouse.ts` (발행은 `publishIfAsked`가 Playwright `evaluate`로 실행)

## 파일
| 파일 | 줄 | 역할 | 주요 export | 관련 페이지 |
|---|---|---|---|---|
| `server/browser/blogPost.ts` | 215 | 본문을 HTML 조각(소제목 `<h3>`)·이미지 조각으로 나누고(`buildSegments`, 이제 내부 전용) 네이버·티스토리 안내와 함께 Claude in Chrome에 입력·임시저장 지시. `publish`가 draft가 아니면 목표 문구가 바뀌고 `publishPrompt`가 붙는다. 결과 status에 `published`·`scheduled` 추가, 기대한 status가 아니면 `PublishStepError` | `postWithClaudeInChrome`, `BlogLoginRequired`, `BlogPostResult` | [[_system/integrations/claude-in-chrome]], [[publishing/flows/블로그 임시저장 플로우]] |
| `server/browser/userChrome.ts` | 490 | macOS AppleScript로 평소 크롬 새 탭을 열고 JS를 실행해 SmartEditor ONE에 붙여넣기(소제목은 `<p>`로 붙인 뒤 서식 변경), 이미지 업로드, 소제목 서식, 결과 검증, 임시저장. `opts.publish`가 있으면 저장 확인 뒤 발행 단계 실행 (입력 문제(`problems`)가 있어도 발행은 진행) (`blog-writer:server/browser/userChrome.ts:486-487`) | `postNaverInUserChrome`, `userChromeSupported`, `UserChromeError` | [[_system/integrations/chrome-applescript]], [[publishing/business-rules/BR-PUB-011 입력 결과 검증]] |
| `server/browser/adapters.ts` | 406 | Playwright로 네이버·티스토리 화면을 마우스·키보드로 입력 (예전 방식). 임시저장 뒤 `publishIfAsked`로 발행 단계 실행 (네이버는 에디터가 `#mainFrame` 안이면 그 프레임에서) (`blog-writer:server/browser/adapters.ts:23-35`) | `ADAPTERS`, `AdapterContext` (`publish?` 추가) | [[_system/integrations/playwright-chrome]], [[_system/integrations/blog-editors]] |
| `server/browser/runner.ts` | 99 | 앱 전용 크롬 프로필로 Playwright 실행, 로그인 창과 충돌 방지, 실패 스크린샷. `postWithChrome`에 `publish` 인자 추가. `withChrome`은 이제 내부 전용 | `postWithChrome`, `isAutomationRunning`, `closeAutomationWindow`, `ChromeSession` | [[_system/integrations/playwright-chrome]] |
| `server/browser/publish.ts` | 336 | (2026-10-09 새 파일) 네이버·티스토리 발행 창 자동 조작. 발행 창을 클래스 이름 대신 화면 글자(발행·공개·예약)로 찾되 여는 버튼이 든 상자는 발행 창으로 보지 않는 페이지 안 도우미(`PUBLISH_HELPERS`), 멈춘 순간의 발행 창 구조를 읽는 스크립트(`PUBLISH_DUMP_JS`), 블로그별 단계 목록, 단계 실행기, 한국 시간 변환, Claude in Chrome용 발행 안내 | `PublishRequest`, `PublishStepError`, `PublishStep`, `kstParts`, `kstText`, `PUBLISH_HELPERS`, `naverPublishSteps`, `tistoryPublishSteps`, `runPublishSteps`, `publishedText`, `publishPrompt`, `PUBLISH_DUMP_JS` | [[_system/integrations/blog-editors]], [[publishing/business-rules/BR-PUB-001 발행하지 않고 임시저장까지만]], [[publishing/business-rules/BR-PUB-018 발행 창 단계와 안전장치]] |
| `server/browser/claudeChrome.ts` | 105 | 확장 ID·설치 확인(크롬 프로필 파일), 연결 상태 기억, 오류 클래스, 공통 브라우저 규칙 프롬프트. `EXTENSION_ID`·`EXTENSION_HELP`·`installedProfiles`는 이제 내부 전용 | `INSTALL_URL`, `extensionStatus`, `assertExtensionInstalled`, `rememberConnection`, `ChromeExtensionError`, `SiteBlockedError`, `SITE_BLOCKED_TEXT`, `NOT_CONNECTED_TEXT`, `BROWSER_RULES` | [[_system/integrations/claude-in-chrome]] |
| `server/browser/blockedSites.ts` | 37 | Claude in Chrome이 막은 플랫폼 기억 (`data/blocked-sites.json`) | `isBlocked`, `markBlocked`, `clearBlocked`, `getBlockedSites` | [[publishing/entities/막힌 사이트]] |
| `server/browser/loginWindow.ts` | 65 | 자동화 없이 앱 전용 프로필 크롬을 띄우는 로그인 창. 어느 블로그용으로 열었는지 기억 | `openLoginWindow`, `closeLoginWindow`, `isLoginWindowOpen`, `loginWindowFor` | [[publishing/business-rules/BR-PUB-017 로그인 창은 한 블로그씩]] |
| `server/browser/mouse.ts` | 74 | 곡선 궤적 마우스 이동·클릭, 커서 오버레이 (`sleep`은 `server/fsutil.ts` 것을 쓴다) | `HumanMouse`, `CURSOR_OVERLAY_SCRIPT` | [[_system/integrations/playwright-chrome]] |
| `server/browser/postHtml.ts` | 38 | `shared/postHtml` 재수출(`BLANK_LINE`, `esc`, `skippedImageLabel`, `tableHtml`, `TAG_GAP_LINES`, `tagLine`, `urlsIn` — `rich`·`TABLE_COLORS` 재수출은 없어짐), 에디터 붙여넣기용 블록 HTML(소제목 태그만 경로마다 다름), 글쓰기 화면 주소 `writeUrl`(세 경로 공용), 네이버용 대체 텍스트 파일 이름 | `pasteBlockHtml`, `writeUrl`, `altFileName` | [[publishing/business-rules/BR-PUB-009 네이버 이미지 파일 이름과 크기]] |

## 발행 단계 (`publish.ts`)
- 단계 하나는 페이지 안에서 동기로 실행되는 JS. `true`면 다음 단계, `false`·`null`이면 0.5초 뒤 다시, `"ERR:<이유>"`면 바로 멈춘다 (`blog-writer:server/browser/publish.ts:68-80`).
- 네이버: 발행 창 열기(상단 "발행", 공개 설정은 바꾸지 않음) → 예약(또는 "현재") → [예약 날짜 → 시·분 → 다시 읽어 확인] → 창 아래 "발행" → 주소가 `postwrite` 등을 벗어나는지 확인 (`blog-writer:server/browser/publish.ts:222-241`). 예약 분은 10분 단위(`NAVER_MINUTE_STEP`)가 아니면 단계를 만들기 전에 `PublishStepError`.
- 티스토리: 하단 "완료" → 공개 → 예약(또는 "현재") → [예약 단계, 1분 단위] → "공개 발행"/"예약 발행" → `manage/newpost`를 벗어나는지 확인 (`blog-writer:server/browser/publish.ts:243-264`).
- 예약 날짜는 입력 칸이 읽기 전용이면 달력에서 다음 달로 넘겨 날짜를 누른다 (`blog-writer:server/browser/publish.ts:144-199`).
- `runPublishSteps`: 단계마다 제한 시간(기본 10초, 날짜 20초, 발행 확인 30초). 마지막 발행 버튼을 누르기 전까지만 중지 요청(`throwIfCancelled`)을 받는다. "발행 확인" 단계는 페이지 이동 중 실행 오류를 다시 시도한다 (`blog-writer:server/browser/publish.ts:266-304`).
- 실패 문구: 발행 버튼 전이면 "임시저장은 했지만 발행 창의 "<단계>"에서 멈췄습니다…", 발행 확인에서 실패하면 "발행 버튼을 눌렀지만 발행됐는지 확인하지 못했습니다…" (`blog-writer:server/browser/publish.ts:301-304`).

## 의존
- 사용하는 모듈: [[_system/modules/server-claude]], [[_system/modules/server-core]] (`jobImageDir`, `jobImagePath`, `DATA_DIR`, `CHROME_PROFILE_DIR`, `sleep`, `throwIfCancelled`), [[_system/modules/shared]] (`postHtml`, `types`의 `NAVER_MINUTE_STEP`·`PublishMode`)
- 사용되는 곳: [[_system/modules/server-pipeline]] (`doPost`가 `PublishRequest`를 세 경로에 넘기고 `PublishStepError`·`kstText`·`publishedText` 사용), [[_system/modules/server-images]] (`webAi.ts`가 `BROWSER_RULES` 등 사용), [[_system/modules/server-routes]] (확장·막힌 블로그·로그인 창 엔드포인트), [[_system/modules/server-claude]] (오류 감지)

## 주의할 점
- 세 경로가 본문을 HTML로 바꾸는 방식이 조금씩 다르다: Claude in Chrome은 소제목을 `<h3>`로, 평소 크롬은 `<p>`로 붙인 뒤 서식을 "소제목"으로 바꾸고(둘 다 `pasteBlockHtml`), 자동 조작은 타이핑한다 → [[publishing/business-rules/BR-PUB-007 소제목 위 빈 줄]].
- 발행 창 단계는 모의 발행 창으로만 시험했고 실제 네이버·티스토리 발행 창에서는 확인되지 않았다 → [[_system/known-issues]].
- 발행은 Claude in Chrome 경로에서는 Claude가 프롬프트대로 직접 하므로, 앱은 돌려받은 status만 믿는다 (발행 창 단계 코드는 평소 크롬·앱 전용 크롬 경로에서만 쓴다).
- 셀렉터·문구 의존이 많다 ([[_system/known-issues]]).
