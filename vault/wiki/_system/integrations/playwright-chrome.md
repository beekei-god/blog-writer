---
type: integration
project: blog-writer
name: Playwright + 앱 전용 크롬 프로필
source:
  - blog-writer:server/browser/runner.ts
  - blog-writer:server/browser/loginWindow.ts
  - blog-writer:server/browser/mouse.ts
updated: 2026-11-02
---
# Playwright + 앱 전용 크롬 프로필

## 무엇을 위해
예전 자동 조작 방식. 앱 전용 크롬 프로필(`data/chrome-profile`, 로그인 유지)을 `playwright-core`로 띄워 마우스·키보드로 입력한다. 이미지 생성 웹 방식, Tistory 등 일부 경로와 로그인 창에 쓴다.

## 동작
- `CHROME_PATH`로 크롬 경로 지정, `BW_HEADLESS`는 시험용.
- 사람처럼 보이는 마우스 이동(`HumanMouse`).
- 로그인 창(`loginWindow`)과 자동 조작이 같은 프로필을 쓰므로, 자동 조작 중에는 로그인 창을 열지 못하고(`isAutomationRunning`) 로그인 창을 열기 전에 남은 자동 조작 창을 닫는다.

## 주의
- 같은 프로필을 두 창이 동시에 쓰면 깨진다.
- 모듈: [[_system/modules/server-browser]]
