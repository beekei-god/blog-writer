---
type: business-rule
domain: publishing
id: BR-PUB-001
name: 임시저장 먼저, 고른 방식대로 발행
aliases: [발행하지 않고 임시저장까지만, 발행하지 않고 임시저장까지만 (워드프레스 API 예외)]
status: active
confidence: high
consistency: conflict
source:
  - blog-writer:server/routes/jobs.ts:100-152
  - blog-writer:server/pipeline.ts:319-329
  - blog-writer:server/pipeline.ts:366-429
  - blog-writer:server/browser/blogPost.ts:143-167
  - blog-writer:server/browser/blogPost.ts:204-213
  - blog-writer:server/browser/publish.ts:269-295
  - blog-writer:server/browser/userChrome.ts:474-493
  - blog-writer:server/browser/adapters.ts:27-32
  - blog-writer:server/browser/adapters.ts:278-284
  - blog-writer:server/browser/adapters.ts:390-392
  - blog-writer:server/browser/runner.ts:87-94
  - blog-writer:server/browser/claudeChrome.ts:98-105
  - blog-writer:src/job/NextStep.tsx:130-259
  - blog-writer:src/SettingsPanel.tsx:185-187
entities: [블로그 설정, Job]
updated: 2026-10-09
---
# BR-PUB-001 임시저장 먼저, 고른 방식대로 발행

> 파일 이름은 예전 규칙 이름("발행하지 않고 임시저장까지만")을 그대로 둔다(링크 유지). 2026-10-09(65bfa3e)부터 규칙이 바뀌었다.

## 규칙
올릴 블로그가 무엇이든 사용자가 **임시저장 / 예약발행 / 자동발행** 중 하나를 고른다. 예약발행·자동발행은 실제로 공개되므로 화면이 확인 창을 띄운 뒤에만 보낸다.

- **크롬으로 올리는 블로그(네이버·티스토리)**는 **늘 임시저장을 먼저** 끝낸다. 임시저장만 골랐으면 거기서 멈추고, 예약발행·자동발행을 골랐으면 이어서 블로그의 **발행 창**에서 발행한다. 발행 창에서 하나라도 못 하면 발행 버튼을 누르지 않고 멈추며, 글은 임시저장된 채 남는다 → [[publishing/business-rules/BR-PUB-018 발행 창 단계와 안전장치]].
- **워드프레스**는 REST API로 올리며 고른 방식대로 사이트에 바로 보낸다(임시저장을 먼저 하지 않는다) → [[publishing/business-rules/BR-PUB-014 워드프레스 등록 방식과 예약 시각]].
- 크롬 경로는 작업이 끝나도 블로그 탭·창을 닫지 않고 남겨 둔다.

## 조건과 결과
| 경로 | 임시저장 | 예약발행·자동발행 | 탭/창 |
|---|---|---|---|
| Claude in Chrome (네이버·티스토리) | 프롬프트 목표: "임시저장까지 한 뒤 멈춤. 절대 발행하지 마세요" (임시저장만일 때) | 프롬프트 목표가 "임시저장한 뒤 아래 발행 절차대로 예약발행/발행"으로 바뀌고 `publishPrompt` 절차가 붙음. 공통 규칙의 "글 발행 금지"는 이 절차에 한해 예외. 결과 `status`가 `scheduled`/`published`가 아니면 `PublishStepError` | 닫지 말고 둠 |
| 평소 크롬(네이버+macOS) | `save_btn` 클릭 후 저장 횟수 변화나 "임시저장이 완료" 토스트를 15초 확인 | 저장 확인 뒤, 입력 검증 문제가 없을 때만 `naverPublishSteps` 실행 | 열어 둠 |
| 앱 전용 크롬 (네이버·티스토리) | 플랫폼별 임시저장 버튼을 마우스로 클릭, 못 찾으면 오류 "직접 저장해 주세요" | 저장 뒤 `publishIfAsked`가 `naverPublishSteps`/`tistoryPublishSteps` 실행 (네이버 에디터가 `#mainFrame` 안이면 그 프레임에서) | `keepOpen: true` |
| 워드프레스 API | `draft`→사이트 초안 | `schedule`→`future`, `publish`→즉시 공개 | 크롬 안 씀 |

| 결과 | 작업 상태 | 로그·화면 |
|---|---|---|
| 크롬, 임시저장 성공 | `posted` (블로그 임시저장 완료) | "임시저장 완료 (이미지 N개): …" 등. 평소 크롬은 "…크롬에 열린 탭에서 확인한 뒤 직접 발행하세요." |
| 크롬, 예약발행 성공 | `scheduled` (블로그 발행 예약) | "<platform>에 YYYY.MM.DD HH:mm(한국 시간)에 발행되도록 예약했습니다." (`<platform>`은 코드 값 `naver`/`tistory`) |
| 크롬, 자동발행 성공 | `published` (블로그 발행완료) | "<platform>에 발행했습니다." |
| 크롬, 임시저장은 됐지만 발행 창에서 멈춤 (`PublishStepError`) | `posted` + `job.error`에 이유 | 이유를 로그에도 남김 → [[publishing/business-rules/BR-PUB-018 발행 창 단계와 안전장치]] |
| 크롬, 그 밖 실패 | `draft_ready` (초안 없으면 `failed`) | "블로그 작성 실패: …" |
| 워드프레스 | 사이트가 돌려준 상태대로 `posted`/`scheduled`/`published` | → [[publishing/flows/워드프레스 API 등록 플로우]] |

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 서버(API 검사) | 네이버·티스토리도 `draft`/`schedule`/`publish` 허용 (예전 400 거절 삭제). 예약이면 시각 검사 | `blog-writer:server/routes/jobs.ts:132-147` |
| 서버(작업) | `runPost`가 크롬 블로그에 `PublishRequest` 전달, `doPost`가 성공 시 방식별 상태, `PublishStepError`면 `posted`+오류 | `blog-writer:server/pipeline.ts:319-329`, `:366-429` |
| 프롬프트(블로그) | 목표 문장을 방식별로, 발행 절차 `publishPrompt` 삽입, 탭 유지 | `blog-writer:server/browser/blogPost.ts:143-167`, `blog-writer:server/browser/publish.ts:269-295` |
| 프롬프트(공통) | 되돌리기 어려운 동작(글 발행 포함) 금지 — 발행 절차가 이 경우만 예외라고 명시 | `blog-writer:server/browser/claudeChrome.ts:105`, `blog-writer:server/browser/publish.ts:288` |
| 서버(Claude in Chrome 결과) | 요청 방식과 결과 `status`가 다르면 `PublishStepError` | `blog-writer:server/browser/blogPost.ts:210-212` |
| 서버(AppleScript) | 저장 확인 → 문제 있으면 발행 안 함 → 발행 창 단계 | `blog-writer:server/browser/userChrome.ts:474-493` |
| 서버(Playwright) | 임시저장 클릭 → `publishIfAsked` | `blog-writer:server/browser/adapters.ts:27-32`, `:278-284`, `:390-392`, `blog-writer:server/browser/runner.ts:87-94` |
| 서버(워드프레스) | 모드별 상태 → [[_system/integrations/wordpress-rest]] | `blog-writer:server/wordpress.ts:245`, `blog-writer:server/pipeline.ts:332-360` |
| 화면(글) | 네이버·티스토리 `ChromeBlogNext`와 `WordPressNext`가 같은 방식 선택(`PublishModeFields`·`usePublishMode`)을 씀. 안내 문구 `CHROME_MODE_HINT`, 예약·자동은 확인 창 | `blog-writer:src/job/NextStep.tsx:130-259` |
| 화면(설정) | 네이버·티스토리 카드에 아직 "이 블로그에는 임시저장까지만 합니다." (**불일치**) | `blog-writer:src/SettingsPanel.tsx:186` |
| 테스트 | 네이버·티스토리 예약 요청 검사, 발행 창 단계 | `blog-writer:tests/api.test.ts:72-82`, `blog-writer:tests/publish.test.ts:12-71` |

## 예외 / 경계값
- 발행 창 조작(버튼·라디오·날짜 칸 찾기)은 **모의 발행 창으로만 확인**했고 실제 네이버·티스토리에서는 아직 시험하지 않았다. 이 부분의 신뢰도는 medium이다 ([[publishing/open-questions]] #11).
- Claude in Chrome 경로의 발행 절차는 프롬프트로만 지시한다(코드가 단계를 실행하지 않음). 결과 `status`로만 성공 여부를 판단한다.
- 크롬 블로그에 다시 올리면 이전 글을 고치지 않고 **새 글이 하나 더** 생긴다 (경로마다 새 글쓰기 화면을 열고 이어쓰기 팝업은 취소). 화면이 안내하고, 이미 이 블로그에 올린 글이면 확인 창에 "이전에 올린 글은 그대로 두고 블로그에 새 글이 하나 더 생깁니다."를 덧붙인다 (`blog-writer:src/job/NextStep.tsx:153-156`). 예약·자동발행으로 다시 올리면 블로그에 공개 글이 두 개가 될 수 있다.
- 워드프레스의 "다시 등록"은 같은 글을 갱신한다 → [[publishing/business-rules/BR-PUB-016 워드프레스 재등록은 같은 글 갱신]].
- 크롬 경로 코드는 워드프레스가 들어오면 바로 오류를 낸다 ("워드프레스는 크롬이 아니라 REST API로 올립니다.", `blog-writer:server/browser/blogPost.ts:120`, `blog-writer:server/browser/runner.ts:88`).
- 코드 주석 몇 곳은 아직 예전 규칙을 적고 있다 (`blog-writer:src/api.ts:101` "워드프레스만 draft 외 가능", `blog-writer:shared/labels.ts:23`, `blog-writer:shared/types.ts:250`, `blog-writer:server/browser/blogPost.ts:13`). 동작에는 영향이 없다.

## 영향받는 플로우
[[publishing/flows/블로그 임시저장 플로우]], [[publishing/flows/워드프레스 API 등록 플로우]]

## 확인 필요
- [[publishing/open-questions]] #11 (실제 사이트 발행 창), #12 (설정 화면 문구)

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-05 | 다시 임시저장은 새 글이 생기는 동작을 유지하고 화면에 안내 추가 | |
| 2026-10-07 | 워드프레스는 REST API로 올리고 임시저장·예약발행·자동발행을 고를 수 있게 됨 (예약·자동은 확인 창). 크롬 블로그는 계속 임시저장만, 서버가 `draft` 외 요청을 400으로 거절. 워드프레스 크롬 경로 삭제 | `blog-writer:server/routes/jobs.ts:121-138`, `blog-writer:server/pipeline.ts:306-355` |
| 2026-10-09 | **규칙 변경**: 네이버·티스토리 "임시저장까지만(발행 안 함)" → "임시저장/예약발행/자동발행 선택, 늘 임시저장 먼저 하고 발행 창에서 발행". 서버의 400 거절("예약발행·자동발행은 워드프레스에서만…") 삭제. 성공 상태가 `posted`만 → `posted`/`scheduled`/`published`. 발행 창에서 멈추면 `posted`+오류. 규칙 이름 변경 | 커밋 65bfa3e, `blog-writer:server/routes/jobs.ts:132-147`, `blog-writer:server/pipeline.ts:366-429`, `blog-writer:server/browser/publish.ts:1-295` |
