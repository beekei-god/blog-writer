---
type: business-rule
domain: image
id: BR-IMG-014
name: 한 장씩 다시 만들기 동시 실행
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/pipeline.ts:49-60
  - blog-writer:server/pipeline.ts:217-241
  - blog-writer:server/pipeline.ts:267-296
  - blog-writer:server/routes/images.ts:73-137
  - blog-writer:server/cancel.ts:15-33
  - blog-writer:server/store.ts:131-148
  - blog-writer:src/job/JobDetail.tsx:121-151
  - blog-writer:src/job/images.tsx:255-288
  - blog-writer:tests/imageParallel.test.ts
entities: [ImageSpec, Job]
updated: 2026-10-09
---
# BR-IMG-014 한 장씩 다시 만들기 동시 실행

## 규칙
한 글 안에서 이미지 여러 장을 각각 "이미지 다시 생성"으로 **동시에** 만들 수 있다. API·Claude로 만드는 이미지는 함께 돌고, 크롬에서 만드는 이미지는 크롬 큐에서 누른 순서대로 하나씩 만든다. 한 장씩 만드는 동안에는 다른 이미지의 다시 생성·직접 올리기만 받고, 그 이미지 자체와 초안 수정·전체 다시 만들기·블로그 등록·삭제는 모두 끝날 때까지 막는다. 이 규칙은 [[writing/business-rules/BR-WRT-011 작업 중복 실행과 진행 중 변경 금지]]의 예외다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 다른 이미지를 한 장씩 만드는 중에 또 다른 이미지 다시 생성 | 202, 함께 실행 |
| 같은 이미지를 만드는 중에 그 이미지 다시 생성·직접 올리기 | 409 |
| 다른 단계(초안 작성·전체 다시 만들기·블로그 입력)가 도는 중 | 409 (예전과 같음) |
| 한 장씩 만드는 중 초안 수정·전체 다시 만들기·블로그 등록·삭제 | 409 |
| 한 장 끝남, 다른 이미지 아직 진행 | 상태 `generating_images` 유지, `generatingImages`에서 그 이미지만 뺌 |
| 마지막 이미지 끝남 | `draft_ready`, `imageRunsOnly` 지움 |
| "작업 중지" | 진행 중인 이미지 모두 중지 (실패로 기록하지 않음) |
| 서버 재시작 | 진행 표시와 `imageRunsOnly`를 지우고 초안 상태로 복구 → [[writing/business-rules/BR-WRT-012 중단 시 작업 상태 복구]] |

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 서버 | 작업 잠금(`running`)과 별도로 이미지별 진행(`imageRuns`), `isImageBusy` | `blog-writer:server/pipeline.ts:49-60` |
| 서버 | `runImage`: 끝날 때 다른 진행이 없을 때만 초안 상태로 | `blog-writer:server/pipeline.ts:217-241` |
| 서버 | 진행 표시를 덮어쓰지 않고 더하고 빼기 | `blog-writer:server/pipeline.ts:267-296` |
| 서버 API | 한 장 다시 만들기·올리기는 그 이미지 기준으로 409, `imageRunsOnly` 표시 | `blog-writer:server/routes/images.ts:73-137` |
| 서버 | 작업마다 여러 중지 신호 | `blog-writer:server/cancel.ts:15-33` |
| 화면 | `imageRunsOnly`면 다른 이미지 도구 사용 가능, 만드는 중인 이미지는 도구 숨김 | `blog-writer:src/job/JobDetail.tsx:121-151`, `blog-writer:src/job/images.tsx:255-288` |
| 테스트 | 동시 실행, 같은 이미지 무시, 중지, 진행 중 요청 409 | `blog-writer:tests/imageParallel.test.ts` |

## 예외 / 경계값
- 화면은 job 상태로, 서버는 메모리(`imageRuns`)로 판단한다.
- 한 장씩 만들기가 시작될 때마다 job의 `error`를 지우므로, 다른 이미지가 남긴 작업 오류 문구가 사라질 수 있다 (이미지별 실패는 각 이미지에 남는다).

## 영향받는 플로우
[[image/flows/이미지 다시 만들기 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-08 | 최초 기록 (이전에는 이미지 한 장 다시 만들기도 작업 전체를 잠가 한 번에 하나만 가능) | 커밋 38ae96c |
