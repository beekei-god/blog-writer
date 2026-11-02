---
type: integration
project: blog-writer
name: Claude in Chrome 확장
source:
  - blog-writer:server/browser/claudeChrome.ts
  - blog-writer:server/browser/blockedSites.ts
updated: 2026-11-02
---
# Claude in Chrome 확장

## 무엇을 위해
Tistory 같은 블로그에 글을 올리고 Gemini/ChatGPT 웹에서 이미지를 만들 때, `claude -p --chrome`으로 사용자의 크롬을 조작한다. 설치: https://claude.ai/chrome (Claude Code와 같은 계정 로그인).

## 동작
- 연결 여부를 기억해 두었다가 설정 화면에 보여 준다(`rememberConnection`).
- 안전 정책으로 막힌 사이트는 `SiteBlockedError`로 구분하고, 차단 목록을 `data/blocked-sites.json`에 저장해 다음부터 다른 방식으로 보낸다. 네이버는 막혀 있어 AppleScript 방식을 쓴다 → [[_system/integrations/chrome-applescript]]

## 실패 형태
확장 미설치/미연결(`NOT_CONNECTED_TEXT`), 사이트 차단(`SITE_BLOCKED_TEXT`), 로그인 풀림.

## 주의
- 같은 크롬을 동시에 쓰면 꼬이므로 브라우저 작업은 한 줄로 세운다(`enqueueBrowser`) → [[_system/modules/server-pipeline]]
- 모듈: [[_system/modules/server-browser]]
