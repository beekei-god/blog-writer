---
type: business-rule
domain: publishing
id: BR-PUB-018
name: 발행 창 단계와 안전장치
status: active
confidence: medium
consistency: consistent
source:
  - blog-writer:server/browser/publish.ts:1-406
  - blog-writer:server/browser/category.ts:124-265
  - blog-writer:server/browser/userChrome.ts:519-534
  - blog-writer:server/browser/adapters.ts:23-44
  - blog-writer:server/browser/adapters.ts:294-296
  - blog-writer:server/browser/adapters.ts:407-409
  - blog-writer:server/browser/blogPost.ts:208-217
  - blog-writer:server/pipeline.ts:446-491
  - blog-writer:server/browser/runner.ts:92-104
  - blog-writer:src/styles.css:160
  - blog-writer:tests/publish.test.ts:1-119
entities: [Job]
updated: 2026-10-09
---
# BR-PUB-018 발행 창 단계와 안전장치

## 규칙
네이버·티스토리에 예약발행·자동발행할 때([[publishing/business-rules/BR-PUB-001 발행하지 않고 임시저장까지만|BR-PUB-001]]) 앱은 잘못된 글이 공개되지 않도록 다음을 지킨다.

1. **임시저장을 먼저** 끝내고 저장을 확인한 뒤에만 발행 창을 연다.
2. 발행 창의 버튼·선택지는 클래스 이름 대신 **화면 글자**(발행·완료·공개·예약·현재)로 찾는다. 발행 창은 **발행 창을 여는 버튼이 들어 있지 않고**, "공개"·"예약"·"발행 시간"·"발행일" 중 하나의 글자와 "…발행"으로 끝나는 버튼을 함께 가진 가장 작은 보이는 상자로 본다. 여는 버튼(네이버 상단 `publish_btn`, 티스토리 `#publish-layer-btn`, 앱이 누를 때 붙인 `data-bw-opener` 표시)이 든 상자를 빼서, 화면 위쪽 막대를 발행 창으로 잘못 고르지 않는다.
3. 선택지를 고를 때 이름표(`label`)가 있으면 그것을, 없으면 같은 글자를 가진 요소(button·radio·tab·option·span·a·li·p·div) 중 **가장 안쪽 요소**를 누른다.
4. 예약이면 날짜·시·분을 넣은 뒤 **발행 창에 보이는 값을 다시 읽어** 요청한 시각(한국 시간)과 정확히 같을 때만 다음으로 간다.
5. **네이버는 공개 설정을 바꾸지 않는다** (블로그에 정해 둔 값을 그대로 쓴다). 티스토리는 "공개"를 고른다.
6. 본문 입력에 "확인 필요" 문제가 있어도 **발행은 그대로 진행**하고, 문제는 진행 로그에 "확인 필요: …"로 남긴다 (세 경로 모두. 2026-10-09 사용자 결정).
7. **중지 요청은 마지막 발행 버튼을 누르기 전까지만** 받는다. 누른 뒤에는 이미 발행됐을 수 있으므로 끝까지 확인한다.
8. 발행 창을 연 바로 뒤에 **카테고리 고르기**([[publishing/business-rules/BR-PUB-020 카테고리 선택|BR-PUB-020]])와 네이버 **주제 고르기**([[publishing/business-rules/BR-PUB-021 네이버 주제 자동 선택|BR-PUB-021]]) 단계가 들어갈 수 있다. 이 둘은 **optional 단계**여서 안 돼도 멈추지 않고(기본 카테고리·주제 없이) 발행을 진행하며, 이유를 "확인 필요"로 남긴다.
9. 필수 단계가 안 되면 마지막 발행 버튼을 누르지 않고 멈춘다. 이때 작업은 **"블로그 임시저장 완료"(`posted`) + 오류 문구**로 끝난다 (글은 블로그에 임시저장된 채로 남는다). 코드가 단계를 실행하는 경로(평소 크롬·앱 전용 크롬)는 멈춘 순간의 **발행 창 구조**를 진행 로그에 함께 남긴다.

> 신뢰도: **네이버 예약발행**의 발행 창 열기·"예약" 고르기·날짜·시각 입력·마지막 발행 버튼은 2026-10-09 실제 사이트에서 예약발행이 저장되는 것을 사용자가 확인했다(9a9c6df 수정 뒤) → 이 부분은 high. 네이버 자동발행("현재")·발행 확인 단계의 세부, **티스토리 전체**, Claude in Chrome 프롬프트 절차는 실제 사이트에서 확인되지 않아 medium이다 ([[publishing/open-questions]] #11).

## 단계 (코드 경로: 평소 크롬·앱 전용 크롬)
| # | 네이버 (`naverPublishSteps` + `naverStepsWithOptions`) | 티스토리 (`tistoryPublishSteps`) |
|---|---|---|
| 1 | 발행 창 열기: 상단 `publish_btn` 또는 글자 "발행" 버튼 | 발행 창 열기: `#publish-layer-btn` 또는 글자 "완료" 버튼 |
| 1 | (여는 버튼에 `data-bw-opener` 표시를 붙이고 누름. 발행 창이 보이면 다음으로) | 같음 |
| 1a | (예약·자동, 카테고리를 골랐을 때) **카테고리 고르기** — optional, 12초. 발행 창 안의 카테고리 칸 | (없음. 티스토리는 임시저장 **전에** 에디터 위쪽 칸에서 고름 → [[publishing/business-rules/BR-PUB-020 카테고리 선택|BR-PUB-020]]) |
| 1b | (예약·자동, 주제가 정해졌을 때) **주제 고르기** — optional, 25초. 칸을 누르면 발행 창이 주제 팝업으로 바뀌므로 칸 누르기 → 이름 고르기 → 팝업 "확인" → 발행 창이 돌아올 때까지를 한 단계 안에서 진행 → [[publishing/business-rules/BR-PUB-021 네이버 주제 자동 선택|BR-PUB-021]] | (없음) |
| 2 | (공개 설정은 건드리지 않음. 2026-10-09 "전체공개 고르기" 단계 삭제) | "공개" 고르기 (없으면 멈춤) |
| 3 | 예약: "예약" 고르기(날짜 칸이 보일 때까지, 없으면 "발행 시간의 예약을 찾지 못했습니다") / 자동: "현재" 고르기(없으면 그대로 진행) | 같음 ("발행일의 예약") |
| 4 | (예약) 예약 날짜 입력: 칸에 바로 넣거나, 읽기 전용이면 날짜 칸을 눌러 달력을 열고 → 달력을 **구조로** 찾고(날짜 숫자 28개 이상이 모인 상자, 월 제목이 보일 때까지 윗 상자로 올라감) → **스크롤해서 보이게 하고** → 월 제목을 읽어 다음 달 버튼을 누르며 → 이번 달 날짜를 **실제 마우스처럼**(pointerdown·mousedown·pointerup·mouseup·click) 누름. 25초 | 같음 |
| 5 | (예약) 예약 시각 입력: 시·분 칸(select/input)에 숫자 넣기 | 같음 |
| 6 | (예약) 예약 시각 확인: 날짜·시·분을 다시 읽어 비교, 다르면 "발행 창의 예약 시각(…)이 요청한 시각과 달라 발행하지 않았습니다" | 같음 |
| 7 | 발행 버튼 누르기: 창 안 `confirm_btn` 또는 마지막 "발행" 버튼 | `#publish-btn` 또는 "공개 발행"/"예약 발행"/"발행" 버튼 |
| 8 | 발행 확인: 주소가 글쓰기 화면(`postwrite`, `GoBlogWrite`, `Redirect=Write`)을 벗어날 때까지 30초. 이동 중 실행 오류는 다시 시도 | 주소가 `manage/newpost`·`manage/post/`를 벗어날 때까지 30초 |

| 조건 | 결과 |
|---|---|
| 단계 결과 `true` | 다음 단계 |
| `false`/`null` | 0.5초 뒤 다시 실행 |
| `"ERR:<이유>"` | 바로 멈춤 → `PublishStepError` "임시저장은 했지만 발행 창의 "<단계>"에서 멈췄습니다: <이유>. 크롬에 열린 탭에서 직접 발행하세요." |
| 단계 제한 시간 초과 (기본 10초, 날짜 20초, 발행 확인 30초) | 같은 오류, 이유 "시간 안에 끝나지 않았습니다" |
| 위 두 경우의 멈춘 순간 | `PUBLISH_DUMP_JS`로 화면 구조를 읽어 `PublishStepError.dialog`에 붙인다: 주소(host+path) + 보이는 버튼·입력 칸·select·label·li·option·role 요소와 "공개/발행/예약/현재/시간/날짜/카테고리/주제"가 든 짧은 글자(요소마다 30자), 최대 250개. iframe 안도 읽고, 편집 영역(`contenteditable`, `.se-content`, `.se-main-container`)은 건너뛴다. 읽지 못하면 `dialog` 없이 원래 오류만 |
| **optional 단계**(카테고리·주제 고르기)가 `ERR:`/시간 초과 | 멈추지 않는다. 같은 방식으로 화면 구조를 읽고, `cleanupJs`가 있으면 실행(주제: 팝업의 "취소"·"닫기" 또는 Esc)한 뒤, `problems`에 "<단계>: <이유>"를 쌓고 로그 "<단계>을(를) 하지 못해 넘어갑니다: <이유>"와 "화면 구조 (문제 확인용…)"를 남기고 다음 단계로. 진행 로그의 "확인 필요"로 보인다 |
| "발행 확인" 단계 실패 | "발행 버튼을 눌렀지만 발행됐는지 확인하지 못했습니다. 블로그에서 글이 공개·예약됐는지 직접 확인하세요. (…)" |
| 네이버 예약 분이 10분 단위가 아님 | 단계를 만들기 전에 `PublishStepError` "이 블로그의 예약 시각은 10분 단위로만 고를 수 있습니다." (요청 검사에서 이미 400으로 막힘 → [[publishing/business-rules/BR-PUB-014 워드프레스 등록 방식과 예약 시각|BR-PUB-014]]) |
| 입력 검증 문제 있음 (세 경로) | 발행은 그대로 진행. 진행 로그에 "확인 필요: <문제>" (평소 크롬: 검증 결과, 앱 전용 크롬: 표→목록·소제목 서식 실패·대체 텍스트 실패, Claude in Chrome: 결과 `problems`). 2026-10-09 이전에는 평소 크롬이 발행하지 않고 멈췄다 |
| Claude in Chrome: 결과 `status`가 요청과 다름 (`saved` 등) | `PublishStepError` "임시저장은 했지만 <예약발행/발행>하지 못했습니다: <message> / <problems>. 크롬에 열린 탭에서 직접 발행하세요." |
| `PublishStepError` 처리 | 로그에 이유, `dialog`가 있으면 이어서 "발행 창 구조 (문제 확인용, 글 본문은 빠짐):\n<구조>" (화면 로그는 여러 줄 그대로 보임), 상태 `posted`, `job.error` = 이유 |
| 발행 버튼 누르기 전 중지 | `CancelledError` → 일반 중지 처리(상태 `draft_ready`, 로그 "블로그 작성을 중지했습니다…") |

## Claude in Chrome 경로 (프롬프트)
같은 절차를 글로 지시한다(`publishPrompt`): 먼저 임시저장·저장 확인 → problems에 적을 문제가 있어도 발행은 진행하고 problems에 적음 → 네이버는 상단 "발행"(발행 창의 태그 칸은 비워 둠)·공개 설정은 바꾸지 않음, 티스토리는 하단 "완료"·"공개" → 예약이면 "예약"과 한국 시간 날짜·시각, 누르기 전에 다시 읽어 확인, 다르면 누르지 말고 `saved` → 마지막 발행 버튼은 한 번만 → 글쓰기 화면을 벗어나는지 확인 → `scheduled`/`published`.

## 보이는 요소 판별 (2026-10-09 변경)
단계 스크립트의 `vis`와 화면 구조 읽기는 예전에 `offsetParent !== null`로 보이는 요소를 가렸다. 이는 `position: fixed` 요소(대개 팝업·모달)에서 늘 `null`이라 팝업이 안 보이는 문제가 있어, `getClientRects().length > 0 && visibility !== 'hidden'`으로 바꿨다 (`blog-writer:server/browser/publish.ts:93-93`).

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 서버(공용) | `PublishRequest`(`category`·`topic` 추가), `PublishStep`(`optional`·`cleanupJs` 추가), `PublishStepError`(`dialog`), `PUBLISH_DUMP_JS`, `kstParts`·`kstText`, `PUBLISH_HELPERS`, `scheduleSteps`, `finishSteps`, `naverPublishSteps`, `tistoryPublishSteps`, `runPublishSteps`(멈추면 `withDialog`), `publishedText`, `publishPrompt` | `blog-writer:server/browser/publish.ts:12-406` |
| 카테고리·주제 단계 | `selectCategorySteps`, `selectTopicSteps`(+`TOPIC_CLEANUP_JS`), `naverStepsWithOptions`(임시저장이면 안 넣음, 발행 창을 연 바로 뒤에 끼움) | `blog-writer:server/browser/category.ts:124-250` |
| 평소 크롬(네이버) | 저장 확인 → AppleScript `runJs`로 단계 실행 (검증 문제는 결과 `problems`로 돌려줌) | `blog-writer:server/browser/userChrome.ts:519-534` |
| 앱 전용 크롬 | `publishIfAsked` (Playwright `evaluate`), 네이버는 `mainFrame` 프레임. 입력 중 문제는 `ctx.problems`에 모아 `postWithChrome`이 돌려줌 | `blog-writer:server/browser/adapters.ts:23-44`, `:285-287`, `:397-399`, `blog-writer:server/browser/runner.ts:92-104` |
| Claude in Chrome | 프롬프트 절차, 결과 `status` 비교 | `blog-writer:server/browser/publish.ts:380-406`, `blog-writer:server/browser/blogPost.ts:214-216` |
| 파이프라인 | 세 경로의 "확인 필요" 로그, 성공 상태·로그, `PublishStepError` → 이유·발행 창 구조 로그, `posted`+오류 | `blog-writer:server/pipeline.ts:446-457`, `:403`, `:410-428` |
| 화면(로그) | 진행 로그 줄을 여러 줄 그대로 표시 (`white-space: pre-wrap`) | `blog-writer:src/styles.css:160` |
| 테스트 | (날짜 입력의 달력 도우미·실제 마우스 누르기·정규식 이스케이프는 `blog-writer:tests/publish.test.ts:83-101`) (카테고리·주제 단계는 `blog-writer:tests/categories.test.ts:31-107`) 한국 시간 변환, 네이버 10분 단위, 예약 확인 뒤 발행, 즉시 발행엔 예약 단계 없음, js 문법, ERR 즉시 중단, 발행 전/후 중지, 멈추면 화면 구조를 붙이고 못 읽어도 원래 오류, 구조 스크립트 문법·편집 영역 제외, 발행 확인 실패 문구, 프롬프트("문제가 있어도 발행은 진행하세요") | `blog-writer:tests/publish.test.ts:5-119` |

## 예외 / 경계값
- 예약 시각은 항상 **한국 시간(Asia/Seoul)**으로 바꿔 발행 창에 넣는다. 화면의 입력은 브라우저 현지 시간이다.
- 달력이 예약할 달보다 뒤에 있으면 앞으로 넘기지 않고 멈춘다 ("달력이 예약할 달보다 뒤에 있습니다").
- 달력은 이름이 아니라 구조로 찾는다. 알려진 클래스(`calendar`·`datepicker` 등)를 먼저 보고, 없으면 "날짜 숫자(1~31) 요소가 28개 이상 든 가장 작은 보이는 상자"를 찾아 월 제목("2026.10")이 보일 때까지 윗 상자로 올라간다(최대 3단계). 날짜 격자만 잡으면 월을 읽지 못해 다음 달로 넘기지 않고 이번 달의 같은 날짜를 누른다.
- 달력이 발행 창의 스크롤 영역 아래에 열려 가려지면 그 영역을 아래로 내려 달력·다음 달 버튼·날짜가 보이게 한다 (`reveal`). 눌러야 할 날짜는 이전·다음 달 날짜와 고를 수 없는 날을 뺀 뒤, 클래스로 구분되지 않으면 위치로 고른다(22일 이후는 앞쪽에 이전 달 끝 날짜가 있어 마지막 것, 그 밖에는 첫 것).
- 날짜 칸은 달력을 못 찾았을 때만, 몇 번 기다린 뒤에 다시 누른다 (0.5초마다 눌러 열었다 닫는 일을 막는다).  날짜를 눌렀는데 날짜 칸의 값이 바뀌지 않으면 같은 단계가 반복되다가 시간 초과("시간 안에 끝나지 않았습니다")로 멈추고, 그때의 화면 구조가 진행 로그에 남는다.
- "현재"(즉시) 선택지를 못 찾으면 기본값이 즉시 발행이라 보고 그대로 진행한다.
- 발행 창에서 멈춘 경우에도 이번 입력으로 블로그에 임시저장 글이 생겼으므로, 다시 올리면 새 글이 하나 더 생긴다.
- 발행 창 구조 로그에는 글 본문(편집 영역)은 빠지지만, 편집 영역 밖의 버튼 이름·짧은 글자(예: 블로그 메뉴 이름)는 들어갈 수 있다.
- 입력 문제가 있어도 예약발행·자동발행하므로, 표가 목록으로 바뀌거나 대체 텍스트가 빠진 글이 그대로 공개될 수 있다. 사용자가 진행 로그의 "확인 필요"를 보고 블로그에서 고친다.
- 발행 버튼을 누르기 전에 중지하면 블로그에는 임시저장 글이 있는데 작업은 "초안 검토"로 돌아간다 ([[publishing/open-questions]] #13).

## 영향받는 플로우
[[publishing/flows/블로그 임시저장 플로우]]

## 확인 필요
- [[publishing/open-questions]] #11 (티스토리·네이버 자동발행 실제 확인), #13

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-09 | 최초 기록 (네이버·티스토리 예약발행·자동발행 추가와 함께) | 커밋 65bfa3e |
| 2026-10-09 | 발행 창 찾기 변경: 여는 버튼(`OPENER`·`data-bw-opener`)이 든 상자는 빼고, "공개·예약·발행 시간·발행일" 글자로 찾음 (위쪽 막대를 발행 창으로 잘못 골라 "전체공개를 찾지 못했습니다"·"예약을 찾지 못했습니다"로 멈추던 문제). `pick`은 이름표가 없으면 가장 안쪽 요소를 누름 | 커밋 9a9c6df, `blog-writer:server/browser/publish.ts:97-119` |
| 2026-10-09 | **규칙 변경**: 네이버는 "전체공개 고르기" 단계를 없애고 공개 설정을 바꾸지 않음(프롬프트도). 입력 문제가 있으면 발행하지 않던 안전장치 삭제 → 발행은 진행하고 "확인 필요"로 로그 (사용자 결정) | 커밋 9a9c6df, `blog-writer:server/browser/publish.ts:270-290`, `:310-336`, `blog-writer:server/browser/userChrome.ts:530-533` |
| 2026-10-09 | 멈춘 단계의 발행 창 구조(`PUBLISH_DUMP_JS`)를 진행 로그에 남김. 네이버 예약발행 실제 사이트 확인 → 해당 단계 신뢰도 high | 커밋 9a9c6df, `blog-writer:server/browser/publish.ts:22-48`, `:294-299`, `blog-writer:server/pipeline.ts:483-484` |
| 2026-10-09 | 카테고리·네이버 주제 고르기 단계 추가(발행 창을 연 바로 뒤). `PublishStep.optional`(안 돼도 멈추지 않고 problems에 쌓고 화면 구조 로그)·`cleanupJs`(팝업 닫기), `runPublishSteps(…, problems?)`. 보이는 요소 판별을 `offsetParent` → `getClientRects()`+`visibility`로 변경(position:fixed 팝업). 화면 구조 기록에 목록 항목·"카테고리/주제" 글자 포함, 250개. 네이버 주제 팝업은 발행 창을 대체하므로 첫·마지막 단계에서만 발행 창을 봄 | 커밋 b7ced30, `blog-writer:server/browser/publish.ts:78-93`, `:280-327`, `blog-writer:server/browser/category.ts:172-250` |
| 2026-10-09 | 예약 날짜 입력 수정: 달력을 구조로 찾고(월 제목까지 올라감), 스크롤해서 보이게 하고, 실제 마우스처럼 누름. 달력이 발행 창의 스크롤 영역 아래에 열려 못 찾거나 날짜가 눌리지 않아 "예약 날짜 입력에서 시간 안에 끝나지 않았습니다"로 멈추던 문제 (사용자 보고). 도우미 안 정규식의 역슬래시가 템플릿 문자열에서 사라지던 실수도 바로잡음 | 커밋 19d0364, `blog-writer:server/browser/publish.ts:121-150`, `:192-225` |
