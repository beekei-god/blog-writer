---
type: business-rule
domain: writing
id: BR-WRT-018
name: 고칠 때 이미지는 그대로
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/editPost.ts:67-72
  - blog-writer:server/editPost.ts:119-127
  - blog-writer:server/editPost.ts:159-180
  - blog-writer:server/editPost.ts:86
  - blog-writer:tests/editPost.test.ts:51-101
entities: [Post]
updated: 2026-10-09
---
# BR-WRT-018 고칠 때 이미지는 그대로

## 규칙
프롬프트로 글을 고칠 때 **이미지 블록은 새로 만들거나 지우거나 바꾸지 않는다.** Claude에게는 이미지를 파일 대신 `ref`(`img-1`…)와 대체 텍스트로만 보여 주고, 결과에서는 서버가 원래 이미지(파일 포함)를 되돌려 붙인다. 이미지를 놓는 위치는 요청에 맞게 옮겨도 된다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 범위 안의 이미지 블록 | `img-1`부터 번호를 붙여 `{type:"image", ref, alt}`로만 보여 준다. 파일·프롬프트·문구는 안 보인다 |
| 결과의 이미지 ref가 범위 안 이미지와 맞음 | 원래 이미지 블록 그대로(`file` 포함) 되돌려 붙임 |
| 모르는 ref 또는 같은 ref를 두 번 씀 (이미지를 늘림) | 오류 "이미지 블록을 바꿔서 결과를 쓸 수 없습니다. 다시 시도해 주세요." → 제안 `failed` |
| 이미지가 하나라도 빠짐 (이미지를 뺌) | 오류 "이미지 블록이 빠져서 결과를 쓸 수 없습니다. 다시 시도해 주세요." |
| 칸이 비어 있는 표 | 그 표 블록을 뺀다 (`isCompleteTable`) → [[writing/business-rules/BR-WRT-007 빈 칸 있는 표 행 제거]] |
| 글 전체를 고쳤는데 결과 블록이 하나도 없음 | 오류 "글 전체를 고친 결과에 본문이 없습니다. 다시 시도해 주세요." |
| 고친 결과가 원래와 같음 (블록이 모두 같고, 글 전체면 제목·요약도 같음) | 제안으로 만들지 않고 오류 "바꿀 부분이 없다고 판단했습니다: <Claude의 note 또는 '요청을 더 구체적으로 써 주세요.'>" |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 서버 | ref 부여·되돌려 붙임·검증 | 이미지 개수·중복·모르는 ref 검사 | `blog-writer:server/editPost.ts:119-127`, `:159-174` |
| 서버 | 빈 칸 표 제거, 바뀐 것 없음 거절 | | `blog-writer:server/editPost.ts:170`, `:176-180` |
| 프롬프트 | "이미지 블록은 새로 만들거나 지우지 마세요. 보이는 이미지 블록을 빠짐없이 한 번씩, ref를 그대로" | | `blog-writer:server/editPost.ts:86` |
| 화면 | 안내 문구 "이미지는 새로 만들거나 지우지 않고 그대로 둡니다." | | `blog-writer:src/job/EditByPrompt.tsx:84` |
| 테스트 | 범위 고침에서 이미지 원본 복원, 이미지 빼기·늘리기·모르는 ref, 바뀐 것 없음, 빈 표 | | `blog-writer:tests/editPost.test.ts:51-101` |

## 예외 / 경계값
- 이미지를 더하거나 빼려면 고치기가 아니라 편집 화면의 "＋ 여기에 이미지 추가"·이미지 삭제를 쓴다 → [[image/overview]].
- 범위 밖의 이미지는 Claude에게 보이지 않고 서버가 그대로 이어 붙이므로 영향이 없다.

## 영향받는 플로우
[[writing/flows/프롬프트로 글 고치기 플로우]]

## 확인 필요
- [[writing/open-questions]] #13 (실제 Claude로 써 본 결과 품질 미확인)

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-09 | 최초 기록 | 커밋 b7ced30 |
