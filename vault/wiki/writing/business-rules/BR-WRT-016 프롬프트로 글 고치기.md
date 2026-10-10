---
type: business-rule
domain: writing
id: BR-WRT-016
name: 프롬프트로 글 고치기
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/routes/edit.ts:12-38
  - blog-writer:server/editPost.ts:13
  - blog-writer:server/editPost.ts:74-109
  - blog-writer:server/editPost.ts:128-215
  - blog-writer:server/pipeline.ts:167-218
  - blog-writer:src/job/EditByPrompt.tsx:19
  - blog-writer:src/job/EditByPrompt.tsx:104-115
  - blog-writer:src/job/EditByPrompt.tsx:174-179
  - blog-writer:tests/editPost.test.ts:78-104
  - blog-writer:tests/editPost.test.ts:188-216
entities: [Job, Post]
updated: 2026-10-10
---
# BR-WRT-016 프롬프트로 글 고치기

## 규칙
사용자가 쓴 수정 요청(2~2000자)대로 Claude가 **글 전체 또는 선택한 블록 범위**를 고치거나 내용을 더한다. 결과는 **제안으로만** 남기고, 사용자가 바뀐 부분을 비교해 "적용"해야 글에 들어간다. 고칠 때는 웹 검색을 쓸 수 있고, 글쓰기 규칙을 고친·더한 부분에도 똑같이 지키게 한다. 분량 상한(그 작업의 목표 × 1.2, 예전 작업은 3,000자 → [[writing/business-rules/BR-WRT-001 본문 분량 상한]])은 **경고만** 하고 자동으로 줄이지 않는다.

**분량·말투 바꿔 다시 쓰기 (2026-10-10)**: 같은 카드에서 새 분량·말투를 고르면, 이 작업을 처음 쓸 때 조사한 노트·출처를 함께 넘겨 **글 전체**를 그 분량·말투로 다시 쓴 제안을 만든다. 수정 요청 칸은 추가 요청으로 쓰이고 비어 있어도 된다. 적용하면 글과 함께 **작업의 분량·말투(`writingOptions`)도 새 값으로 바뀐다** → [[writing/business-rules/BR-WRT-017 고친 결과 적용 조건과 잠금]]. 말투는 [[writing/business-rules/BR-WRT-019 본문 말투 선택]].

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 수정 요청이 2자 미만(공백 제외)이거나 2,000자 초과 | 400 "고칠 내용을 2자 이상 2,000자 이하로 써 주세요." (화면은 2자 미만이면 버튼 비활성, 입력은 2,000자까지). 분량·말투 다시 쓰기(`writing`이 있음)는 요청이 비어 있어도 됨 |
| `writing`과 `range`를 함께 보냄 | 400 "분량·말투를 바꿀 때는 글 전체를 다시 씁니다." |
| `writing` 값이 잘못됨 (분량 1,000~8,000 밖, 모르는 말투) | 400 "분량·말투 값이 올바르지 않습니다." |
| 분량·말투 다시 쓰기 | 시스템 프롬프트에 "## 다시 쓰기" 항목: 목표 약 N자(±10%)로 글 전체를 다시, 모든 문장을 새 말투로(소제목·구성도 바꿔도 됨), 사실·숫자·날짜·출처는 그대로, 늘릴 때는 지금 글 → 조사 자료 → 웹 검색으로 확인한 사실 순, 채울 사실이 없으면 짧게 끝내고 note에, 줄일 때는 중복·긴 예시·덜 중요한 내용부터, 도입부·핵심 요약·참고 자료는 남김. "요청한 부분만 고치세요"보다 우선. 요청 본문에 조사 노트와 출처 목록을 넣는다. 요청이 비어 있으면 "(따로 없음. 분량·말투만 바꿔 다시 써 주세요)" |
| 초안이 없음 | 400 "초안이 없습니다." |
| 범위 `end < start` 또는 `end`가 마지막 블록 번호 초과 | 400 "고칠 부분을 찾지 못했습니다. 화면을 새로고침해 주세요." |
| 범위를 정하지 않음 | 글 전체. Claude는 제목·요약도 돌려주고, 모든 블록을 순서대로 돌려준다. 적용하면 제목·요약도 바뀐다 |
| 범위를 정함 (처음~끝, 끝 포함) | 그 범위를 대신할 블록만 받는다. 범위 앞 2블록·뒤 2블록은 읽기 전용 문맥으로만 보여 주고, 범위 밖의 글과 제목·요약은 건드리지 않는다 |
| 프롬프트가 새 사실을 필요로 함 | WebSearch·WebFetch 허용 (열람 최대 4개). 확인 못 한 사실은 쓰지 않고 note에 "뺐다"고 적게 지시. 새 참고 자료는 "참고 자료" 목록이 범위 안에 있을 때 거기에 더한다 |
| 고친 뒤 본문이 상한 초과 | 막지 않는다. 비교 화면에 "상한(N자)을 넘습니다. 적용한 뒤 직접 줄여 주세요." 경고만 (프롬프트는 상한을 넘기지 말라고 지시, 현재 글자 수를 알려 줌). 상한은 그 작업의 목표 기준이고, 다시 쓰기 제안은 **새 목표**의 상한으로 본다 (사용자 결정 2026-10-10: 다시 쓰기도 경고만) |
| 고칠 때의 말투 | 그 작업의 말투 항목을 함께 넣는다 (말투가 없는 예전 작업은 넣지 않음) |
| 결과가 준비됨 | 글은 아직 그대로. 제안 `ready`(before/after/note/글자 수) 저장, 로그 "고친 결과가 준비됐습니다…" |

모델은 글쓰기 단계(`stage: "writing"`) 설정을 따르고 effort는 medium, 제한 시간 20분이다. 태그·썸네일·작성 리포트는 이 기능이 바꾸지 않는다.

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 서버(요청 검사) | zod | prompt ≤2000자(`EDIT_PROMPT_MAX`, `writing`이 없으면 2자 이상), range 정수 ≥0, `writing`(`WritingOptionsSchema`)은 range와 함께 못 씀, 초안·범위 검사 | `blog-writer:server/routes/edit.ts:12-38`, `blog-writer:server/editPost.ts:13` |
| 서버(Claude 호출) | `proposeEdit` | 글쓰기 규칙(`getRules`) 포함 시스템 프롬프트, 도구 WebSearch·WebFetch, 글 전체/범위별 출력 스키마 | `blog-writer:server/editPost.ts:74-95`, `:128-181` |
| 서버(백그라운드) | `startEdit`·`doEdit` | 시작 때 `running` 제안 기록, 끝나면 `ready`/`failed`, 중지면 제안 삭제 | `blog-writer:server/pipeline.ts:167-218` |
| 공용 | `EditProposal`, `Job.editProposal` | 제안의 모양 → [[writing/entities/Job]] | `blog-writer:shared/types.ts:331-353`, `:343` |
| 프롬프트 | 시스템 프롬프트 | "요청한 부분만 고치기", 글쓰기 규칙 준수, 확인된 사실만, 분량 ≤ 작업의 상한, 말투 항목, 다시 쓰기 항목(`rewriteSection`) | `blog-writer:server/editPost.ts:81-95` |
| 화면 | `EditByPrompt` | 선택한 블록의 처음~끝을 범위로, 비교 화면, 분량 경고 | `blog-writer:src/job/EditByPrompt.tsx:18-19`, `:135-192` |
| 화면(다시 쓰기) | `EditByPrompt`의 "분량·말투 바꿔 글 전체 다시 쓰기" | `WritingPicker`(처음 값은 그 글의 분량·말투), 위 수정 요청 칸을 추가 요청으로 함께 보냄, 진행·결과 문구에 "분량 약 N자 · 말투" | `blog-writer:src/job/EditByPrompt.tsx:16`, `:50-62`, `:104-115`, `:138-147` |
| 테스트 | `tests/editPost.test.ts` | 범위만 고침, 글 전체, 요청 검사, 시작→제안→적용, 작업의 상한·말투, 다시 쓰기 프롬프트, 다시 쓰기 요청 검사·적용 | `blog-writer:tests/editPost.test.ts:50-104`, `:188-270` |

## 예외 / 경계값
- 편집 화면에서 **떨어진 블록**(예: #1, #5)을 고르면 서버로 가는 범위는 최솟값~최댓값이다. 사이 블록(#2~#4)도 함께 고쳐진다. 화면은 이 경우 "고르지 않은 사이의 블록도 포함해서 고칩니다."라고 알린다 → [[writing/open-questions]] #10.
- 고치지 않을 블록도 범위 안에 있으면 그대로 포함해서 돌려주도록 지시한다. 범위 밖 글은 서버가 그대로 이어 붙인다.
- 같은 요청이 글을 바꾸지 못하면(바뀐 게 없음) 제안이 되지 않고 실패로 남는다 → [[writing/business-rules/BR-WRT-018 고칠 때 이미지는 그대로]].
- 결과가 나온 직후 사용자가 중지했으면 제안으로 남기지 않는다(`throwIfCancelled`).

## 영향받는 플로우
[[writing/flows/프롬프트로 글 고치기 플로우]], [[writing/flows/초안 편집과 자동 저장 플로우]]

## 확인 필요
- [[writing/open-questions]] #10, #11, #13, #14, #15

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-09 | 최초 기록 (프롬프트로 글 고치기 신설) | 커밋 b7ced30 |
| 2026-10-10 | 분량 상한이 고정 3,000자에서 작업의 목표 기준으로, 고칠 때 작업의 말투를 함께 지시. **분량·말투 바꿔 다시 쓰기** 추가 (조사 자료 사용, 요청 생략 가능, 글 전체만, 적용하면 작업의 분량·말투 변경, 상한 초과는 경고만) | 커밋 afc7c10, `blog-writer:server/editPost.ts:97-109`, `blog-writer:server/routes/edit.ts:12-38` |
