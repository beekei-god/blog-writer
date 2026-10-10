---
type: business-rule
domain: writing
id: BR-WRT-011
name: 작업 중복 실행과 진행 중 변경 금지
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/pipeline.ts:25-66
  - blog-writer:server/pipeline.ts:220-262
  - blog-writer:server/pipeline.ts:390-414
  - blog-writer:server/routes/jobs.ts:94-123
  - blog-writer:server/routes/jobs.ts:125-185
  - blog-writer:server/routes/jobs.ts:189-245
  - blog-writer:server/routes/images.ts:20
  - blog-writer:server/routes/images.ts:82
  - blog-writer:server/routes/images.ts:122
  - blog-writer:src/job/JobDetail.tsx:39
  - blog-writer:src/job/JobDetail.tsx:127-129
entities: [Job]
updated: 2026-10-10
---
# BR-WRT-011 작업 중복 실행과 진행 중 변경 금지

## 규칙
한 작업은 한 번에 하나의 단계(초안·이미지·블로그 입력)만 실행한다. 실행 중에는 초안 수정, 이미지 올리기·다시 만들기, 블로그 입력, 재시도, 삭제를 받지 않는다.

**예외 (2026-10-08)**: 이미지 한 장 다시 만들기는 작업 전체를 잠그지 않는다. 한 장씩 만드는 것만 진행 중이면 **다른 이미지**의 다시 만들기·직접 올리기는 받아서 동시에 진행한다. 그 밖의 요청(초안 수정·전체 이미지 다시 만들기·블로그 입력·재시도·삭제·수기 상태 변경)은 여전히 막는다 → [[image/business-rules/BR-IMG-014 한 장씩 다시 만들기 동시 실행]].

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 실행 중(`running`에 id 있음, 또는 이미지를 한 장씩 만드는 중)에 같은 작업 실행 요청 | 무시 (`runDraft`/`runImages`/`runPost`가 바로 끝남) |
| 이미지 한 장씩 만드는 중(`imageRuns`만 있음)에 **다른** 이미지 다시 만들기·직접 올리기 | 받음 (202 / 200), 동시 진행 |
| 같은 이미지를 만드는 중이거나 `running`이 있을 때 그 이미지 다시 만들기·직접 올리기 | 409 |
| 실행 중 PUT post | 409 "작업 진행 중에는 수정할 수 없습니다." |
| 실행 중 블로그 등록·이미지 다시 만들기·블로그별 수기 상태 변경·재시도 | 409 "이미 진행 중입니다." |
| 실행 중 제목 다시 만들기 | 409 "진행 중인 작업이 끝난 뒤에 다시 만들어 주세요." (제목 다시 만들기 자체는 작업을 잠그지 않음 → [[writing/business-rules/BR-WRT-013 제목 후보와 키워드]]) |
| 실행 중 업로드 | 409 "진행 중인 작업이 끝난 뒤에 올려 주세요." |
| 실행 중 삭제 | 409 "진행 중인 작업은 삭제할 수 없습니다." |
| 블로그 입력이 크롬 큐에서 대기 중 | 대기 중에도 실행 중으로 표시 (큐에 넣기 전에 `running.add`). 워드프레스 API 등록은 크롬 큐를 거치지 않지만 같은 방식으로 실행 중 표시 |
| 화면 | 진행 중(`BUSY_STATUSES`)이면 편집 탭·삭제·이미지 도구 비활성. 단 `imageRunsOnly`(한 장씩 만드는 것만 진행 중)면 이미지 도구는 쓸 수 있고, 만드는 중인 이미지만 도구를 숨긴다 |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 서버(파이프라인) | 메모리 Set `running`(작업 잠금) + Map `imageRuns`(한 장씩 만드는 이미지), `isRunning`(둘 중 하나라도) · `isImageBusy`(잠금 또는 그 이미지) | | `blog-writer:server/pipeline.ts:25`, `:53-64`, `:157-212`, `:340-351` |
| 서버(API) | `isRunning` 검사 → 409 | | `blog-writer:server/routes/jobs.ts:99`(초안 수정), `:117`(제목 다시 만들기), `:130`(블로그 등록), `:198`(블로그별 수기 상태), `:231`(재시도), `:241`(삭제), `blog-writer:server/routes/images.ts:20`(전체 이미지) |
| 서버(API) | `isImageBusy` 검사 → 409 | 이미지 한 장 | `blog-writer:server/routes/images.ts:82`(다시 만들기), `:119`(직접 올리기) |
| 화면 | `busy` 상태로 비활성, `imageRunsOnly`면 이미지 도구만 허용 | 상태 기준 | `blog-writer:src/job/JobDetail.tsx:39`, `:133-135` |

## 예외 / 경계값
- 다른 작업끼리는 동시에 돌 수 있다. 단, 크롬을 쓰는 단계는 전역으로 하나씩 → [[publishing/business-rules/BR-PUB-004 크롬 작업 직렬화]].
- 서버는 메모리 Set, 화면은 job 상태로 판단한다. 재시작 직후에는 Set이 비고 상태는 복구된다 → [[writing/business-rules/BR-WRT-012 중단 시 작업 상태 복구]].

## 영향받는 플로우
[[writing/flows/초안 작성 플로우]], [[writing/flows/초안 편집과 자동 저장 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-08 | 예외 추가: 이미지 한 장 다시 만들기는 작업 잠금 대신 이미지별 진행(`imageRuns`)으로 관리해 다른 이미지와 동시에 진행. 직접 올리기도 그 이미지 기준으로 검사 | 커밋 38ae96c |
| 2026-10-10 | 수기 상태 변경이 블로그별(`PUT /blogs/:platform/status`)로 바뀜, 제목 다시 만들기도 진행 중이면 409 | 커밋 afc7c10, `blog-writer:server/routes/jobs.ts:117`, `:198` |
