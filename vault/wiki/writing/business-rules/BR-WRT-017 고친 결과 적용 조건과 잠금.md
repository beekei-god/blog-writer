---
type: business-rule
domain: writing
id: BR-WRT-017
name: 고친 결과 적용 조건과 잠금
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/editPost.ts:192-207
  - blog-writer:server/routes/edit.ts:33-68
  - blog-writer:server/pipeline.ts:157-197
  - blog-writer:server/pipeline.ts:128-132
  - blog-writer:server/store.ts:131-140
  - blog-writer:server/routes/jobs.ts:84-91
  - blog-writer:server/routes/images.ts:150
  - blog-writer:server/routes/images.ts:184
  - blog-writer:src/job/JobDetail.tsx:34-36
entities: [Job]
updated: 2026-10-09
---
# BR-WRT-017 고친 결과 적용 조건과 잠금

## 규칙
글을 고치는 **제안을 만드는 동안** 그 작업은 다른 작업처럼 잠긴다. 결과는 **제안을 만들 때 본 블록(before)이 지금 글의 그 범위와 똑같을 때만** 적용된다. 그 사이 글이 바뀌었으면 거절하고 자동으로 다시 만들지는 않는다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 제안을 만드는 중(`editProposal.status = "running"`) | 작업이 `running` 집합에 들어가 `isRunning`이 true. 글 수정(`PUT /post`), 블로그 올리기, 상태 변경, 재시도, 삭제, 이미지 추가·삭제·만들기 모두 409. 새 고치기 요청도 409 "진행 중인 작업이 끝난 뒤에 시작해 주세요." |
| 만드는 중에 `POST /edit/apply` | 409 "진행 중인 작업이 끝난 뒤에 적용해 주세요." |
| 만드는 중에 `DELETE /edit` (버리기) | 409 "만드는 중입니다. 중지한 뒤에 버려 주세요." |
| `ready`가 아닌 제안(없음·running·failed)에 적용 | 400 "적용할 결과가 없습니다." |
| 적용 시 범위(글 전체면 모든 블록)의 현재 블록이 제안의 `before`와 완전히 같음 | 적용: 범위 블록을 `after`로 바꾸고 제안 삭제, 로그 "프롬프트로 글을 고쳤습니다: <note>" |
| 같지 않음 (그 사이 직접 고침, 이미지 추가·삭제 등) | 409 "그 사이 글이 바뀌어서 적용할 수 없습니다. 같은 요청으로 다시 만들어 주세요." 제안은 남는다 |
| 글 전체 제안인데 현재 블록 수가 `before`와 다름 | 같은 409 |
| 글 전체 제안 적용 | 제목은 `title`이 있으면, 요약은 `summary`가 있으면 바꾼다. 범위 제안은 제목·요약을 바꾸지 않는다 |
| 사용자가 만드는 중 "중지" | 제안 삭제 (글은 그대로), 로그 "글 고치기를 중지했습니다." 작업 상태(`status`)는 바뀌지 않는다 |
| Claude 실패 | 제안을 `failed` + `error`로 남김 (글은 그대로), 로그 "글 고치기 실패: …" |
| 서버 재시작 때 `running` 제안이 남아 있음 | `failed`, 오류 "서버가 재시작되어 글 고치기가 중단되었습니다." (작업 상태와 별개로 처리) → [[writing/business-rules/BR-WRT-012 중단 시 작업 상태 복구]] |
| 새 초안이 만들어짐 (다시 시도·자료 조사부터 다시) | 새 글을 저장할 때 제안 삭제 ("이전 글에 대한 고치기 제안은 쓸 수 없다") |
| `ready`·`failed` 제안이 남아 있음 | 잠금 아님. 글 수정·올리기가 가능하다 (그래서 적용 때 `before` 비교가 필요) |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 서버(잠금) | `startEdit`가 `running.add` + `isRunning` 검사 | 만드는 동안 다른 라우터의 `isRunning` 409 | `blog-writer:server/pipeline.ts:157-170`, `blog-writer:server/routes/jobs.ts:90`, `blog-writer:server/routes/images.ts:150`, `:184` |
| 서버(적용) | `applyProposal` | `before` 비교, 글 전체는 블록 수도 비교 | `blog-writer:server/editPost.ts:195-207` |
| 서버(라우터) | `POST /edit/apply`, `DELETE /edit` | 위 표의 상태 코드 | `blog-writer:server/routes/edit.ts:34-68` |
| 서버(복구) | `recoverStuckJobs` | running → failed | `blog-writer:server/store.ts:131-140` |
| 서버(새 초안) | `doDraft`의 글 저장 | `delete j.editProposal` | `blog-writer:server/pipeline.ts:128-132` |
| 화면 | `busy`에 제안 running 포함 | 편집·올리기·이미지 버튼 비활성, 선택은 블록 수가 바뀌면 해제 | `blog-writer:src/job/JobDetail.tsx:34-36`, `:176-180` |
| 테스트 | `tests/editPost.test.ts` | 범위가 바뀌면 적용 안 됨, 만드는 동안 글 수정 막힘, 실패·중지 | `blog-writer:tests/editPost.test.ts:103-132`, `:170-223` |

## 예외 / 경계값
- 중지로 지운 제안과 재시작으로 실패한 제안은 글을 건드리지 않는다.
- 제안이 낡았을 때(stale) 서버는 거절만 한다. 화면에서 "요청을 고쳐서 다시 만들기"로 사용자가 다시 시작해야 한다 → [[writing/open-questions]] #12.
- 이미지 추가·삭제도 블록 번호를 바꾸므로 `before`와 달라져 적용이 거절된다.

## 영향받는 플로우
[[writing/flows/프롬프트로 글 고치기 플로우]], [[writing/flows/작업 중지와 재시도 플로우]], [[writing/flows/초안 편집과 자동 저장 플로우]]

## 확인 필요
- [[writing/open-questions]] #12

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-09 | 최초 기록 | 커밋 b7ced30 |
