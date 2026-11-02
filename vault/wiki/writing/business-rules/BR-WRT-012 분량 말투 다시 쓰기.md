---
type: business-rule
domain: writing
id: BR-WRT-012
name: 분량 말투 다시 쓰기
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/editPost.ts:rewriteSection
  - blog-writer:server/routes/edit.ts:10-35
  - blog-writer:server/routes/edit.ts:46-58
entities: [수정 제안, 글쓰기 옵션]
updated: 2026-11-02
---
# BR-WRT-012 분량 말투 다시 쓰기

## 규칙
이미 쓴 글을 새 분량·말투로 **글 전체**를 다시 쓸 수 있다(범위 선택과는 함께 못 한다). 사실·숫자·날짜·출처는 바꾸지 않고, 분량을 늘릴 때는 기존 글과 처음 조사한 자료로 보태며 그래도 모자라면 웹 검색으로 확인한 사실만 더한다. 채울 사실이 없으면 짧게 끝내고 이유를 note에 적는다. 제안을 적용하면 새 분량·말투가 그 작업의 `writingOptions`가 된다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| `writing`과 `range` 동시 | 400 "분량·말투를 바꿀 때는 글 전체를 다시 씁니다" |
| `writing` 값이 규칙 밖 | 400 |
| 이 요청은 prompt가 비어도 됨 | 추가 요청으로만 쓰임 |
| 적용 | 글 블록 교체 + `writingOptions` 갱신 |
| 지시 우선순위 | "요청한 부분만 고치세요"보다 다시 쓰기 지시가 우선 |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 서버 | `rewriteSection`, `proposeEdit({rewrite})` | 목표±10% 지시, 조사 노트·출처 함께 제공 | `blog-writer:server/editPost.ts` |
| 서버 | `/edit/apply` | `proposal.writing` → `j.writingOptions` | `blog-writer:server/routes/edit.ts:58` |
| 화면 | 분량·말투 다시 쓰기 버튼 | | [[_system/modules/web-job]] |
| 테스트 | 요청 없이 시작·적용 시 옵션 변경, 새 목표·말투·조사 자료 표시 | | `blog-writer:tests/editPost.test.ts:114`, `:228` |

## 영향받는 플로우
[[writing/flows/프롬프트로 글 고치기]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-11-02 | wiki 재생성 때 코드(73f47a6) 기준으로 작성 | 코드 |
