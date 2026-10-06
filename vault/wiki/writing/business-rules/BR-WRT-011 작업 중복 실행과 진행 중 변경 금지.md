---
type: business-rule
domain: writing
id: BR-WRT-011
name: 작업 중복 실행과 진행 중 변경 금지
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/pipeline.ts:21-40
  - blog-writer:server/pipeline.ts:125-132
  - blog-writer:server/pipeline.ts:261-271
  - blog-writer:server/routes/jobs.ts:84-98
  - blog-writer:server/routes/jobs.ts:100-141
  - blog-writer:server/routes/jobs.ts:157-207
  - blog-writer:server/routes/images.ts:19
  - blog-writer:server/routes/images.ts:76
  - blog-writer:server/routes/images.ts:109
  - blog-writer:src/job/JobDetail.tsx:34
entities: [Job]
updated: 2026-10-07
---
# BR-WRT-011 작업 중복 실행과 진행 중 변경 금지

## 규칙
한 작업은 한 번에 하나의 단계(초안·이미지·블로그 입력)만 실행한다. 실행 중에는 초안 수정, 이미지 올리기·다시 만들기, 블로그 입력, 재시도, 삭제를 받지 않는다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 실행 중(`running`에 id 있음)에 같은 작업 실행 요청 | 무시 (`runDraft`/`runImages`/`runPost`가 바로 끝남) |
| 실행 중 PUT post | 409 "작업 진행 중에는 수정할 수 없습니다." |
| 실행 중 블로그 등록·이미지 다시 만들기·수기 상태 변경·재시도 | 409 "이미 진행 중입니다." |
| 실행 중 업로드 | 409 "진행 중인 작업이 끝난 뒤에 올려 주세요." |
| 실행 중 삭제 | 409 "진행 중인 작업은 삭제할 수 없습니다." |
| 블로그 입력이 크롬 큐에서 대기 중 | 대기 중에도 실행 중으로 표시 (큐에 넣기 전에 `running.add`). 워드프레스 API 등록은 크롬 큐를 거치지 않지만 같은 방식으로 실행 중 표시 |
| 화면 | 진행 중(`BUSY_STATUSES`)이면 편집 탭·삭제·이미지 도구 비활성 |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 서버(파이프라인) | 메모리 Set `running` | | `blog-writer:server/pipeline.ts:21`, `:28-40`, `:117`, `:125-132`, `:158`, `:261-270`, `:308`, `:368` |
| 서버(API) | `isRunning` 검사 → 409 | | `blog-writer:server/routes/jobs.ts:89`(초안 수정), `:105`(블로그 등록), `:165`(수기 상태), `:193`(재시도), `:203`(삭제), `blog-writer:server/routes/images.ts:19`, `:76`, `:109`(이미지) |
| 화면 | `busy` 상태로 비활성 | 상태 기준 | `blog-writer:src/job/JobDetail.tsx:34`, `:188`, `:266` |

## 예외 / 경계값
- 다른 작업끼리는 동시에 돌 수 있다. 단, 크롬을 쓰는 단계는 전역으로 하나씩 → [[publishing/business-rules/BR-PUB-004 크롬 작업 직렬화]].
- 서버는 메모리 Set, 화면은 job 상태로 판단한다. 재시작 직후에는 Set이 비고 상태는 복구된다 → [[writing/business-rules/BR-WRT-012 중단 시 작업 상태 복구]].

## 영향받는 플로우
[[writing/flows/초안 작성 플로우]], [[writing/flows/초안 편집과 자동 저장 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
