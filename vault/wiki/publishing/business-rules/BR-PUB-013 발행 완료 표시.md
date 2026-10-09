---
type: business-rule
domain: publishing
id: BR-PUB-013
name: 글 상태 직접 바꾸기 (블로그 발행완료 표시)
aliases: [발행 완료 표시와 수기 상태 변경]
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:shared/types.ts:249-282
  - blog-writer:shared/labels.ts:4-17
  - blog-writer:server/routes/jobs.ts:163-190
  - blog-writer:src/api.ts:130-132
  - blog-writer:src/job/NextStep.tsx:11-34
  - blog-writer:src/job/NextStep.tsx:79-127
  - blog-writer:src/job/JobDetail.tsx:207-210
  - blog-writer:src/job/Progress.tsx:5-44
  - blog-writer:src/App.tsx:23-38
  - blog-writer:tests/api.test.ts:134-158
entities: [Job, 블로그 설정]
updated: 2026-10-09
---
# BR-PUB-013 글 상태 직접 바꾸기 (블로그 발행완료 표시)

## 규칙
초안 검토 이후의 글은 사용자가 글 상태를 **직접** 바꿀 수 있다. 앱은 이때 블로그에 올리거나 발행하지 않고 **표시만** 바꾼다. 쓰임새: 블로그에서 직접 발행한 뒤 "블로그 발행완료"로 표시, 직접 올린 글을 표시, 잘못된 표시를 되돌리기, 다시 고치려고 초안 검토로 돌리기.

| 지금 상태 (`canSetStatus`) | 고를 수 있는 상태 (`MANUAL_STATUSES`) |
|---|---|
| 초안 검토 `draft_ready`, 블로그 임시저장 완료 `posted`, 블로그 발행 예약 `scheduled`, 블로그 발행완료 `published` | 초안 검토 `draft_ready`, 블로그 임시저장 완료 `posted`, 블로그 발행완료 `published` 중 **지금과 다른 것** |

블로그 발행 예약(`scheduled`)은 수기로 고를 수 없다(앱이 예약발행에 성공했을 때만 생김). 예약된 글은 앱이 블로그·사이트 상태를 다시 읽지 않으므로 예약 시각이 지나도 자동으로 발행완료가 되지 않는다. 사용자가 확인하고 직접 바꾼다.

## 조건과 결과
| 요청 | 결과 |
|---|---|
| → `published` | 상태 변경, 로그 "블로그 발행완료로 표시했습니다." |
| → `posted` | 상태 변경, 로그 "블로그 임시저장 완료로 표시했습니다." |
| → `draft_ready` | 상태 변경, 로그 "초안 검토로 되돌렸습니다." |
| 지금 상태가 위 4개가 아님 (자료 조사 중·실패 등), 또는 같은 상태로 | 400 "<지금 상태 이름> 상태의 글은 <요청 상태 이름>(으)로 바꿀 수 없습니다." |
| 요청 상태가 3개 밖 (예: `scheduled`), 본문 형식 오류 | 400 "요청 형식이 올바르지 않습니다." |
| 작업 진행 중 | 409 "이미 진행 중입니다." |
| 없는 글 | 404 |
| 성공 시 | `error`를 비운다. `job.wordpress` 기록은 그대로 둔다 |

엔드포인트는 `PUT /api/jobs/:id/status` `{status}` 하나다.

## 화면
- 진행 단계 바로 아래에 **"글 상태 [초안 검토 | 블로그 임시저장 완료 | 블로그 발행완료]"** 한 줄(`StatusPicker`). 초안이 있고, 진행 중이 아니고, 지금 상태가 바꿀 수 있는 상태일 때만 보인다. 지금 상태 버튼이 켜져 있고, 같은 버튼을 누르면 아무 일도 없다.
- **초안 검토로 되돌릴 때만** 확인 창: "초안 검토 상태로 되돌릴까요?\n블로그에 이미 저장·발행된 글은 그대로 남습니다."
- 블로그 발행 예약 상태면 버튼 옆에 "지금은 블로그 발행 예약 상태입니다." (켜진 버튼 없음)
- 블로그 발행완료 글: "블로그 발행완료된 글입니다." + 워드프레스 기록이 있으면 "워드프레스에 발행했거나 블로그 발행완료로 표시한 글입니다." + "글 열기", 없으면 "블로그에 발행했거나 블로그 발행완료로 표시한 글입니다." 올릴 곳 선택과 다시 올리는 버튼은 없다 (먼저 상태를 바꿔야 함).
- 올릴 블로그를 아직 고르지 않은 `posted`/`scheduled` 글: "이미 <상태 이름> 상태인 글입니다. 올릴 블로그를 위에서 선택하세요."
- 진행 단계: 자료 조사 > 글 작성 > (이미지 생성) > 초안 검토 > **블로그 임시저장**(올리는 중 `posting`과 `posted`가 한 단계) > **블로그 발행완료**. `posted`·`scheduled`는 블로그 임시저장까지 완료이고 블로그 발행완료가 현재 단계로 강조된다. `published`는 모든 단계 완료.
- 목록 배지 색: 블로그 발행완료 보라(`--pub`), 블로그 발행 예약 청록(`--sch`), 임시저장 완료 초록. 배지 글자는 `STATUS_LABEL`.
- 목록 필터: 전체 / 자료 조사 중 / 초안 검토 / 임시 저장(`posting`·`posted`) / 발행 완료(`scheduled`·`published`). 실패는 전체에서만 → [[writing/flows/내 글 목록 상태 필터 플로우]].

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 공용 | `JobStatus`, `MANUAL_STATUSES`·`ManualStatus`·`canSetStatus`, 상태 이름 `STATUS_LABEL` | `blog-writer:shared/types.ts:249-260`, `:272-276`, `blog-writer:shared/labels.ts:4-17` |
| 서버 | `MANUAL_LOG`, `PUT /api/jobs/:id/status` | `blog-writer:server/routes/jobs.ts:163-190` |
| 화면 | `api.setStatus`, `StatusPicker`, 표시 위치, `NextStep`의 발행완료·미선택 안내, `Progress` | `blog-writer:src/api.ts:130-132`, `blog-writer:src/job/NextStep.tsx:11-34`, `:73-121`, `blog-writer:src/job/JobDetail.tsx:207-210`, `blog-writer:src/job/Progress.tsx:5-44` |
| 화면(목록) | 필터 칩 | `blog-writer:src/App.tsx:23-38` |
| 스타일 | `--pub`, `--sch`, `.badge.published`, `.badge.scheduled`, `.status-picker` | `blog-writer:src/styles.css:6-7`, `:17-18`, `:95-96`, `:328` |
| 테스트 | 초안 검토·임시저장 완료·발행완료 사이 이동, 예약에서 바꾸기, 같은 상태·초안 전 거절, `scheduled` 요청 거절 | `blog-writer:tests/api.test.ts:134-158` |

## 예외 / 경계값
- 초안 검토 글도 바로 "블로그 임시저장 완료"·"블로그 발행완료"로 표시할 수 있다 (앱 밖에서 직접 올린 경우). 앱은 실제로 올렸는지 확인하지 않는다.
- 발행완료 글에서 이미지를 다시 만들면 이미지 단계가 `draft_ready`로 끝나 표시가 풀린다. 의도다 (2026-10-05 확정).
- 워드프레스에 자동발행해 사이트에서 공개된 글도 "블로그 임시저장 완료"로 바꿀 수 있다. 사이트의 글은 공개 상태 그대로다 ([[publishing/open-questions]] #8). 네이버·티스토리에 앱이 자동발행한 글도 같다.
- 초안 검토로 되돌려도 블로그에 올라간 임시저장·발행 글은 그대로이며 앱이 지우지 않는다.
- `published`·`scheduled`는 `BUSY_STATUSES`가 아니다 (재시작 복구 대상 아님).
- `api.ts`의 `setStatus` 주석은 아직 "발행완료 표시/취소, 초안 검토로 되돌리기"라고 적혀 있다(동작은 위 표대로).

## 영향받는 플로우
[[publishing/flows/블로그 임시저장 플로우]], [[publishing/flows/워드프레스 API 등록 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 (발행 완료 상태·표시·취소 추가) | |
| 2026-10-05 | 수기로 초안 완료로 되돌리기 추가, 엔드포인트를 `PUT /status`로 일반화, 발행 완료 배지를 보라색으로, 이미지 재생성 시 초안 완료 복귀를 의도로 확정 | |
| 2026-10-07 | `scheduled`(예약됨) 상태 추가: `scheduled → published/draft_ready` 수기 전이, 예약됨 배지·필터. 화면 문구에 워드프레스 경우 추가. 서버 코드는 `server/routes/jobs.ts`로 옮겨짐 | `blog-writer:server/routes/jobs.ts:155-160` |
| 2026-10-09 | **전이 규칙 변경**: 정해진 전이 표(`MANUAL_TRANSITIONS`: posted→published/draft_ready, published→posted/draft_ready, scheduled→published/draft_ready) → `draft_ready`·`posted`·`scheduled`·`published`에서 `draft_ready`·`posted`·`published` 중 다른 상태로 자유롭게 (초안 검토→발행완료, 예약→임시저장 완료 등이 새로 가능). 화면은 안내 상자의 버튼("발행 완료로 표시/발행 완료 취소/초안 완료로 되돌리기") → 진행 단계 아래 "글 상태" 한 줄. 로그 문구 "발행 완료로 표시했습니다." 등 → "블로그 발행완료로 표시했습니다." 등. 상태 이름: 초안 완료→초안 검토, 임시저장 완료→블로그 임시저장 완료, 예약됨→블로그 발행 예약, 발행 완료→블로그 발행완료. 목록 필터를 단계별 5개로 묶음. `scheduled`가 네이버·티스토리 예약발행에서도 생김 | 커밋 65bfa3e, `blog-writer:shared/types.ts:278-282`, `blog-writer:server/routes/jobs.ts:163-190`, `blog-writer:src/job/NextStep.tsx:11-34` |
