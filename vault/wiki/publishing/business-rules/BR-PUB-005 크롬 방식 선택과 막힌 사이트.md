---
type: business-rule
domain: publishing
id: BR-PUB-005
name: 크롬 방식 선택과 막힌 사이트
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/pipeline.ts:doPost
  - blog-writer:server/browser/blockedSites.ts:1-37
  - blog-writer:server/browser/userChrome.ts:1-45
  - blog-writer:server/browser/runner.ts
entities: [블로그 설정]
updated: 2026-11-04
---
# BR-PUB-005 크롬 방식 선택과 막힌 사이트

## 규칙
네이버·티스토리는 먼저 **Claude in Chrome**(사용자가 평소 쓰는 크롬 + 로그인 그대로)으로 시도한다. 확장 프로그램이 안전 정책으로 그 사이트 접속을 막으면(`SiteBlockedError`) **그 제한을 우회하지 않고** 다른 방법으로 이어서 하고, 막힌 블로그를 `data/blocked-sites.json`에 기억해 다음부터는 바로 그 방법으로 간다. 설정 화면에서 지우면 다시 Claude in Chrome부터 시도한다.

대체 방법:
- **네이버 + macOS**: 평소 크롬의 새 탭을 AppleScript로 조작하고 SmartEditor ONE에 붙여넣기 이벤트로 입력(`userChrome.ts`). 크롬 메뉴 "보기 > 개발자 > Apple Events의 자바스크립트 허용"과 macOS 자동화 권한이 필요하다.
- **그 밖**: 앱 전용 크롬 프로필(`data/chrome-profile`)을 Playwright로 띄워 마우스·키보드로 입력(`runner.ts`, `adapters.ts`). 로그인 창과 같은 프로필을 두 프로세스가 동시에 열 수 없어 로그인 창이 열려 있으면 닫고 진행한다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 블로그가 막힌 목록에 있음 | Claude in Chrome 시도 없이 대체 방법 |
| Claude in Chrome이 접속 차단 | 차단 기록 + 대체 방법으로 이어서 진행 |
| 로그인 필요 | 멈추고 로그인하게 안내(직접 로그인하지 않음) |
| Apple Events/자동화 권한 없음 | 문제 종류별 안내(`UserChromeProblem`) |
| 크롬 작업 동시 실행 | `enqueueBrowser` 직렬 큐로 하나씩 |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 서버 | `postWithClaudeInChrome`, `assertExtensionInstalled` | 1순위 | `blog-writer:server/browser/blogPost.ts`, `claudeChrome.ts` |
| 서버 | `isBlocked`/`markBlocked`/`clearBlocked` | 차단 기록 | `blog-writer:server/browser/blockedSites.ts` |
| 서버 | `postNaverInUserChrome`, `userChromeSupported`(macOS만) | 평소 크롬 | `blog-writer:server/browser/userChrome.ts` |
| 서버 | `postWithChrome`, `withChrome` | 앱 전용 크롬 | `blog-writer:server/browser/runner.ts` |
| 서버 | `enqueueBrowser` | Claude in Chrome·크롬 이미지와 같은 큐 | `blog-writer:server/pipeline.ts:16` |

## 예외 / 경계값 · 변경 시 같이 볼 곳
- 새 블로그를 추가하려면 `Platform` 타입, `PLATFORMS`, 레이블, 어댑터(`adapters.ts`), Claude in Chrome 프롬프트, `settingsFor`, 설정 화면, 라우트 검사를 고친다 → [[_system/extending]]

## 영향받는 플로우
[[publishing/flows/블로그에 올리기]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-11-02 | wiki 재생성 때 코드(73f47a6) 기준으로 작성 | 코드 |
| 2026-11-04 | 평소 크롬 글쓰기 탭을 보이는 일반 창(시크릿·최소화 제외)에 붙이고, 일반 창이 없으면 맨 앞 창, 창이 없을 때만 새 창에 열며 창 목록을 로그에 남김 | 커밋 579a735 |
