---
type: business-rule
domain: writing
id: BR-WRT-012
name: 중단 시 작업 상태 복구
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/pipeline.ts:37-45
  - blog-writer:server/pipeline.ts:137-146
  - blog-writer:server/pipeline.ts:149-215
  - blog-writer:server/pipeline.ts:355-356
  - blog-writer:server/pipeline.ts:416-428
  - blog-writer:server/browser/publish.ts:266-304
  - blog-writer:server/store.ts:131-143
  - blog-writer:server/cancel.ts:1-39
  - blog-writer:src/job/JobDetail.tsx:144-148
entities: [Job]
updated: 2026-10-09
---
# BR-WRT-012 중단 시 작업 상태 복구

## 규칙
작업이 실패하거나, 사용자가 중지하거나, 서버가 재시작되어 끊기면 **초안이 있으면 초안 검토(draft_ready)로, 없으면 실패(failed)로** 돌린다. 지금까지 만든 초안과 이미지는 그대로 남긴다. 사용자 중지는 오류로 표시하지 않는다.

예외 (2026-10-09): 네이버·티스토리에 예약발행·자동발행으로 올릴 때, 임시저장은 끝났는데 그 뒤 발행 창에서 멈추면 **블로그 임시저장 완료(posted)** 로 두고 멈춘 이유를 `error`에 남긴다 → [[publishing/business-rules/BR-PUB-001 발행하지 않고 임시저장까지만]].

## 조건과 결과
| 조건 | 상태 | `error` | 로그 |
|---|---|---|---|
| 초안 단계 실패 | 초안 있으면 draft_ready, 없으면 failed | 오류 메시지 | "실패: …" |
| 초안 단계 중지 | 같음 | 초안 있으면 없음, 없으면 "사용자가 작업을 중지했습니다." | "작업을 중지했습니다." |
| 이미지 단계 실패/중지 | draft_ready (한 장씩 동시에 만드는 중이면 마지막 이미지가 끝날 때) | 실패면 메시지, 중지면 없음 | "이미지 생성 실패/중지" |
| 블로그 입력(크롬) 실패/중지 | 초안 있으면 draft_ready | 실패면 메시지 | 중지: "크롬에 열린 탭에 일부만 들어갔을 수 있으니 확인하세요." |
| 네이버·티스토리 예약발행·자동발행에서 임시저장 뒤 발행 창 단계가 멈춤(`PublishStepError`: 단계마다 10초 안에 끝나지 않거나 화면에서 오류) | **posted**(블로그 임시저장 완료). 임시저장은 됐기 때문 | 멈춘 이유 ("임시저장은 했지만 발행 창의 "<단계>"에서 멈췄습니다: … 크롬에 열린 탭에서 직접 발행하세요.", 마지막 발행 버튼을 누른 뒤면 "발행됐는지 확인하지 못했습니다…") | 같은 문구 |
| 발행 창 단계 중 중지 | 발행 버튼을 누르기 전이면 중지가 반영되어 위 크롬 중지와 같이 draft_ready (임시저장은 된 상태). 누른 뒤에는 중지를 보지 않고 끝까지 확인 | 없음 | 크롬 중지와 같음 |
| 워드프레스 API 등록 실패/중지 | 초안 있으면 draft_ready | 실패면 메시지 | "워드프레스 등록 실패: …" / "워드프레스 등록을 중지했습니다." 중지 신호는 진행 중인 요청도 끊는다 |
| 서버 재시작 시 진행 중 상태로 남은 작업 | 초안 있으면 draft_ready, 없으면 failed. 진행 표시(`generatingImages`·`regeneratingImages`)와 `imageRunsOnly`도 지움 | "서버가 재시작되어 작업이 중단되었습니다." | |
| 중지 요청했는데 진행 중 작업 없음 | 409 "중지할 작업이 없습니다." | | |

중지는 AbortController 신호로 진행 중인 Claude 호출을 SIGTERM하고(이미지 API 요청도 같은 신호로 끊김), 단계 사이 `throwIfCancelled`에서 멈춘다. 한 작업에 신호가 여러 개일 수 있어(이미지 한 장씩 동시 실행) "작업 중지"는 그 작업의 신호를 모두 보낸다. 이미 만든 이미지는 실패로 기록하지 않는다 (`blog-writer:server/images/index.ts:87`).

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 서버 | 파이프라인 catch 블록 4곳(초안·이미지 `imagesStep`·워드프레스·크롬 입력). 워드프레스와 크롬 입력은 공용 `failStep`(초안 있으면 draft_ready, 중지면 오류 없음)을 쓰고, 크롬 입력은 그 전에 `PublishStepError`를 따로 받아 posted로 둔다. 이미지 실행 마무리(`runImages`·`runImage`의 finally), 재시작 복구 | 위 source |
| 화면 | 중지 확인 창 "지금까지 만든 초안과 이미지는 그대로 남습니다." | `blog-writer:src/job/JobDetail.tsx:144-148` |

## 예외 / 경계값
- Playwright·AppleScript 경로는 Claude 호출이 아니어서, 중지 신호는 다음 `throwIfCancelled` 지점까지 반영되지 않는다 (대체 경로 시작 전 한 번만 확인, `blog-writer:server/pipeline.ts:384`).
- 추천도 재시작 시 failed로 바꾼다 → [[topic/business-rules/BR-TOP-005 추천 동시 실행과 입력 제한]].

## 영향받는 플로우
[[writing/flows/작업 중지와 재시도 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-08 | 이미지 한 장씩 동시 실행: 중지는 작업의 모든 신호를 보냄(`cancel.ts`가 작업마다 여러 AbortController), 이미지 상태 복귀는 마지막 진행이 끝날 때, 재시작 복구가 `imageRunsOnly`도 지움 | 커밋 38ae96c |
| 2026-10-09 | 네이버·티스토리 발행 창 단계가 멈추면(`PublishStepError`) draft_ready가 아니라 posted + 오류 이유로 둠. 실패·중지 처리를 `failStep`으로 공용화(동작 같음) | `blog-writer:server/pipeline.ts:37-45`, `:416-428`, `blog-writer:server/browser/publish.ts:266-304` |
