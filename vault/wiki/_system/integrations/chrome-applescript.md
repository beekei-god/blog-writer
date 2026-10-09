---
type: integration
project: blog-writer
system: macOS AppleScript → 평소 크롬
confidence: high
source:
  - blog-writer:server/browser/userChrome.ts:1-535
updated: 2026-10-09
---
# macOS AppleScript로 평소 크롬 조작

## 무엇에 쓰나
Claude in Chrome이 네이버 블로그를 막을 때, macOS에서 사용자의 평소 크롬(이미 로그인됨)에 새 탭을 열고 SmartEditor ONE에 글을 넣는다. 크롬은 평소 프로필을 Playwright 같은 외부 자동화로 조종하지 못하게 막기 때문에 이 방법을 쓴다 (`blog-writer:server/browser/userChrome.ts:13-19`).

## 호출 방식
- `osascript -`에 스크립트를 stdin으로: `OPEN_TAB`(앞 창에 새 탭, 창·탭 id 반환), `RUN_JS`(id로 탭을 찾아 `execute javascript`) (`blog-writer:server/browser/userChrome.ts:45-116`).
- JS는 임시 파일(`bw-js-*.js`)로 넘겨 따옴표 문제를 피하고, 공통 도우미(`fire` 클릭 흉내, 입력 버퍼 iframe `input_buffer*`에 paste, `caretToEnd`, `imageCount`)를 앞에 붙인다. 결과는 JSON 문자열 (`blog-writer:server/browser/userChrome.ts:108-150`).
- 이미지: `sips`로 JPEG(가로 최대 1600px, 품질 88) 변환 → base64를 400,000자씩 `window.__bwData`에 나눠 넣고 → `File`로 만들어 paste (`blog-writer:server/browser/userChrome.ts:206-222`, `:426-440`).
- 인증: 크롬의 기존 로그인. 사전 조건: 크롬 "Apple Events의 자바스크립트 허용", macOS 자동화 권한.

## 카테고리 목록 읽기 (2026-10-09)
- `readNaverCategories`: 네이버는 카테고리를 발행 창에서만 고르므로, `openNaverEditor`(글쓰기 탭 열기·에디터 대기. 글 올리기와 공용, 로그인 화면이면 중단·이어쓰기 팝업 취소·예전 글이 남아 있으면 중단)로 탭을 열고 → 제목 칸에 짧은 제목 "카테고리 확인"을 붙여 넣고(제목이 비면 발행 버튼이 안 눌릴 수 있음) → `naverPublishSteps`의 첫 단계로 발행 창만 열고 → `readCategories(exec, "layer()", log)`로 읽은 뒤 → 저장하지 않고 `closeTab`(AppleScript `CLOSE_TAB`, 이미 닫혔으면 조용히 넘어감)으로 탭을 닫는다. 마지막 발행 버튼은 누르지 않는다 (`blog-writer:server/browser/userChrome.ts:84-100`, `:367-446`).
- macOS가 아니면 `UserChromeError("other", …)`, 블로그 ID가 없으면 오류. 입력하는 동안 네이버가 자동 임시저장을 남길 수 있다 → [[_system/known-issues]].

## 실패 처리
| stderr | 원인 | 
|---|---|
| "Apple Events의 자바스크립트" 등 | `js_disabled` |
| `-1743`, Not authorized | `not_authorized` |
| `-1719`, `-1728`, Invalid index | `tab_closed` |
| 로그인 URL(`nid.naver.com`) | `login` |
| 60초 안에 에디터 없음, 이어쓰기 글 | `editor` |
이미지 업로드 60초 초과, 서식 적용 실패, 검증 차이는 오류가 아니라 `problems`로 모아 로그 "확인 필요"로 남긴다. 임시저장 완료를 15초 안에 확인 못 하면 오류 (`blog-writer:server/browser/userChrome.ts:518-530`).

예약발행·자동발행(2026-10-09): 임시저장을 확인한 뒤 `naverPublishSteps`를 같은 `runJs`로 실행한다(입력 `problems`가 있어도 발행은 진행하고, 호출한 쪽이 "확인 필요"로 로그에 남긴다. 단계가 멈추면 그 순간의 발행 창 구조를 `PublishStepError.dialog`에 담는다)(`PUBLISH_HELPERS`를 앞에 붙임) (`blog-writer:server/browser/userChrome.ts:531-532`) → [[_system/integrations/blog-editors]].

## 바깥 변화에 취약한 지점
SmartEditor ONE 클래스(`.se-documentTitle`, `.se-component.se-text`, `.se-text-paragraph`, `.se-sectionTitle`, `iframe[id^="input_buffer"]`, `button[class*="save_btn"]`, `[class*="save_count_btn"]`), 팝업 문구("작성 중인 글"), 토스트("임시저장이 완료"). 발행 창은 화면 글자("발행"·"전체공개"·"예약")로 찾는다 — 실제 발행 창에서는 아직 시험하지 않음. macOS 전용 (`userChromeSupported`).

## 관련 규칙과 흐름
[[publishing/business-rules/BR-PUB-009 네이버 이미지 파일 이름과 크기]], [[publishing/business-rules/BR-PUB-010 이어쓰기 글이 있으면 중단]], [[publishing/business-rules/BR-PUB-011 입력 결과 검증]], [[publishing/flows/블로그 임시저장 플로우]]
