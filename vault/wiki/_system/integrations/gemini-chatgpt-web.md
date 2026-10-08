---
type: integration
project: blog-writer
system: Gemini · ChatGPT 웹 화면 (이미지 생성)
confidence: high
source:
  - blog-writer:server/images/webAi.ts:1-267
  - blog-writer:tests/webAi.test.ts:1-53
  - blog-writer:server/images/styles.ts:7-40
  - blog-writer:server/images/index.ts:111-123
updated: 2026-10-09
---
# Gemini · ChatGPT 웹 (이미지 생성)

두 서비스는 같은 코드(`generateWithWebAi`)로 다루고 사이트별 차이만 `SITE` 표에 있어 한 페이지로 정리한다.

## 무엇에 쓰나
**2026-10-08부터**: 그 서비스의 이미지 API 키가 없거나, 만드는 방법으로 "크롬"을 골랐을 때만 이 경로를 쓴다. 2026-10-09부터 방법은 새 글 화면에서 썸네일·본문 이미지마다 따로 고르고(`ImageOptions.method`·`thumbnailMethod`, `methodFor`), 이미지 다시 생성 창에서는 스타일·만드는 곳·만드는 방법을 고른 뒤 "이미지 다시 만들기" 버튼 하나로 만든다 (예전 "API로/크롬에서 다시 만들기" 두 버튼은 없어짐). 키가 있으면 [[_system/integrations/image-api]]로 만들고, API가 실패해도 이 경로로 저절로 넘어오지 않는다 → [[image/business-rules/BR-IMG-013 이미지 API 우선과 만드는 방법 선택]].

지브리풍·실사·애니메이션(그리고 플랫) 이미지. API 과금 없이 사용자의 서비스 한도 + Claude 사용량을 쓴다.

## 호출 방식
- Claude in Chrome으로 사용자의 평소 크롬에서 `https://gemini.google.com/app` 또는 `https://chatgpt.com/`를 새 탭으로 연다 (`blog-writer:server/images/webAi.ts:22-35`).
- 요청문(`imageRequest`, `server/images/styles.ts`, API와 공용): 16:9, 화풍 지시문(`STYLE_PROMPT`, 영어) 첨부. headline이 있으면 "한국어 문구를 한 글자도 바꾸지 말고, 다른 글자는 넣지 말 것", 썸네일은 가운데 크게·정사각 크롭 대비. 없으면 "글자 넣지 말 것" (`:197-212`).
- 입력: 여러 줄을 타이핑하면 줄바꿈에서 전송되므로, `insertScript`를 `javascript_tool`로 실행해 paste 이벤트(실패 시 `execCommand insertText`)로 통째로 넣는다. 입력 셀렉터: Gemini `rich-textarea .ql-editor`, ChatGPT `#prompt-textarea` (`:43-61`).
- 대기: JS Promise로 최대 60초씩 반복, 최대 4분 정도.
- 회수: `downloadScript`가 페이지의 가장 최근 큰 이미지(가로 ≥400, 세로 ≥200)를 `fetch(credentials)` 또는 canvas로 읽어 `blogwriter-<이름>` 파일로 다운로드 → 서버가 다운로드 폴더에서 그 이름으로 시작하는 파일(시작 이후 생성, >5KB)만 최대 60초(스크립트가 ok가 아니면 20초) 찾아 `data/images/<job>/`로 옮긴다 (`:65-97`, `:128-151`). 못 찾으면 Claude가 알려 준 이미지 URL을 서버에서 직접 받아 본다 (`:163-175`, 저장은 `api.ts`의 `saveImageFile`). 이 확인은 Claude가 `failed`로 보고했을 때도 먼저 한다: 스크립트가 빈 값을 돌려줘도 파일은 이미 받아졌을 수 있기 때문이다 (`:247-255`).
- 결과 상태: `ok`/`login_required`/`refused`/`limit`/`failed` → `login_required`/`refused`/`limit`은 바로 각각 `login`/`refused`/`limit`. `ok`와 `failed`는 다운로드 폴더·이미지 URL 확인을 거치고, 파일을 받으면 성공, 못 받으면 `failed`는 message가 사이트 오류 안내("문제가 발생했습니다 (1155)", "오류가 발생", "Something went wrong" 등)면 `site_error`, 아니면 `ui_changed`, `ok`는 `download` (`:241-266`). 2026-10-09부터 프롬프트가 "사이트가 오류 안내를 보였으면 message에 그 문구를 그대로" 적게 한다 (`:210`). 화면은 예전에 `ui_changed`로 저장된 사이트 오류 메시지도 `site_error`로 보여 준다.

## 실패 처리
타임아웃 10분, 재시도 없음. 실패는 그 이미지에만 기록 → [[image/business-rules/BR-IMG-007 이미지 실패 격리와 원인 분류]].

## 바깥 변화에 취약한 지점
- 입력창 셀렉터, 로그인 버튼 문구, 다운로드 버튼 위치.
- 크롬 "다운로드 전에 저장 위치 확인" 설정이 켜져 있으면 실패.
- 이름이 다른 파일은 가져오지 않는다(사용자가 따로 받은 파일 보호, 2026-10-05). 그래서 프롬프트에서 "사이트 다운로드 버튼을 누르라"는 안내도 삭제했고, 다운로드 스크립트가 실패하면 Claude가 `imageUrl`에 img.src를 담아 돌려주어 이미지 URL 회수로 넘어간다 ([[_system/known-issues]] #14).
- 사이트 오류 판단은 Claude가 옮겨 적은 message 문구 정규식(`SITE_ERROR`, `blog-writer:shared/imageErrors.ts:93-94`)에 기대므로, 사이트 문구가 바뀌거나 Claude가 문구를 옮기지 않으면 `ui_changed`로 남는다.
- 지브리풍은 정책상 거절될 수 있다 (`blog-writer:server/images/styles.ts:3-6`).
