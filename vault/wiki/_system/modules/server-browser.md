---
type: module
project: blog-writer
module: server-browser
paths: [server/browser/**]
source:
  - blog-writer:server/browser/blogPost.ts
  - blog-writer:server/browser/userChrome.ts
  - blog-writer:server/browser/runner.ts
updated: 2026-11-02
---
# server-browser (블로그 자동 조작)

## 역할
네이버·티스토리에 글을 입력·저장·발행하는 세 가지 방식 → [[publishing/implementations/blog-writer 구현]]

## 주요 파일과 export
| 파일 | 역할 |
|---|---|
| `claudeChrome.ts` | 확장 설치 확인, `BROWSER_RULES`, 오류 클래스(`ChromeExtensionError`, `SiteBlockedError`) |
| `blogPost.ts` | Claude in Chrome으로 입력(`postWithClaudeInChrome`, `buildSegments`) |
| `userChrome.ts`(632줄) | 평소 크롬 + AppleScript(`postNaverInUserChrome`, `readNaverCategories`) |
| `runner.ts`, `adapters.ts`, `mouse.ts`, `loginWindow.ts` | 앱 전용 크롬(Playwright), 블로그별 어댑터, 사람 같은 마우스, 로그인 창 |
| `publish.ts`, `category.ts` | 발행 창 단계, 카테고리·주제 단계 |
| `blockedSites.ts`, `postHtml.ts` | 차단 기록, 붙여넣기 HTML |

## 의존하는 모듈 / 쓰이는 곳
`pipeline.ts`, 라우트(`browser.ts`, `categories.ts`), `images/webAi.ts`(확장 규칙 공유).

## 주의할 점
- 블로그 화면에 의존하는 스크립트라 화면이 바뀌면 깨진다 → [[_system/known-issues]]
- 같은 크롬 프로필을 동시에 쓰지 않도록 호출자가 직렬화해야 한다.
