---
type: integration
project: blog-writer
name: 평소 크롬 + AppleScript (macOS)
source:
  - blog-writer:server/browser/userChrome.ts
updated: 2026-11-02
---
# 평소 크롬 + AppleScript (macOS)

## 무엇을 위해
네이버 블로그(SmartEditor ONE)에 글을 쓴다. 평소 쓰는 크롬은 Playwright가 못 잡고 Claude in Chrome은 네이버를 막으므로, `osascript`로 새 탭을 열어 스크립트를 넣고 붙여넣기 이벤트로 입력한다.

## 전제
- 크롬 메뉴 "보기 > 개발자 > Apple Events의 자바스크립트 허용" 켜기.
- macOS 자동화 권한(시스템 설정 > 개인정보 보호 및 보안 > 자동화)에서 터미널의 크롬 제어 허용.
- 크롬에 네이버 로그인되어 있어야 한다.

## 실패 형태 (`UserChromeProblem`)
`js_disabled`, `not_authorized`, `login`, `editor`, `tab_closed`, `other` — 각각 안내 문구가 있다.

## 주의
- 글을 쓰는 동안 그 탭을 닫지 않는다. macOS 전용이다.
- 모듈: [[_system/modules/server-browser]], 규칙: [[publishing/overview]]
