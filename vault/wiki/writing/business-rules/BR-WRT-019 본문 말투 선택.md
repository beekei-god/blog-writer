---
type: business-rule
domain: writing
id: BR-WRT-019
name: 본문 말투 선택
status: active
confidence: medium
consistency: consistent
source:
  - blog-writer:shared/types.ts:58-67
  - blog-writer:shared/labels.ts:30-37
  - blog-writer:server/schema.ts:71-74
  - blog-writer:server/writer.ts:6-37
  - blog-writer:server/editPost.ts:166-169
  - blog-writer:server/pipeline.ts:120-136
  - blog-writer:src/WritingPicker.tsx:59-80
  - blog-writer:tests/writingOptions.test.ts:36-55
  - blog-writer:tests/editPost.test.ts:78-104
entities: [Job, 글쓰기 규칙]
updated: 2026-10-10
---
# BR-WRT-019 본문 말투 선택

## 규칙
새 글을 만들 때 본문 말투를 네 가지 중 하나로 고른다. 고른 말투는 **글쓰기 규칙의 문체보다 우선**하지만, 규칙의 **존댓말**과 **확인된 사실만 쓰기**는 어느 말투에서도 그대로 지킨다 (사용자 결정 2026-10-10: 스토리형의 일기체도 존댓말).

| 말투 (`tone`) | 화면 이름 · 설명 | 프롬프트 지시 요약 |
|---|---|---|
| `info` | 정보형 · 존댓말 + 칼럼체 | 합니다체로 통일, 칼럼처럼 차분·객관적으로 배경 → 핵심 사실 → 의미·주의점, 감탄사·유행어·과한 이모티콘 금지 |
| `friendly` | 친근형 · 해요체 + 수다형 | 해요체로 통일, 수다 떨듯 독자에게 말 걸기, 가벼운 감탄·공감 허용, 반말 금지 |
| `story` | 스토리형 · 스토리텔링 + 일기체 + 유머 | 존댓말 일기체(~했어요, ~더라고요), 독자가 겪을 법한 상황으로 시작해 흐름 속에서 정보 전달, 유머, 도입부 2~3문장 안에 핵심 답. **글쓴이의 경험·후기·대화를 지어내지 말고** "이런 상황이라면" 같은 가정으로 풀기, 반말('~했다') 금지 |
| `summary` | 정리형 · Q&A + 요약 리스트 | 소제목을 검색할 법한 질문으로, 소제목 아래 첫 문단에서 결론부터, 짧은 문장과 목록·표 위주, 끝 핵심 요약은 목록, 어미는 해요체/합니다체 중 하나로 통일 |

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 새 글 만들기 | `writing.tone`이 위 4개 중 하나여야 함 (아니면 400 "본문 분량은 …, 말투는 목록에서 고르세요."). 없으면 마지막으로 쓴 값, 처음은 정보형 |
| 글 작성 | 시스템 프롬프트에 "## 말투 (글쓰기 규칙의 문체보다 우선, 존댓말과 확인된 사실만 쓰는 규칙은 그대로 지킬 것)" 항목과 위 지시가 들어간다. 로그 "규칙에 맞춰 글 작성 중 (분량 약 N자, 말투 X)" |
| 말투를 고르지 않은 예전 작업 | 말투 항목을 넣지 않는다 (글쓰기 규칙대로) |
| 프롬프트로 글 고치기 | 그 작업의 말투 항목을 함께 넣어 고친 부분도 같은 말투로 쓰게 한다 |
| 분량·말투 바꿔 다시 쓰기 | 새로 고른 말투로 글 전체를 다시 쓴다. 적용하면 작업의 말투가 바뀐다 → [[writing/business-rules/BR-WRT-016 프롬프트로 글 고치기]] |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 공용 타입 | `WritingTone`, `WRITING_TONES`, `WritingOptions.tone` | 4개 | `blog-writer:shared/types.ts:58-67` |
| 공용 문구 | `TONE_LABEL`, `TONE_HINT` | 화면 이름·설명 | `blog-writer:shared/labels.ts:30-37` |
| 서버(요청 검사) | `WritingOptionsSchema` | enum | `blog-writer:server/schema.ts:71-74` |
| 프롬프트(작성) | `TONE_GUIDE`, `toneSection`, `BASE_SYSTEM` | 말투별 지시, 규칙보다 우선(존댓말·사실 예외) | `blog-writer:server/writer.ts:6-37` |
| 프롬프트(고치기) | `toneSection` 붙임 | | `blog-writer:server/editPost.ts:166-169` |
| 서버(파이프라인) | 로그·전달 | | `blog-writer:server/pipeline.ts:120-136` |
| 화면 | `WritingPicker` 말투 줄 | 버튼 4개, 고른 말투 설명과 "어느 말투든 존댓말로 쓰고, 확인된 사실만 씁니다" 안내 | `blog-writer:src/WritingPicker.tsx:59-80` |
| 테스트 | 프롬프트에 말투·"지어내지 말고" 포함, 예전 작업은 말투 항목 없음, 고치기에도 말투 | | `blog-writer:tests/writingOptions.test.ts:36-55`, `blog-writer:tests/editPost.test.ts:78-104` |

프롬프트로만 지시하고 결과 문체를 검사하는 코드는 없어 `confidence: medium`이다.

## 예외 / 경계값
- 기본 글쓰기 규칙 2장 "반드시 존댓말"(해요체 또는 합니다체로 통일)과 충돌하지 않도록 모든 말투를 존댓말로 정의했다. 정보형은 합니다체, 친근형은 해요체로 정해 규칙의 "둘 중 하나로 통일"을 만족한다.
- 스토리형은 이야기 형식이라도 글쓴이의 실제 경험을 지어내지 않는다 → [[writing/business-rules/BR-WRT-003 확인된 사실만 사용]].
- 스토리형도 "도입부 결론 먼저"(규칙 3장)를 지키도록 도입부 2~3문장 안에 핵심 답을 넣게 했다.
- 실제 Claude 결과가 말투를 지키는지, 규칙과 섞일 때 어느 쪽을 따르는지는 확인하지 않았다 → [[writing/open-questions]] #14.

## 영향받는 플로우
[[writing/flows/초안 작성 플로우]], [[writing/flows/프롬프트로 글 고치기 플로우]]

## 확인 필요
- [[writing/open-questions]] #14

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-10 | 최초 기록 (말투 4종 선택 신설) | 커밋 afc7c10 |
