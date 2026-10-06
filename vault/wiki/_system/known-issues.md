---
type: known-issues
project: blog-writer
updated: 2026-10-07
---
# 알려진 이슈 / 기술 부채

코드에 TODO/FIXME 표시는 없다. 아래는 코드를 읽으며 보인 것이다.

| # | 종류 | 내용 | 근거 | 영향 |
|---|---|---|---|---|
| 1 | 해결됨 (2026-10-05) | ~~화면 태그 입력에 개수 제한이 없어 31개째에서 자동 저장이 실패~~ → 화면이 30개에서 입력을 막도록 수정 | `blog-writer:src/job/PostEditor.tsx:8-48` | → [[writing/business-rules/BR-WRT-004 태그 최대 30개]] |
| 2 | 해결됨 (2026-10-05) | ~~기본 규칙은 스마트블록 태그를 권장, 프롬프트는 금지, 서버는 거르지 않음~~ → 규칙 문서에서 삭제, 서버가 그 출처 태그를 제거 | `blog-writer:rules/default-writing-rules.md:31-36`, `blog-writer:server/writer.ts:233-236` | → [[writing/business-rules/BR-WRT-006 스마트블록 주제 태그 금지]] |
| 3 | 해결됨 (2026-10-05, 실제 에디터 확인 전) | ~~앱 전용 크롬 자동 조작이 블록 사이마다 빈 줄을 넣음~~ → 소제목 위에만 한 줄 | `blog-writer:server/browser/adapters.ts:138-139` | → [[publishing/business-rules/BR-PUB-007 소제목 위 빈 줄]] |
| 4 | 해결됨 (2026-10-07) | ~~미사용 코드: `classifyReply`, `schema.ts`의 `imageSpec`, `STYLE_LABEL_KO`, `HumanMouse.idle`·`speed` 인자~~ → 리팩터링에서 모두 삭제. 그 밖에 쓰이지 않던 화면 변수 3개와 이미지 생성 함수의 `settings` 인자도 삭제 | `blog-writer:server/browser/mouse.ts:35-38` | 없음 |
| 5 | 예외 처리 | `BlogLoginRequired`를 던지지만 따로 잡는 곳이 없어 일반 실패와 같게 처리된다 | `blog-writer:server/browser/blogPost.ts:116`, `:206` | 로그인 문제를 화면이 구분 못 함 (자동 조작 로그 문구로만 추정, `blog-writer:src/job/JobDetail.tsx:203-210`) |
| 6 | 부분 해결 (2026-10-05) | 이미지를 다시 만들거나 올리면 예전 파일을 지운다. 단, 재생성이 실패해 파일 참조가 사라진 경우 예전 파일은 고아로 남는다 | `blog-writer:server/images/index.ts:33-61`, `blog-writer:server/store.ts:85-89` | `data/images` 용량 |
| 7 | 외부 의존 (취약) | 네이버 "함께 많이 찾는"은 공개 API가 아니라 검색 결과 HTML에서 내부 요청 주소를 정규식으로 꺼내 다시 부른다 | `blog-writer:server/naver.ts:45-68` | 네이버 화면 변경 시 태그 후보가 조용히 비게 됨 |
| 8 | 외부 의존 (취약) | 블로그 에디터·Gemini·ChatGPT의 CSS 셀렉터와 화면 문구(`.se-documentTitle`, `#post-title-inp`, `save_btn`, "임시저장이 완료" 등)에 의존 | `blog-writer:server/browser/adapters.ts`, `blog-writer:server/browser/userChrome.ts`, `blog-writer:server/images/webAi.ts:19-32` | UI 개편 시 입력 실패 → [[_system/integrations/blog-editors]] |
| 9 | 외부 의존 (취약) | Claude in Chrome 연결·차단 여부를 도구 결과 문구 정규식으로 판단 | `blog-writer:server/browser/claudeChrome.ts:28`, `:38` | 문구가 바뀌면 감지 실패 |
| 10 | 자동화 탐지 회피 성격 | 앱 전용 크롬 자동 조작은 `--disable-blink-features=AutomationControlled`, `--enable-automation` 제거, 사람 같은 곡선 마우스 이동·랜덤 타이핑 지연을 쓴다 | `blog-writer:server/browser/runner.ts:58-63`, `blog-writer:server/browser/mouse.ts:35-74`, `blog-writer:server/browser/adapters.ts:68` | 블로그 서비스 약관상 자동화 정책 확인 필요 → [[publishing/open-questions]] **결정 (2026-10-05): 설정을 유지하며, 대상 블로그의 자동화 관련 약관 확인은 사용자 책임이다.** |
| 11 | 설정 불일치 | `CHROME_PATH`는 로그인 창에만 쓰이고, Playwright 자동 조작·SVG 렌더링은 `channel: "chrome"` 기본 경로를 쓴다 | `blog-writer:server/browser/loginWindow.ts:29`, `blog-writer:server/browser/runner.ts:53-54`, `blog-writer:server/images/svg.ts:66` | 비표준 위치의 크롬이면 일부만 동작 |
| 12 | 동시성 | 진행 중 여부(`running`, 추천 `running`, 로그인 창 `proc`)가 메모리에만 있어 서버를 여러 개 띄우면 보호되지 않는다. 다른 저장은 2026-10-07에 공용 원자적 쓰기로 통일했지만, 막힌 사이트 파일과 새 추천의 첫 파일은 아직 바로 쓴다 | `blog-writer:server/pipeline.ts:21`, `blog-writer:server/recommend.ts:17`, `:158`, `blog-writer:server/browser/blockedSites.ts:28-33` | 단일 사용자 전제라 영향 작음 |
| 13 | 해결됨 (2026-10-05) | ~~표 빈 칸 행 제거는 작성 직후에만~~ → 저장(PUT)에서도 같은 필터 적용. 편집 중 임시 빈 칸 행은 저장 때 사라질 수 있음 | `blog-writer:server/routes/jobs.ts:90-93` | → [[writing/business-rules/BR-WRT-007 빈 칸 있는 표 행 제거]] |
| 14 | 해결됨 (2026-10-05) | ~~이름이 맞지 않아도 "시작 이후 새로 생긴 이미지"를 다운로드 폴더에서 옮겨 옴~~ → `blogwriter-<이름>`으로 시작하는 파일만 사용. 사이트 다운로드 버튼으로 받은 이름이 다른 파일은 회수하지 못함 | `blog-writer:server/images/webAi.ts:121-143` | → [[_system/integrations/gemini-chatgpt-web]] |
| 15 | 하드코딩 | 네이버 자동완성 엔드포인트·파라미터, 데이터랩 엔드포인트, 확장 ID, Gemini/ChatGPT URL이 코드에 고정 | `blog-writer:server/naver.ts:3-5`, `blog-writer:server/datalab.ts:11`, `blog-writer:server/browser/claudeChrome.ts:9` | 외부 변경 시 수정 필요 |
| 16 | 화면 표시 | 미리보기 태그 줄은 공백이 든 태그를 그대로(`#새 태그`) 보여 주지만, 실제 입력·복사는 공백을 지운다(`#새태그`) | `blog-writer:src/job/Preview.tsx:182`, `blog-writer:shared/postHtml.ts:58` | 미리보기와 결과가 다름 |
| 17 | 외부 의존 (취약) | 워드프레스 API 등록은 호스팅이 `Authorization` 헤더를 지우면 동작하지 않는다 (`rest_not_logged_in`). 앱에서 고칠 수 없고 원인만 안내한다 | `blog-writer:server/wordpress.ts:94-98` | → [[_system/integrations/wordpress-rest]] |
| 18 | 상태 동기화 | 워드프레스에 예약발행한 글은 예약 시각이 지나도 앱 상태가 자동으로 "발행 완료"가 되지 않는다(사이트를 다시 조회하지 않음). 사용자가 수기로 바꾼다 | `blog-writer:server/routes/jobs.ts:145-177` | → [[writing/open-questions]] |
| 19 | 테스트 범위 | 자동 테스트는 서버·공용 코드만 다룬다. 화면(React)과 크롬·Claude 경로는 테스트가 없다 | `blog-writer:vitest.config.ts:1-10` | → [[_system/modules/tests]] |
