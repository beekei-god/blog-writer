---
type: business-rule
domain: writing
id: BR-WRT-011
name: 프롬프트로 글 고치기
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/editPost.ts:proposeEdit
  - blog-writer:server/editPost.ts:applyProposal
  - blog-writer:server/routes/edit.ts:1-76
entities: [수정 제안, 글 블록]
updated: 2026-11-02
---
# BR-WRT-011 프롬프트로 글 고치기

## 규칙
사용자가 쓴 수정 요청(2~2,000자)대로 글 전체 또는 선택한 블록 범위를 고친다. 결과는 글에 바로 넣지 않고 **제안**으로 돌려주며, 사용자가 비교해 보고 적용하거나 버린다. 요청한 부분만 고치고, 새 사실은 요청 내용·기존 자료·웹 검색(열람 최대 4개)으로 확인한 것만 쓴다. 이미지 블록은 새로 만들거나 지우지 않고 원래 이미지(파일 포함)를 그대로 쓴다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 요청이 2자 미만/2,000자 초과 | 400 |
| 초안 없음 / 범위가 글 밖 / 범위+분량·말투 동시 | 400 |
| 다른 작업이 진행 중 | 409 |
| 이미지 블록을 빼거나 늘리거나 모르는 ref | 결과를 쓰지 않고 오류("다시 시도해 주세요") |
| 바뀐 것이 없음 | 이유와 함께 거절 |
| 빈 칸 표 | 제거 |
| 적용 시 그 범위의 글이 제안 만든 뒤 바뀜 | 거절(409) "같은 요청으로 다시 만들어 주세요" |
| 글 전체 고치기 | 제목·요약도 받고, 블록 수가 달라졌으면 적용 거절 |
| 만드는 중에 버리기 | 409(먼저 중지) |

고친 부분도 작업의 분량 상한과 말투, 키워드 횟수를 지킨다. → [[writing/business-rules/BR-WRT-001 분량 목표와 상한]], [[writing/business-rules/BR-WRT-004 키워드 횟수와 검색 의도]]

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 서버 | `proposeEdit` | ref로 이미지 숨김/복원, 범위 병합 | `blog-writer:server/editPost.ts` |
| 서버 | `applyProposal` | 범위 변경 검사 | `blog-writer:server/editPost.ts` |
| 서버 | `startEdit`/`doEdit` | running→ready/failed, 중지 처리 | `blog-writer:server/pipeline.ts` |
| 서버 | 라우트 `POST /edit`, `/edit/apply`, `DELETE /edit` | 검사·로그 | `blog-writer:server/routes/edit.ts` |
| 공용 | `blockText`, `diffBlocks` | 비교 화면 | `blog-writer:shared/blockDiff.ts` |
| 화면 | 고치기 패널, 블록 범위 선택, 비교 | | [[_system/modules/web-job]] |
| 테스트 | 범위/전체, 이미지 유지, 적용 거절, 실패·중지 | | `blog-writer:tests/editPost.test.ts` |

## 영향받는 플로우
[[writing/flows/프롬프트로 글 고치기]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-11-02 | wiki 재생성 때 코드(73f47a6) 기준으로 작성 | 코드 |
