---
type: integration
project: blog-writer
system: Gemini · ChatGPT 웹 화면 (이미지 생성)
confidence: high
source:
  - blog-writer:server/images/webAi.ts:1-281
  - blog-writer:server/images/styles.ts:7-19
updated: 2026-10-07
---
# Gemini · ChatGPT 웹 (이미지 생성)

두 서비스는 같은 코드(`generateWithWebAi`)로 다루고 사이트별 차이만 `SITE` 표에 있어 한 페이지로 정리한다.

## 무엇에 쓰나
지브리풍·실사·애니메이션(그리고 플랫) 이미지. API 과금 없이 사용자의 서비스 한도 + Claude 사용량을 쓴다.

## 호출 방식
- Claude in Chrome으로 사용자의 평소 크롬에서 `https://gemini.google.com/app` 또는 `https://chatgpt.com/`를 새 탭으로 연다 (`blog-writer:server/images/webAi.ts:19-32`).
- 요청문: 16:9, 화풍 지시문(`STYLE_PROMPT`, 영어) 첨부. headline이 있으면 "한국어 문구를 한 글자도 바꾸지 말고, 다른 글자는 넣지 말 것", 썸네일은 가운데 크게·정사각 크롭 대비. 없으면 "글자 넣지 말 것" (`:199-214`).
- 입력: 여러 줄을 타이핑하면 줄바꿈에서 전송되므로, `insertScript`를 `javascript_tool`로 실행해 paste 이벤트(실패 시 `execCommand insertText`)로 통째로 넣는다. 입력 셀렉터: Gemini `rich-textarea .ql-editor`, ChatGPT `#prompt-textarea` (`:40-58`).
- 대기: JS Promise로 최대 60초씩 반복, 최대 4분 정도.
- 회수: `downloadScript`가 페이지의 가장 최근 큰 이미지(가로 ≥400, 세로 ≥200)를 `fetch(credentials)` 또는 canvas로 읽어 `blogwriter-<이름>` 파일로 다운로드 → 서버가 다운로드 폴더에서 그 이름으로 시작하는 파일(시작 이후 생성, >5KB)만 60초까지 찾아 `data/images/<job>/`로 옮긴다 (`:64-90`, `:129-164`). 실패하면 Claude가 알려 준 이미지 URL을 서버에서 직접 받아 본다 (`:166-181`, `:279-280`).
- 결과 상태: `ok`/`login_required`/`refused`/`limit`/`failed` → 각각 원인 `login`/`refused`/`limit`/`ui_changed`, 파일을 못 받으면 `download` (`:263-284`).

## 실패 처리
타임아웃 10분, 재시도 없음. 실패는 그 이미지에만 기록 → [[image/business-rules/BR-IMG-007 이미지 실패 격리와 원인 분류]].

## 바깥 변화에 취약한 지점
- 입력창 셀렉터, 로그인 버튼 문구, 다운로드 버튼 위치.
- 크롬 "다운로드 전에 저장 위치 확인" 설정이 켜져 있으면 실패.
- 이름이 다른 파일은 가져오지 않는다(사용자가 따로 받은 파일 보호, 2026-10-05). 그래서 프롬프트에서 "사이트 다운로드 버튼을 누르라"는 안내도 삭제했고, 다운로드 스크립트가 실패하면 Claude가 `imageUrl`에 img.src를 담아 돌려주어 이미지 URL 회수로 넘어간다 ([[_system/known-issues]] #14).
- 지브리풍은 정책상 거절될 수 있다 (`blog-writer:server/images/styles.ts:3-6`).
