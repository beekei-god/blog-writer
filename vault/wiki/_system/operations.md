---
type: operations
project: blog-writer
source:
  - blog-writer:README.md:1-274
  - blog-writer:package.json:6-13
  - blog-writer:server/index.ts:7-11
updated: 2026-10-09
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
- 카테고리(2026-10-09): 워드프레스는 연결만 되어 있으면 사이트에서 바로 읽는다. 네이버·티스토리는 올리기 화면의 "목록 불러오기"를 한 번 눌러야 목록이 생긴다(네이버는 macOS+평소 크롬 필요, 티스토리는 앱 전용 크롬에 로그인). 목록은 `data/categories.json`에 저장되고 블로그 ID가 바뀌면 다시 불러와야 한다.
- 선택: 데이터랩 키(설정 화면 또는 `NAVER_CLIENT_ID/SECRET`).
- 선택(2026-10-09): 키워드 탐색 탭을 쓰려면 네이버 검색광고 계정의 "API 사용 관리"에서 받은 고객 ID·API 키·비밀 키를 설정 → 네이버 검색광고 API 설정에 넣는다(또는 `SEARCHAD_CUSTOMER_ID/API_KEY/SECRET_KEY`). 키가 없으면 키워드 탐색은 설정 안내만 보인다. 구글 트렌드는 키가 필요 없다. 실제 API로는 아직 확인되지 않았다 → [[_system/known-issues]] #34.

## 실행 / 빌드 명령
| 명령 | 하는 일 |
|---|---|
| `npm run dev` | 서버(`tsx watch`)와 화면(`vite`)을 함께 실행. http://localhost:5173 |
| `npm start` | 서버만 (`tsx server/index.ts`) |
| `npm run build` | 화면 빌드 (`vite build`) — 서버가 빌드 결과를 서빙하지는 않는다 |
| `npm run typecheck` | `tsc --noEmit` (서버·화면·공용·테스트) |
| `npm test` | 자동 테스트 (`vitest run`). 임시 데이터 폴더를 쓰므로 실제 `data/`를 건드리지 않고, Claude·크롬·네트워크를 부르지 않는다 → [[_system/modules/tests]] |

서버를 어느 폴더에서 실행해도 된다. `data/`와 `rules/default-writing-rules.md`는 `server/store.ts` 위치에서 구한 프로젝트 루트 기준이다 (`blog-writer:server/store.ts:9-12`, `blog-writer:server/rules.ts:11-12`). 데이터를 따로 쓰려면 `BLOG_WRITER_DATA_DIR`, 포트는 `PORT`로 바꾼다 (테스트용 앱을 따로 띄울 때).

화면 개발 서버는 `/api`를 `http://127.0.0.1:5172`로 넘긴다. `localhost`로 두면 IPv6(`::1`)로 풀려 같은 포트를 쓰는 다른 프로그램에 붙을 수 있다 (`blog-writer:vite.config.ts:6-9`).

## 로그와 진단
- **작업 진행 로그**: 각 job의 `logs`에 쌓이고 화면 "진행 로그"에 보인다. 서버 콘솔에도 `[jobId 앞 8자] 메시지`로 찍힌다 (`blog-writer:server/store.ts:118-123`).
- **추천 로그**: recommendation의 `logs`.
- **Claude 호출 기록**: `data/usage.jsonl`.
- **자동 조작 실패 스크린샷**: `data/last-error.png`.
- **브라우저 작업**: Claude in Chrome이 연 탭(그룹)을 일부러 닫지 않고 남겨 두므로 크롬에서 멈춘 지점을 볼 수 있다 (`blog-writer:README.md:226`).
- 500 오류는 서버 콘솔에 `console.error`로 남는다.
- **카테고리·주제 진단** (2026-10-09): 올릴 때 카테고리·주제를 못 고르면 멈추지 않고 진행 로그에 "<단계>: <이유>"(확인 필요)와 그 순간의 화면 구조를 남긴다(주제 팝업은 정리 스크립트로 닫음). 로그 첫 줄 "<블로그> 작성 시작 (…, 카테고리: X, 주제: Y)"과 "네이버 주제: X (글 내용을 보고 정함)"로 무엇을 요청했는지 본다. 목록 불러오기가 실패하면 화면의 오류 상자에 "카테고리 목록을 불러오지 못했습니다: <원인>"과 함께 **화면 구조(글 본문 제외, 최대 3,000자)** 가 붙고 서버 콘솔에 `[카테고리 naver|tistory] …`로 단계가 찍힌다. 화면 구조에서 "카테고리"/"주제" 글자와 목록 항목이 어떤 모양인지 보고 `server/browser/category.ts`의 찾는 규칙을 고친다 → [[_system/integrations/blog-editors]].
- **글 고치기 진단**: 진행 로그에 "프롬프트로 글 전체/블록 #a~#b를 고치는 중", "웹 검색: …", "페이지 읽는 중: …", 끝나면 "고친 결과가 준비됐습니다…", 실패하면 "글 고치기 실패: <이유>". 제안은 `data/jobs/<id>.json`의 `editProposal`(status running/ready/failed)에서 볼 수 있다.

## 자주 생기는 실패와 대처
| 증상 | 원인 | 대처 | 근거 |
|---|---|---|---|
| "확장 프로그램이 설치되어 있지 않습니다" | 크롬 프로필에서 확장 ID를 못 찾음 | 설치 후 크롬 재시작, "연결 확인" | `blog-writer:server/browser/claudeChrome.ts:47-95` |
| "확장 프로그램에 연결하지 못했습니다" | 도구 결과에 `Browser extension is not connected` | 크롬 켜기, 같은 계정 로그인, 크롬 완전 재시작 | `blog-writer:server/claude.ts:125-128` |
| 블로그 입력 중 "막혔습니다" 후 다른 방법으로 진행 | Claude in Chrome 안전 정책(`not allowed due to safety restrictions`) | 자동. 이후 그 플랫폼은 바로 대체 경로 | [[publishing/business-rules/BR-PUB-003 입력 경로 선택과 막힌 사이트 기억]] |
| 키워드 탐색: "먼저 설정에서 네이버 검색광고 API 키를 연결하세요." (400) | 검색광고 키 미설정 | 설정 → 네이버 검색광고 API 설정에 세 값 입력 | `blog-writer:server/routes/keywords.ts:19` |
| 키워드 탐색/키 저장: "검색광고 키가 올바르지 않습니다 (401/403)" | 고객 ID·API 키·비밀 키 오기입, 다른 서비스 키 사용(개발자센터·NCP 키 아님), 시계 오차로 서명 불일치 가능 | 세 값 다시 확인, 컴퓨터 시각 확인 | `blog-writer:server/searchad.ts:94-96` |
| 키워드 탐색: "검색광고 API 호출 한도를 넘었습니다 (429)" | 짧은 시간에 호출이 많음(키워드 5개마다 1회) | 잠시 뒤 다시 | `blog-writer:server/searchad.ts:97` |
| "지금 뜨는 검색어" 덩어리만 오류("구글 트렌드…") | 구글 트렌드 RSS 연결 실패·응답 형식 변경 | 다른 덩어리는 정상. 키워드를 직접 입력해 쓰고, 계속되면 `trends.ts` 파싱 확인 → [[_system/integrations/google-trends]] | `blog-writer:server/trends.ts:46-53` |
| 네이버: "Apple Events의 자바스크립트 허용을 켜 주세요" | 크롬 설정 꺼짐 | 크롬 메뉴에서 켜기 | `blog-writer:server/browser/userChrome.ts:25`, `:54` |
| 네이버: "macOS가 이 앱의 크롬 제어를 막았습니다" | 자동화 권한 (-1743) | 시스템 설정 > 자동화 | `blog-writer:server/browser/userChrome.ts:26`, `:55` |
| 네이버: "예전에 작성 중이던 글이 불러와져 있어서 멈췄습니다" | 에디터에 이어쓰기 글 | 탭을 닫거나 비우고 다시 | [[publishing/business-rules/BR-PUB-010 이어쓰기 글이 있으면 중단]] |
| 자동 조작: "블로그에 로그인되어 있지 않습니다" | 앱 전용 크롬에 로그인 안 됨 (기다리지 않고 바로 중단) | 설정 → 로그인 창 열기 후 다시 시도 | `blog-writer:server/browser/adapters.ts:174-177` |
| Gemini/ChatGPT "이미지는 만들었지만 파일을 받지 못했습니다" | 크롬 "다운로드 전 저장 위치 확인" 켜짐 등 | 크롬 설정 끄기, `DOWNLOADS_DIR` 확인 | `blog-writer:server/images/webAi.ts:261-266` |
| 이미지 "요청이 거절되었습니다" | 지브리풍 등 화풍·실존 인물 정책 거절 | 다른 스타일/AI | `blog-writer:shared/imageErrors.ts:37-40` |
| "서버가 재시작되어 작업이 중단되었습니다" | 실행 중 서버 종료 (`tsx watch`가 코드 변경 시 재시작하는 경우 포함) | 다시 시도 | `blog-writer:server/store.ts:131-149` |
| 워드프레스: "인증 정보를 받지 못했습니다" | 호스팅·보안 설정이 `Authorization` 헤더를 지움 (`rest_not_logged_in`) | 호스팅 업체에 REST API Authorization 헤더 전달 문의 | `blog-writer:server/wordpress.ts:94-98` |
| 워드프레스: "Application Password가 올바르지 않습니다" / "없는 사용자명" | 로그인 비밀번호·표시 이름을 넣음 | 애플리케이션 비밀번호와 로그인 아이디 입력 | `blog-writer:server/wordpress.ts:99-104` |
| 워드프레스: "예약 시각은 지금보다 1분 이상 뒤여야 합니다" | 지난 시각으로 예약 | 시각을 다시 고르기 | `blog-writer:server/wordpress.ts:248-253` |
| 네이버·티스토리: "임시저장은 했지만 발행 창의 "<단계>"에서 멈췄습니다" (상태는 블로그 임시저장 완료) | 발행 창 버튼·예약 칸을 화면 글자로 찾지 못함, 예약 시각 확인 불일치, 발행 창 모양이 예상과 다름 등. 멈추면 진행 로그 바로 아래 "발행 창 구조 (문제 확인용…)"에 그 순간의 버튼·입력 칸 목록이 남으니 그것으로 원인을 본다 | 크롬에 열린 탭에서 직접 발행하거나 "글 상태"로 맞추기 | `blog-writer:server/browser/publish.ts:371-374`, `blog-writer:server/browser/userChrome.ts:531-532` |
| 네이버·티스토리: "발행 버튼을 눌렀지만 발행됐는지 확인하지 못했습니다" | 마지막 버튼 뒤 30초 안에 글쓰기 화면을 벗어나지 않음 | 블로그에서 공개·예약 여부를 직접 확인 후 "글 상태" 변경 | `blog-writer:server/browser/publish.ts:261-266` |
| "네이버 예약 시각은 10분 단위로 고를 수 있습니다." (400) | 네이버 예약 분이 10의 배수가 아님 | 10분 단위로 다시 고르기 | `blog-writer:server/routes/jobs.ts:148-150` |
| 이미지 "사이트에서 오류가 났습니다" (`site_error`) | Gemini·ChatGPT 사이트가 "문제가 발생했습니다" 같은 오류를 보임 | 잠시 뒤 다시, 또는 API·다른 AI로 | `blog-writer:shared/imageErrors.ts:81-85` |
| 로그인 창: "○○ 로그인 창이 열려 있습니다" (409) | 다른 블로그 로그인 창이 열려 있음 | 그 창에서 "로그인 완료(창 닫기)" 후 다시 | `blog-writer:server/routes/browser.ts:100-103` |
| 카테고리 "목록 불러오기" 실패: "카테고리 목록을 불러오지 못했습니다: …" (502) | 에디터에서 카테고리 칸을 못 찾음(화면 구조가 예상과 다름), 로그인 안 됨, 이어쓰기 글이 남아 있음. 400이면 블로그 ID 미입력 또는 네이버를 macOS가 아닌 곳에서 시도 | 오류에 붙은 화면 구조를 확인. 로그인·Apple Events 설정 점검. 네이버는 읽은 뒤 자동 임시저장이 남았다면 다음 글쓰기의 "작성 중인 글" 팝업은 앱이 취소함 | `blog-writer:server/routes/categories.ts:43-67` |
| 올렸는데 카테고리·주제가 기본으로 들어감 ("확인 필요" 로그) | 선택 단계(`optional`)가 이름을 못 찾거나 못 눌렀음. 네이버 카테고리·주제는 발행 창에서만 고르므로 **임시저장에는 적용되지 않음** | 진행 로그의 이유·화면 구조 확인 후 블로그에서 직접 지정 | `blog-writer:server/browser/publish.ts:324-332` |
| 글 고치기 "글 고치기 실패: …" | Claude 호출 실패·시간 초과(20분)·결과 검증 실패(이미지 블록을 바꿈·빠뜨림) | 같은 요청으로 다시, 또는 요청을 구체적으로. 글은 그대로이므로 안전 | `blog-writer:server/editPost.ts:111-190` |
| 글 고치기 "바꿀 부분이 없다고 판단했습니다: …" | Claude가 바꿀 것이 없다고 봄 | 요청을 더 구체적으로 써서 다시 | `blog-writer:server/editPost.ts:179-180` |
| 글 고치기 "서버가 재시작되어 글 고치기가 중단되었습니다." | 만드는 중 서버 종료 (`tsx watch` 재시작 포함) | "요청을 고쳐서 다시 만들기" 또는 버리기. 글은 그대로 | `blog-writer:server/store.ts:130-149` |
| 글 고치기 적용 409 "그 사이 글이 바뀌어서 적용할 수 없습니다…" | 제안을 만든 뒤 그 범위를 직접 고쳤거나 이미지를 추가·삭제함 | 같은 요청으로 다시 만들기 | `blog-writer:server/routes/edit.ts:34-56` |
| 글 고치기·이미지 추가·삭제 409 "진행 중인 작업이 끝난 뒤에 …" | 다른 작업이나 만드는 중인 제안이 있음 (블록 번호가 밀리므로 막음). 중지 뒤에야 제안을 버릴 수 있음 | 끝나길 기다리거나 "중지" | `blog-writer:server/routes/images.ts:143-200` |
| 플랜 한도 초과 | Claude 계정 한도 | 사용량 화면에서 초기화 시각 확인 | [[usage/overview]] |
