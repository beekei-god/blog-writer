---
type: integration
project: blog-writer
system: Playwright + 설치된 Google Chrome
confidence: high
source:
  - blog-writer:server/browser/runner.ts:1-99
  - blog-writer:server/browser/adapters.ts:1-406
  - blog-writer:server/browser/mouse.ts:1-74
  - blog-writer:server/browser/loginWindow.ts:1-65
  - blog-writer:server/images/svg.ts:66-79
updated: 2026-10-09
---
# Playwright + Chrome

## 무엇에 쓰나
1. **SVG → PNG**: 헤드리스 크롬(JS 끔, http(s) 요청 모두 차단)에 SVG를 띄우고 스크린샷 (`blog-writer:server/images/svg.ts:66-79`).
2. **앱 전용 크롬 자동 조작**: Claude in Chrome이 막은 블로그를 평소 크롬 대신 `data/chrome-profile` 프로필 크롬으로 입력 (`blog-writer:server/browser/runner.ts:9-12`). 네이버+macOS는 이 경로 대신 AppleScript를 쓴다.
3. **로그인 창**: Playwright 없이 크롬 실행 파일을 같은 프로필로 직접 띄워 사용자가 로그인 (`blog-writer:server/browser/loginWindow.ts:33-53`). 어느 블로그(네이버/티스토리)용 창인지 기억하고, 한 번에 하나만 연다 → [[publishing/business-rules/BR-PUB-017 로그인 창은 한 블로그씩]].

## 호출 방식
- `chromium.launchPersistentContext(CHROME_PROFILE_DIR, { channel: "chrome", headless: BW_HEADLESS==="1", viewport: null, args: ["--start-maximized", "--disable-blink-features=AutomationControlled"], ignoreDefaultArgs: ["--enable-automation", "--use-mock-keychain", "--password-store=basic"], acceptDownloads: true })` (`blog-writer:server/browser/runner.ts:54-66`). 키체인 관련 인자를 빼서 로그인 창(일반 크롬)과 같은 쿠키를 읽게 한다.
- 같은 프로필을 두 프로세스가 열 수 없으므로: 이전 자동 조작 창을 닫고, 로그인 창이 열려 있으면 닫고 진행 (`blog-writer:server/browser/runner.ts:47-52`). 로그인 창은 자동 조작 중이면 열 수 없다 (`blog-writer:server/routes/browser.ts:93-95`).
- 입력은 `HumanMouse`(베지어 곡선 이동, 요소 안 임의 지점 클릭)와 `keyboard.type`(글자마다 12~37ms 지연). 표는 HTML paste 이벤트, 실패하면 "• 헤더: 값 / …" 목록으로 타이핑 (`blog-writer:server/browser/adapters.ts:99-126`).
- 작업 후 창은 열어 둔다(`keepOpen: true`) — 사용자가 확인·발행 (`blog-writer:server/browser/runner.ts:88-99`).
- 예약발행·자동발행(2026-10-09): `postWithChrome(..., publish)`로 받은 요청을 어댑터가 임시저장 뒤 `publishIfAsked`로 처리한다. 발행 창 단계 JS를 `page.evaluate`(네이버는 에디터가 `#mainFrame` 안이면 그 프레임)로 실행한다 (`blog-writer:server/browser/adapters.ts:23-35`, `:287`, `:399`) → [[_system/integrations/blog-editors]].

## 실패 처리
- 로그인 페이지로 가면 기다리지 않고 바로 오류로 멈춘다. 직접 로그인하지 않으며, 설정의 "블로그 로그인 창 열기"로 로그인한 뒤 다시 시도하게 안내한다 (`blog-writer:server/browser/adapters.ts:165-168`, 2026-10-05 수정).
- 실패 시 `data/last-error.png` 스크린샷 (`blog-writer:server/browser/runner.ts:80-84`).
- 임시저장 버튼을 못 찾으면 "직접 저장해 주세요" 오류.

## 정책 위험 (사용자 책임)
자동화 표시를 끄고 사람 같은 마우스·타이핑을 쓰는 설정은 유지하기로 했다(2026-10-05). 대상 블로그 서비스의 자동화 관련 약관·정책에 맞는지는 사용자가 확인해야 한다.

## 바깥 변화에 취약한 지점
블로그 에디터 셀렉터·버튼 이름 → [[_system/integrations/blog-editors]]. 자동화 탐지 회피 성격의 설정 ([[_system/known-issues]] #10). `CHROME_PATH`가 여기에는 적용되지 않음 (#11).
