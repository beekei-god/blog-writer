---
type: business-rule
domain: publishing
id: BR-PUB-021
name: 네이버 주제 자동 선택
status: active
confidence: medium
consistency: consistent
source:
  - blog-writer:server/naverTopic.ts:1-63
  - blog-writer:server/pipeline.ts:369-392
  - blog-writer:server/browser/category.ts:165-249
  - blog-writer:server/browser/publish.ts:78-88
  - blog-writer:server/browser/publish.ts:280-327
  - blog-writer:server/browser/blogPost.ts:167-167
  - blog-writer:src/job/NextStep.tsx:327-327
  - blog-writer:tests/naverTopic.test.ts:1-63
  - blog-writer:tests/categories.test.ts:46-100
entities: [Job]
updated: 2026-10-09
---
# BR-PUB-021 네이버 주제 자동 선택

## 규칙
네이버 블로그의 **예약발행·자동발행**에서는 발행 창의 "주제"를 사용자가 고르지 않고, **Claude가 글 내용을 보고 고정 목록에서 하나를 골라** 발행 창에서 입력한다. 임시저장·티스토리·워드프레스에는 주제가 없다.

> 신뢰도: 고르는 쪽(고정 목록, 호출 조건, 실패 시 주제 없이 진행)은 코드에 명시돼 있다. 하지만 **발행 창의 주제 팝업 구조는 사용자 설명과 모의 화면으로만 확인**했고 실제 사이트에서는 검증되지 않아 medium이다 ([[publishing/open-questions]] #16, #19).

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 네이버 + 예약발행/자동발행 | 크롬 대기열에 들어가기 **전에** `pickNaverTopic` 호출 → 고른 주제를 `PublishRequest.topic`에 담아 `doPost`로 |
| 네이버 + 임시저장, 티스토리, 워드프레스 | 주제 선택 안 함 |
| Claude가 고른 이름이 목록과 맞음 (공백·가운뎃점 모양 차이는 허용) | 로그 "네이버 주제: X (글 내용을 보고 정함)" |
| 목록에 없는 답이거나 호출이 실패 | 주제 없이 진행. 로그 "네이버 주제를 정하지 못해 주제 없이 올립니다…" |
| 선택 중 중지 | 오류 전파 → 블로그 작성 중지로 처리 (`failStep`) |

주제 목록(코드에 고정, 대분류 4개·32개 주제): 엔터테인먼트·예술(9), 생활·노하우·쇼핑(9), 취미·여가·여행(8), 지식·동향(6). 사용자가 확인한 네이버 목록과 같다.

Claude 호출: 단계 `writing`(모델 설정 따름), effort `low`, 도구 없음, 2분 제한, 출력은 목록을 `enum`으로 제한한 `{topic}`. 입력은 글 제목·요약·태그(최대 15)·소제목(최대 12)이다.

### 발행 창에서 고르는 순서 (`selectTopicSteps`)
발행 창을 연 바로 뒤에 **카테고리 단계 다음**으로 들어가며, 한 단계 안에서 phase로 진행한다.
1. (phase 0) 주제 칸 찾아 누르기 — 발행 창(`layer()`)이 필요한 것은 이 첫 단계뿐. 칸이 `<select>`면 그 선택지를 바로 고르고 끝.
2. (1) 팝업에서 같은 이름의 가장 안쪽 항목 누르기. 팝업 = 이름과 "확인" 버튼을 함께 가진 가장 작은 보이는 상자 (발행 창을 여는 버튼이 든 상자 제외).
3. (2) 팝업의 "확인" 누르기.
4. (3) 팝업이 닫히고 **발행 창이 돌아올 때까지** 기다리기 (마지막 확인도 발행 창을 본다).
- 이유: 네이버에서 주제 칸을 누르면 **발행 창이 주제 팝업으로 바뀌어** 발행 창이 사라진다(사용자 설명).
- 단계는 `optional`이고 시간 제한 25초. 안 돼도 멈추지 않고 주제 없이 발행한다. 실패하면 정리 스크립트(`cleanupJs`)가 팝업의 "취소"·"닫기"를 누르고(없으면 Esc) 팝업이 열린 채 남지 않게 한 뒤, 진행 로그에 "확인 필요: 주제 고르기: <이유>"와 화면 구조를 남긴다.
- Claude in Chrome 경로는 프롬프트로 같은 절차를 지시한다(목록에 없으면 비우고 problems에 적음).

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 서버(선택) | `NAVER_TOPICS`(고정 목록), `matchNaverTopic`, `pickNaverTopic`(Claude, 실패 시 null, 중지는 전파) | 4개 대분류·32개 주제 | `blog-writer:server/naverTopic.ts:10-63` |
| 서버(파이프라인) | `runPost`: 네이버이고 `mode !== "draft"`일 때 크롬 큐 전에 호출 | | `blog-writer:server/pipeline.ts:369-392` |
| 브라우저(공용) | `selectTopicSteps`(optional, 25초, `TOPIC_CLEANUP_JS`), `naverStepsWithOptions`(카테고리 다음에 끼움, 임시저장이면 안 넣음) | | `blog-writer:server/browser/category.ts:171-249` |
| 브라우저(실행) | `PublishStep.optional`·`cleanupJs`, `runPublishSteps`의 `fail` 처리 | | `blog-writer:server/browser/publish.ts:78-88`, `:280-327` |
| 평소 크롬 / 앱 전용 크롬 | 네이버는 둘 다 `naverStepsWithOptions` 사용 | | `blog-writer:server/browser/userChrome.ts:532-532`, `blog-writer:server/browser/adapters.ts:296-296` |
| 프롬프트 | Claude 주제 선택 시스템 프롬프트(목록·단 하나·목록 밖 금지), Claude in Chrome용 주제 안내 | | `blog-writer:server/naverTopic.ts:42-46`, `blog-writer:server/browser/category.ts:253-254` |
| 화면 | 네이버 예약·자동이면 "네이버 주제는 글 내용을 보고 자동으로 고릅니다." 안내 (사용자가 고르는 칸 없음) | | `blog-writer:src/job/NextStep.tsx:327-327` |
| 테스트 | 목록 맞추기, 글 요약으로 선택, 실패·목록 밖이면 null, 중지 전파, 팝업 순서·정리·발행 창 확인 시점 | | `blog-writer:tests/naverTopic.test.ts:33-62`, `blog-writer:tests/categories.test.ts:46-100` |

## 예외 / 경계값
- 주제 목록은 코드에 고정이라 네이버가 목록을 바꾸면 발행 창에서 이름을 못 찾아 주제 없이 올라간다 ([[publishing/open-questions]] #19).
- 주제 대분류를 눌러야 항목이 보이는 방식이면 현재 구현은 항목을 찾지 못한다(미지원).
- 주제 선택은 Claude 사용량을 조금 쓴다(low effort 한 번). 실패해도 발행은 진행된다.

## 영향받는 플로우
[[publishing/flows/블로그 임시저장 플로우]]

## 확인 필요
- [[publishing/open-questions]] #16, #19

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-09 | 최초 기록 (예약·자동발행 때 Claude가 고정 목록에서 주제 선택, 팝업 방식 입력, optional) | 커밋 b7ced30 |
