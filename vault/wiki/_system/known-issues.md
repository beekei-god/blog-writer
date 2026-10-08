---
type: known-issues
project: blog-writer
updated: 2026-10-09
---
# 알려진 이슈 / 기술 부채

코드에 TODO/FIXME 표시는 없다. 아래는 코드를 읽으며 보인 것이다.

| # | 종류 | 내용 | 근거 | 영향 |
|---|---|---|---|---|
| 1 | 해결됨 (2026-10-05) | ~~화면 태그 입력에 개수 제한이 없어 31개째에서 자동 저장이 실패~~ → 화면이 30개에서 입력을 막도록 수정 | `blog-writer:src/job/PostEditor.tsx:9-49` | → [[writing/business-rules/BR-WRT-004 태그 최대 30개]] |
| 2 | 해결됨 (2026-10-05) | ~~기본 규칙은 스마트블록 태그를 권장, 프롬프트는 금지, 서버는 거르지 않음~~ → 규칙 문서에서 삭제, 서버가 그 출처 태그를 제거 | `blog-writer:rules/default-writing-rules.md:31-36`, `blog-writer:server/writer.ts:237-240` | → [[writing/business-rules/BR-WRT-006 스마트블록 주제 태그 금지]] |
| 3 | 해결됨 (2026-10-05, 실제 에디터 확인 전) | ~~앱 전용 크롬 자동 조작이 블록 사이마다 빈 줄을 넣음~~ → 소제목 위에만 한 줄 | `blog-writer:server/browser/adapters.ts:148-149` | → [[publishing/business-rules/BR-PUB-007 소제목 위 빈 줄]] |
| 4 | 해결됨 (2026-10-07) | ~~미사용 코드: `classifyReply`, `schema.ts`의 `imageSpec`, `STYLE_LABEL_KO`, `HumanMouse.idle`·`speed` 인자~~ → 리팩터링에서 모두 삭제. 그 밖에 쓰이지 않던 화면 변수 3개와 이미지 생성 함수의 `settings` 인자도 삭제 | `blog-writer:server/browser/mouse.ts:35-38` | 없음 |
| 5 | 예외 처리 | `BlogLoginRequired`를 던지지만 따로 잡는 곳이 없어 일반 실패와 같게 처리된다 | `blog-writer:server/browser/blogPost.ts:107`, `:205` | 로그인 문제를 화면이 구분 못 함 (자동 조작 로그 문구로만 추정, `blog-writer:src/job/JobDetail.tsx:206-213`) |
| 6 | 부분 해결 (2026-10-05) | 이미지를 다시 만들거나 올리면 예전 파일을 지운다. 단, 재생성이 실패해 파일 참조가 사라진 경우 예전 파일은 고아로 남는다 | `blog-writer:server/images/index.ts:34-54`, `blog-writer:server/store.ts:81-85` | `data/images` 용량 |
| 7 | 외부 의존 (취약) | 네이버 "함께 많이 찾는"은 공개 API가 아니라 검색 결과 HTML에서 내부 요청 주소를 정규식으로 꺼내 다시 부른다 | `blog-writer:server/naver.ts:47-70` | 네이버 화면 변경 시 태그 후보가 조용히 비게 됨 |
| 8 | 외부 의존 (취약) | 블로그 에디터·Gemini·ChatGPT의 CSS 셀렉터와 화면 문구(`.se-documentTitle`, `#post-title-inp`, `save_btn`, "임시저장이 완료" 등)에 의존 | `blog-writer:server/browser/adapters.ts`, `blog-writer:server/browser/userChrome.ts`, `blog-writer:server/images/webAi.ts:22-35` | UI 개편 시 입력 실패 → [[_system/integrations/blog-editors]] |
| 9 | 외부 의존 (취약) | Claude in Chrome 연결·차단 여부를 도구 결과 문구 정규식으로 판단 | `blog-writer:server/browser/claudeChrome.ts:28`, `:38` | 문구가 바뀌면 감지 실패 |
| 10 | 자동화 탐지 회피 성격 | 앱 전용 크롬 자동 조작은 `--disable-blink-features=AutomationControlled`, `--enable-automation` 제거, 사람 같은 곡선 마우스 이동·랜덤 타이핑 지연을 쓴다 | `blog-writer:server/browser/runner.ts:59-64`, `blog-writer:server/browser/mouse.ts:35-74`, `blog-writer:server/browser/adapters.ts:78` | 블로그 서비스 약관상 자동화 정책 확인 필요 → [[publishing/open-questions]] **결정 (2026-10-05): 설정을 유지하며, 대상 블로그의 자동화 관련 약관 확인은 사용자 책임이다.** |
| 11 | 설정 불일치 | `CHROME_PATH`는 로그인 창에만 쓰이고, Playwright 자동 조작·SVG 렌더링은 `channel: "chrome"` 기본 경로를 쓴다 | `blog-writer:server/browser/loginWindow.ts:29`, `blog-writer:server/browser/runner.ts:54-55`, `blog-writer:server/images/svg.ts:66` | 비표준 위치의 크롬이면 일부만 동작 |
| 12 | 동시성 | 진행 중 여부(`running`, 추천 `running`, 로그인 창 `proc`)가 메모리에만 있어 서버를 여러 개 띄우면 보호되지 않는다. 다른 저장은 2026-10-07에 공용 원자적 쓰기로 통일했지만, 막힌 사이트 파일과 새 추천의 첫 파일은 아직 바로 쓴다 | `blog-writer:server/pipeline.ts:23`, `blog-writer:server/recommend.ts:17`, `:158`, `blog-writer:server/browser/blockedSites.ts:28-33` | 단일 사용자 전제라 영향 작음 |
| 13 | 해결됨 (2026-10-05) | ~~표 빈 칸 행 제거는 작성 직후에만~~ → 저장(PUT)에서도 같은 필터 적용. 편집 중 임시 빈 칸 행은 저장 때 사라질 수 있음 | `blog-writer:server/routes/jobs.ts:90-93` | → [[writing/business-rules/BR-WRT-007 빈 칸 있는 표 행 제거]] |
| 14 | 해결됨 (2026-10-05) | ~~이름이 맞지 않아도 "시작 이후 새로 생긴 이미지"를 다운로드 폴더에서 옮겨 옴~~ → `blogwriter-<이름>`으로 시작하는 파일만 사용. 사이트 다운로드 버튼으로 받은 이름이 다른 파일은 회수하지 못함 | `blog-writer:server/images/webAi.ts:128-150` | → [[_system/integrations/gemini-chatgpt-web]] |
| 15 | 하드코딩 | 네이버 자동완성 엔드포인트·파라미터, 데이터랩 엔드포인트, 확장 ID, Gemini/ChatGPT URL이 코드에 고정 | `blog-writer:server/naver.ts:5-7`, `blog-writer:server/datalab.ts:11`, `blog-writer:server/browser/claudeChrome.ts:9` | 외부 변경 시 수정 필요 |
| 16 | 화면 표시 | 미리보기 태그 줄은 공백이 든 태그를 그대로(`#새 태그`) 보여 주지만, 실제 블로그 입력(`tagLine`)은 공백을 지운다(`#새태그`). 화면 "본문 복사"는 2026-10-09에 없어졌다 | `blog-writer:src/job/Preview.tsx:126`, `blog-writer:shared/postHtml.ts:57` | 미리보기와 결과가 다름 |
| 17 | 외부 의존 (취약) | 워드프레스 API 등록은 호스팅이 `Authorization` 헤더를 지우면 동작하지 않는다 (`rest_not_logged_in`). 앱에서 고칠 수 없고 원인만 안내한다 | `blog-writer:server/wordpress.ts:94-98` | → [[_system/integrations/wordpress-rest]] |
| 18 | 상태 동기화 | 예약발행한 글(워드프레스, 2026-10-09부터 네이버·티스토리도)은 예약 시각이 지나도 앱 상태가 자동으로 "블로그 발행완료"가 되지 않는다(블로그를 다시 조회하지 않음). 사용자가 "글 상태"에서 수기로 바꾼다 | `blog-writer:server/routes/jobs.ts:154-181` | → [[writing/open-questions]] |
| 19 | 테스트 범위 | 자동 테스트는 서버·공용 코드만 다룬다. 화면(React)과 크롬·Claude 경로는 테스트가 없다 | `blog-writer:vitest.config.ts:1-10` | → [[_system/modules/tests]] |
| 20 | 비용 표시 | 이미지 API(Gemini·OpenAI) 사용 비용·호출 수는 사용량 화면에 집계되지 않는다. 각 서비스 콘솔에서 확인해야 한다 | `blog-writer:server/images/api.ts:71-120` | → [[_system/integrations/image-api]] |
| 21 | 미사용 경로 | `regenerate-images`의 `onlyFailed`(실패한 것 모두 다시 만들기)는 화면에서 "썸네일 만들기"에만 쓰인다. 위쪽 실패 안내를 지운 뒤(2026-10-08) 실패 일괄 다시 만들기를 부르는 화면이 없다 | `blog-writer:server/routes/images.ts:15-68`, `blog-writer:src/job/JobDetail.tsx:291` | → [[image/business-rules/BR-IMG-009 다시 만들기 범위]] |
| 22 | 상태 표시 | 이미지를 한 장씩 동시에 만들 때 새 실행이 시작되면 job의 `error`를 지운다. 다른 이미지 실행이 남긴 작업 오류 문구가 사라질 수 있다 (이미지별 실패 기록은 남음) | `blog-writer:server/pipeline.ts:196-198` | → [[image/business-rules/BR-IMG-014 한 장씩 다시 만들기 동시 실행]] |
| 23 | 외부 의존 (취약) | 이미지 API 오류 분류는 응답 본문의 문구(`quota`, `billing`, `safety` 등)로 판단한다. 서비스가 문구를 바꾸면 원인이 `api_error`로 뭉뚱그려질 수 있다. 기본 모델 이름도 코드에 고정 | `blog-writer:server/images/api.ts:15-40` | → [[_system/integrations/image-api]] |
| 24 | 미검증 외부 의존 (2026-10-09) | 네이버·티스토리 예약발행·자동발행의 발행 창 자동 조작은 **모의 발행 창과 단위 테스트로만** 확인했고 실제 블로그 발행 창에서는 시험하지 않았다. 발행 창을 화면 글자("발행"·"공개"·"전체공개"·"예약"·"현재"·"완료")와 달력·시각 칸 구조로 찾으므로 실제 화면과 다르면 멈춘다(멈추면 발행하지 않고 임시저장 상태로 남음) | `blog-writer:server/browser/publish.ts:57-230`, `blog-writer:tests/publish.test.ts:1-81` | → [[_system/integrations/blog-editors]], [[publishing/business-rules/BR-PUB-001 발행하지 않고 임시저장까지만]] |
| 25 | 상태 불확실 (2026-10-09) | 마지막 발행 버튼을 누른 뒤 "발행 확인"(글쓰기 화면을 벗어남)에서 멈추면 `PublishStepError`로 상태를 "블로그 임시저장 완료"로 두지만, 실제로는 이미 발행·예약됐을 수 있다. Claude in Chrome 경로는 Claude가 돌려준 status만 믿고 실제 발행 여부를 따로 확인하지 않는다 | `blog-writer:server/browser/publish.ts:260-263`, `blog-writer:server/pipeline.ts:415-424`, `blog-writer:server/browser/blogPost.ts:210-212` | 앱 상태와 블로그 상태가 어긋날 수 있음. 오류 문구가 블로그에서 직접 확인하라고 안내 |
| 26 | 화면 안내 오류 가능 (2026-10-09) | "자동 조작으로 올리지 못했습니다… 로그인" 안내는 `job.error`가 있고 로그에 "자동 조작"이 있으면 뜬다. 이제 발행 창에서 멈춘 경우에도 상태 `posted`와 함께 `job.error`가 남으므로, 앱 전용 크롬 경로에서 발행만 실패해도 로그인 문제로 안내할 수 있다 | `blog-writer:src/job/JobDetail.tsx:207-215` | 잘못된 원인 안내 (확인 안 함) |
| 27 | 시각 경과 (2026-10-09) | 예약 시각은 요청할 때만 "지금+1분 이후"를 검사한다. 크롬 작업 줄(`enqueueBrowser`)에서 기다리거나 입력이 오래 걸리면 발행 창에 넣을 때는 이미 지난 시각일 수 있고, 이때 달력에서 날짜를 못 고르거나 블로그가 거절해 발행 창에서 멈춘다 | `blog-writer:server/routes/jobs.ts:133-143`, `blog-writer:server/pipeline.ts:319-328` | 임시저장만 된 채로 남음 |
| 28 | 낡은 주석 (2026-10-09) | 네이버·티스토리 발행이 생겼는데 주석이 그대로인 곳: `PUBLISH_MODE_LABEL`("워드프레스만 임시저장 외 방식"), `JobStatus`의 `scheduled`("워드프레스 API로 예약")·`published`("앱은 발행하지 않는다"), `server/browser/postHtml.ts` 첫 줄("화면의 본문 복사와 같이 쓰도록", 본문 복사는 삭제됨) | `blog-writer:shared/labels.ts:23-24`, `blog-writer:shared/types.ts:250-253`, `blog-writer:server/browser/postHtml.ts:1` | 동작 영향 없음, 읽는 사람 혼동 |
