---
type: business-rule
domain: publishing
id: BR-PUB-018
name: 발행 창 단계와 안전장치
status: active
confidence: medium
consistency: consistent
source:
  - blog-writer:server/browser/publish.ts:1-295
  - blog-writer:server/browser/userChrome.ts:474-493
  - blog-writer:server/browser/adapters.ts:27-32
  - blog-writer:server/browser/adapters.ts:282-284
  - blog-writer:server/browser/adapters.ts:390-392
  - blog-writer:server/browser/blogPost.ts:204-213
  - blog-writer:server/pipeline.ts:410-425
  - blog-writer:tests/publish.test.ts:1-81
entities: [Job]
updated: 2026-10-09
---
# BR-PUB-018 발행 창 단계와 안전장치

## 규칙
네이버·티스토리에 예약발행·자동발행할 때([[publishing/business-rules/BR-PUB-001 발행하지 않고 임시저장까지만|BR-PUB-001]]) 앱은 잘못된 글이 공개되지 않도록 다음을 지킨다.

1. **임시저장을 먼저** 끝내고 저장을 확인한 뒤에만 발행 창을 연다.
2. 발행 창의 버튼·선택지는 클래스 이름 대신 **화면 글자**(발행·완료·전체공개·공개·예약·현재)로 찾는다. 발행 창은 "공개" 글자와 "…발행"으로 끝나는 버튼을 함께 가진 가장 작은 보이는 상자로 본다.
3. 예약이면 날짜·시·분을 넣은 뒤 **발행 창에 보이는 값을 다시 읽어** 요청한 시각(한국 시간)과 정확히 같을 때만 다음으로 간다.
4. 본문 입력에 **"확인 필요" 문제가 하나라도 있으면 발행하지 않는다** (임시저장만 둔다).
5. **중지 요청은 마지막 발행 버튼을 누르기 전까지만** 받는다. 누른 뒤에는 이미 발행됐을 수 있으므로 끝까지 확인한다.
6. 어느 단계든 못 하면 마지막 발행 버튼을 누르지 않고 멈춘다. 이때 작업은 **"블로그 임시저장 완료"(`posted`) + 오류 문구**로 끝난다 (글은 블로그에 임시저장된 채로 남는다).

> 신뢰도 medium: 발행 창 단계는 **모의 발행 창으로만** 확인했고 실제 네이버·티스토리 발행 창에서는 시험하지 않았다 ([[publishing/open-questions]] #11).

## 단계 (코드 경로: 평소 크롬·앱 전용 크롬)
| # | 네이버 (`naverPublishSteps`) | 티스토리 (`tistoryPublishSteps`) |
|---|---|---|
| 1 | 발행 창 열기: 상단 `publish_btn` 또는 글자 "발행" 버튼 | 발행 창 열기: `#publish-layer-btn` 또는 글자 "완료" 버튼 |
| 2 | "전체공개" 고르기 (없으면 멈춤) | "공개" 고르기 (없으면 멈춤) |
| 3 | 예약: "예약" 고르기(날짜 칸이 보일 때까지) / 자동: "현재" 고르기(없으면 그대로 진행) | 같음 ("발행일의 예약") |
| 4 | (예약) 예약 날짜 입력: 칸에 바로 넣거나, 읽기 전용이면 달력에서 다음 달로 넘기며 날짜 클릭. 20초 | 같음 |
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
| "발행 확인" 단계 실패 | "발행 버튼을 눌렀지만 발행됐는지 확인하지 못했습니다. 블로그에서 글이 공개·예약됐는지 직접 확인하세요. (…)" |
| 네이버 예약 분이 10분 단위가 아님 | 단계를 만들기 전에 `PublishStepError` "이 블로그의 예약 시각은 10분 단위로만 고를 수 있습니다." (요청 검사에서 이미 400으로 막힘 → [[publishing/business-rules/BR-PUB-014 워드프레스 등록 방식과 예약 시각|BR-PUB-014]]) |
| 평소 크롬: 입력 검증 문제 있음 | 발행 창을 열지 않고 `PublishStepError` "입력 결과에 확인할 점이 있어 발행하지 않고 임시저장만 했습니다: … 크롬에 열린 탭에서 확인한 뒤 직접 발행하세요." |
| Claude in Chrome: 결과 `status`가 요청과 다름 (`saved` 등) | `PublishStepError` "임시저장은 했지만 <예약발행/발행>하지 못했습니다: <message> / <problems>. 크롬에 열린 탭에서 직접 발행하세요." |
| `PublishStepError` 처리 | 로그에 이유, 상태 `posted`, `job.error` = 이유 |
| 발행 버튼 누르기 전 중지 | `CancelledError` → 일반 중지 처리(상태 `draft_ready`, 로그 "블로그 작성을 중지했습니다…") |

## Claude in Chrome 경로 (프롬프트)
같은 절차를 글로 지시한다(`publishPrompt`): 먼저 임시저장·저장 확인 → problems가 있으면 발행하지 말고 `saved` → 네이버는 상단 "발행"(발행 창의 태그 칸은 비워 둠)·"전체공개", 티스토리는 하단 "완료"·"공개" → 예약이면 "예약"과 한국 시간 날짜·시각, 누르기 전에 다시 읽어 확인, 다르면 누르지 말고 `saved` → 마지막 발행 버튼은 한 번만 → 글쓰기 화면을 벗어나는지 확인 → `scheduled`/`published`.

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 서버(공용) | `PublishRequest`, `PublishStepError`, `kstParts`·`kstText`, `PUBLISH_HELPERS`, `scheduleSteps`, `finishSteps`, `naverPublishSteps`, `tistoryPublishSteps`, `runPublishSteps`, `publishedText`, `publishPrompt` | `blog-writer:server/browser/publish.ts:12-295` |
| 평소 크롬(네이버) | 저장 확인 → `problems` 있으면 멈춤 → AppleScript `runJs`로 단계 실행 | `blog-writer:server/browser/userChrome.ts:474-493` |
| 앱 전용 크롬 | `publishIfAsked` (Playwright `evaluate`), 네이버는 `mainFrame` 프레임 | `blog-writer:server/browser/adapters.ts:27-32`, `:282-284`, `:390-392` |
| 앱 전용 크롬: 입력 문제 시 발행 안 함 | **없음** — 이 경로는 입력 검증 자체가 없다 ([[publishing/business-rules/BR-PUB-011 입력 결과 검증]]) | |
| Claude in Chrome | 프롬프트 절차, 결과 `status` 비교 | `blog-writer:server/browser/publish.ts:269-295`, `blog-writer:server/browser/blogPost.ts:210-212` |
| 파이프라인 | 성공 상태·로그, `PublishStepError` → `posted`+오류 | `blog-writer:server/pipeline.ts:410-424` |
| 테스트 | 한국 시간 변환, 네이버 10분 단위, 예약 확인 뒤 발행, 즉시 발행엔 예약 단계 없음, js 문법, ERR 즉시 중단, 발행 전/후 중지, 발행 확인 실패 문구, 프롬프트 | `blog-writer:tests/publish.test.ts:5-81` |

## 예외 / 경계값
- 예약 시각은 항상 **한국 시간(Asia/Seoul)**으로 바꿔 발행 창에 넣는다. 화면의 입력은 브라우저 현지 시간이다.
- 달력이 예약할 달보다 뒤에 있으면 앞으로 넘기지 않고 멈춘다 ("달력이 예약할 달보다 뒤에 있습니다").
- "현재"(즉시) 선택지를 못 찾으면 기본값이 즉시 발행이라 보고 그대로 진행한다.
- 발행 창에서 멈춘 경우에도 이번 입력으로 블로그에 임시저장 글이 생겼으므로, 다시 올리면 새 글이 하나 더 생긴다.
- 발행 버튼을 누르기 전에 중지하면 블로그에는 임시저장 글이 있는데 작업은 "초안 검토"로 돌아간다 ([[publishing/open-questions]] #13).

## 영향받는 플로우
[[publishing/flows/블로그 임시저장 플로우]]

## 확인 필요
- [[publishing/open-questions]] #11, #13, #14

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-09 | 최초 기록 (네이버·티스토리 예약발행·자동발행 추가와 함께) | 커밋 65bfa3e, `blog-writer:server/browser/publish.ts:1-295` |
