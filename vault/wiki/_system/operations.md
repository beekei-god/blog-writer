---
type: operations
project: blog-writer
source:
  - blog-writer:README.md:1-79
  - blog-writer:package.json:6-13
  - blog-writer:server/index.ts:7-11
updated: 2026-10-07
---
# 운영

## 사전 준비
- Node.js와 `npm install`. Claude Code CLI(`claude`)가 설치되고 한 번 로그인되어 있어야 한다. 없으면 "`claude` CLI를 찾을 수 없습니다" 오류 (`blog-writer:server/claude.ts:153-158`).
- Google Chrome 설치 (SVG→PNG 렌더링과 자동 조작이 Playwright `channel: "chrome"`을 씀).
- 크롬에 **Claude in Chrome** 확장 설치·로그인 (Claude Code와 같은 계정). 설치 여부는 크롬 프로필의 `Preferences`/`Secure Preferences`에서 확장 ID를 찾아 판단한다 ([[_system/integrations/claude-in-chrome]]).
- 그 크롬에서 네이버·티스토리(와 Gemini/ChatGPT)에 로그인.
- 워드프레스에 올리려면: 설정 → 워드프레스 설정에 https 사이트 주소, 사용자명, wp-admin 프로필에서 만든 **Application Password**를 넣고 연결 확인 ([[_system/integrations/wordpress-rest]]). 호스팅이 `Authorization` 헤더를 지우면 연결되지 않는다.
- 네이버 블로그 + macOS: 크롬 메뉴 **보기 > 개발자 > Apple Events의 자바스크립트 허용** 켜기, macOS 자동화 권한 허용 ([[_system/integrations/chrome-applescript]]).
- 그 밖의 막힌 블로그(티스토리 등): 설정의 그 블로그 카드에서 "로그인 창 열기"로 앱 전용 크롬에 한 번 로그인. 로그인 창은 한 번에 한 블로그만 열 수 있다.
- 선택: 데이터랩 키(설정 화면 또는 `NAVER_CLIENT_ID/SECRET`).

## 실행 / 빌드 명령
| 명령 | 하는 일 |
|---|---|
| `npm run dev` | 서버(`tsx watch`)와 화면(`vite`)을 함께 실행. http://localhost:5173 |
| `npm start` | 서버만 (`tsx server/index.ts`) |
| `npm run build` | 화면 빌드 (`vite build`) — 서버가 빌드 결과를 서빙하지는 않는다 |
| `npm run typecheck` | `tsc --noEmit` (서버·화면·공용·테스트) |
| `npm test` | 자동 테스트 (`vitest run`). 임시 데이터 폴더를 쓰므로 실제 `data/`를 건드리지 않고, Claude·크롬·네트워크를 부르지 않는다 → [[_system/modules/tests]] |

서버를 어느 폴더에서 실행해도 된다. `data/`와 `rules/default-writing-rules.md`는 `server/store.ts` 위치에서 구한 프로젝트 루트 기준이다 (`blog-writer:server/store.ts:9-12`, `blog-writer:server/rules.ts:11-12`). 데이터를 따로 쓰려면 `BLOG_WRITER_DATA_DIR`, 포트는 `PORT`로 바꾼다 (테스트용 앱을 따로 띄울 때).

화면 개발 서버는 `/api`를 `http://127.0.0.1:3001`로 넘긴다. `localhost`로 두면 IPv6(`::1`)로 풀려 같은 포트를 쓰는 다른 프로그램에 붙을 수 있다 (`blog-writer:vite.config.ts:6-9`).

## 로그와 진단
- **작업 진행 로그**: 각 job의 `logs`에 쌓이고 화면 "진행 로그"에 보인다. 서버 콘솔에도 `[jobId 앞 8자] 메시지`로 찍힌다 (`blog-writer:server/store.ts:122-127`).
- **추천 로그**: recommendation의 `logs`.
- **Claude 호출 기록**: `data/usage.jsonl`.
- **자동 조작 실패 스크린샷**: `data/last-error.png`.
- **브라우저 작업**: Claude in Chrome이 연 탭(그룹)을 일부러 닫지 않고 남겨 두므로 크롬에서 멈춘 지점을 볼 수 있다 (README "블로그 작성·이미지 생성이 실패하면").
- 500 오류는 서버 콘솔에 `console.error`로 남는다.

## 자주 생기는 실패와 대처
| 증상 | 원인 | 대처 | 근거 |
|---|---|---|---|
| "확장 프로그램이 설치되어 있지 않습니다" | 크롬 프로필에서 확장 ID를 못 찾음 | 설치 후 크롬 재시작, "연결 확인" | `blog-writer:server/browser/claudeChrome.ts:47-95` |
| "확장 프로그램에 연결하지 못했습니다" | 도구 결과에 `Browser extension is not connected` | 크롬 켜기, 같은 계정 로그인, 크롬 완전 재시작 | `blog-writer:server/claude.ts:125-128` |
| 블로그 입력 중 "막혔습니다" 후 다른 방법으로 진행 | Claude in Chrome 안전 정책(`not allowed due to safety restrictions`) | 자동. 이후 그 플랫폼은 바로 대체 경로 | [[publishing/business-rules/BR-PUB-003 입력 경로 선택과 막힌 사이트 기억]] |
| 네이버: "Apple Events의 자바스크립트 허용을 켜 주세요" | 크롬 설정 꺼짐 | 크롬 메뉴에서 켜기 | `blog-writer:server/browser/userChrome.ts:22`, `:53` |
| 네이버: "macOS가 이 앱의 크롬 제어를 막았습니다" | 자동화 권한 (-1743) | 시스템 설정 > 자동화 | `blog-writer:server/browser/userChrome.ts:23`, `:54` |
| 네이버: "예전에 작성 중이던 글이 불러와져 있어서 멈췄습니다" | 에디터에 이어쓰기 글 | 탭을 닫거나 비우고 다시 | [[publishing/business-rules/BR-PUB-010 이어쓰기 글이 있으면 중단]] |
| 자동 조작: "블로그에 로그인되어 있지 않습니다" | 앱 전용 크롬에 로그인 안 됨 (기다리지 않고 바로 중단) | 설정 → 로그인 창 열기 후 다시 시도 | `blog-writer:server/browser/adapters.ts:152-155` |
| Gemini/ChatGPT "이미지는 만들었지만 파일을 받지 못했습니다" | 크롬 "다운로드 전 저장 위치 확인" 켜짐 등 | 크롬 설정 끄기, `DOWNLOADS_DIR` 확인 | `blog-writer:server/images/webAi.ts:267-270` |
| 이미지 "요청이 거절되었습니다" | 지브리풍 등 화풍·실존 인물 정책 거절 | 다른 스타일/AI | `blog-writer:shared/imageErrors.ts:35-38` |
| "서버가 재시작되어 작업이 중단되었습니다" | 실행 중 서버 종료 (`tsx watch`가 코드 변경 시 재시작하는 경우 포함) | 다시 시도 | `blog-writer:server/store.ts:135-146` |
| 워드프레스: "인증 정보를 받지 못했습니다" | 호스팅·보안 설정이 `Authorization` 헤더를 지움 (`rest_not_logged_in`) | 호스팅 업체에 REST API Authorization 헤더 전달 문의 | `blog-writer:server/wordpress.ts:94-98` |
| 워드프레스: "Application Password가 올바르지 않습니다" / "없는 사용자명" | 로그인 비밀번호·표시 이름을 넣음 | 애플리케이션 비밀번호와 로그인 아이디 입력 | `blog-writer:server/wordpress.ts:99-104` |
| 워드프레스: "예약 시각은 지금보다 1분 이상 뒤여야 합니다" | 지난 시각으로 예약 | 시각을 다시 고르기 | `blog-writer:server/wordpress.ts:255-260` |
| 로그인 창: "○○ 로그인 창이 열려 있습니다" (409) | 다른 블로그 로그인 창이 열려 있음 | 그 창에서 "로그인 완료(창 닫기)" 후 다시 | `blog-writer:server/routes/browser.ts:100-103` |
| 플랜 한도 초과 | Claude 계정 한도 | 사용량 화면에서 초기화 시각 확인 | [[usage/overview]] |
