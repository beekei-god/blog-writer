---
type: business-rule
domain: writing
id: BR-WRT-012
name: 중단 시 작업 상태 복구
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/pipeline.ts:109-118
  - blog-writer:server/pipeline.ts:150-159
  - blog-writer:server/pipeline.ts:300-309
  - blog-writer:server/pipeline.ts:360-369
  - blog-writer:server/store.ts:134-146
  - blog-writer:server/cancel.ts:1-36
  - blog-writer:src/job/JobDetail.tsx:143-146
entities: [Job]
updated: 2026-10-07
---
# BR-WRT-012 중단 시 작업 상태 복구

## 규칙
작업이 실패하거나, 사용자가 중지하거나, 서버가 재시작되어 끊기면 **초안이 있으면 초안 검토(draft_ready)로, 없으면 실패(failed)로** 돌린다. 지금까지 만든 초안과 이미지는 그대로 남긴다. 사용자 중지는 오류로 표시하지 않는다.

## 조건과 결과
| 조건 | 상태 | `error` | 로그 |
|---|---|---|---|
| 초안 단계 실패 | 초안 있으면 draft_ready, 없으면 failed | 오류 메시지 | "실패: …" |
| 초안 단계 중지 | 같음 | 초안 있으면 없음, 없으면 "사용자가 작업을 중지했습니다." | "작업을 중지했습니다." |
| 이미지 단계 실패/중지 | draft_ready | 실패면 메시지, 중지면 없음 | "이미지 생성 실패/중지" |
| 블로그 입력(크롬) 실패/중지 | 초안 있으면 draft_ready | 실패면 메시지 | 중지: "크롬에 열린 탭에 일부만 들어갔을 수 있으니 확인하세요." |
| 워드프레스 API 등록 실패/중지 | 초안 있으면 draft_ready | 실패면 메시지 | "워드프레스 등록 실패: …" / "워드프레스 등록을 중지했습니다." 중지 신호는 진행 중인 요청도 끊는다 |
| 서버 재시작 시 진행 중 상태로 남은 작업 | 초안 있으면 draft_ready, 없으면 failed | "서버가 재시작되어 작업이 중단되었습니다." | |
| 중지 요청했는데 진행 중 작업 없음 | 409 "중지할 작업이 없습니다." | | |

중지는 AbortController 신호로 진행 중인 Claude 호출을 SIGTERM하고, 단계 사이 `throwIfCancelled`에서 멈춘다. 이미 만든 이미지는 실패로 기록하지 않는다 (`blog-writer:server/images/index.ts:92`).

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 서버 | 파이프라인 catch 블록 4곳(초안·이미지·워드프레스·크롬 입력), 재시작 복구 | 위 source |
| 화면 | 중지 확인 창 "지금까지 만든 초안과 이미지는 그대로 남습니다." | `blog-writer:src/job/JobDetail.tsx:143-146` |

## 예외 / 경계값
- Playwright·AppleScript 경로는 Claude 호출이 아니어서, 중지 신호는 다음 `throwIfCancelled` 지점까지 반영되지 않는다 (대체 경로 시작 전 한 번만 확인, `blog-writer:server/pipeline.ts:331`).
- 추천도 재시작 시 failed로 바꾼다 → [[topic/business-rules/BR-TOP-005 추천 동시 실행과 입력 제한]].

## 영향받는 플로우
[[writing/flows/작업 중지와 재시도 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
