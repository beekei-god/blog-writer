---
type: business-rule
domain: publishing
id: BR-PUB-013
name: 발행 완료 표시와 수기 상태 변경
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:shared/types.ts:218-229
  - blog-writer:server/routes/jobs.ts:145-177
  - blog-writer:shared/labels.ts:4-14
  - blog-writer:src/api.ts:94-96
  - blog-writer:src/job/NextStep.tsx:6-153
  - blog-writer:src/job/NextStep.tsx:254-263
  - blog-writer:src/job/Progress.tsx:5-44
  - blog-writer:src/App.tsx:24-36
entities: [Job, 블로그 설정]
updated: 2026-10-07
---
# BR-PUB-013 발행 완료 표시와 수기 상태 변경

## 규칙
크롬으로 올리는 블로그는 앱이 발행하지 않는다([[publishing/business-rules/BR-PUB-001 발행하지 않고 임시저장까지만]]). 사용자가 블로그에서 직접 발행한 뒤, **블로그에 올린 글만** 앱에서 "발행 완료"(`published`)로 표시할 수 있다. 워드프레스에 자동발행하면 앱이 사이트 결과대로 바로 `published`로 둔다(예약발행은 `scheduled`) → [[publishing/business-rules/BR-PUB-014 워드프레스 등록 방식과 예약 시각]]. 그래서 "발행 완료"는 크롬 블로그에서 사용자가 직접 발행해 표시한 글과 워드프레스 자동발행 결과를 함께 뜻한다. 수기로 바꿀 수 있는 전이는 아래 표의 것뿐이다.

| 현재 상태 | 바꿀 수 있는 상태 |
|---|---|
| 임시저장 완료 `posted` | 발행 완료 `published`, 초안 완료 `draft_ready` |
| 발행 완료 `published` | 임시저장 완료 `posted`("발행 완료 취소"), 초안 완료 `draft_ready` |
| 예약됨 `scheduled` (워드프레스 예약발행) | 발행 완료 `published`, 초안 완료 `draft_ready` |

예약됨은 앱이 사이트 상태를 다시 읽지 않으므로, 예약 시각이 지나도 자동으로 발행 완료가 되지 않는다. 사용자가 확인하고 수기로 바꾼다.

## 조건과 결과
| 현재 상태 → 요청 상태 | 결과 |
|---|---|
| `posted`/`scheduled` → `published` | 상태 변경, 로그 "발행 완료로 표시했습니다." |
| `published` → `posted` | 상태 변경, 로그 "발행 완료 표시를 취소했습니다 (임시저장 완료로 되돌림)." |
| `posted`/`published`/`scheduled` → `draft_ready` | 상태 변경, 로그 "초안 완료로 되돌렸습니다." |
| 그 밖의 조합 (예: 초안 완료 → 발행 완료, 같은 상태로 변경) | 400 "<현재 상태 이름> 상태의 글은 <요청 상태 이름>(으)로 바꿀 수 없습니다." |
| 요청 상태가 `draft_ready`/`posted`/`published`가 아님 (예: `scheduled`), 본문 형식 오류 | 400 "요청 형식이 올바르지 않습니다." |
| 작업 진행 중 | 409 "이미 진행 중입니다." |
| 없는 글 | 404 |
| 성공 시 | `error`를 비운다. `job.wordpress` 기록은 그대로 둔다 |

엔드포인트는 `PUT /api/jobs/:id/status` `{status}` 하나다.

## 화면
- 크롬 블로그에 임시저장한 글: "발행 완료로 표시", "초안 완료로 되돌리기", "다시 임시저장".
- 워드프레스에 등록한 글(임시저장·예약됨): "발행 완료로 표시", "초안 완료로 되돌리기", "다시 등록 (<방식>)" → [[publishing/flows/워드프레스 API 등록 플로우]].
- 올릴 블로그를 아직 고르지 않은 임시저장·예약 글: "이미 <상태> 상태인 글입니다. 올릴 블로그를 위에서 선택하세요." + "발행 완료로 표시", "초안 완료로 되돌리기".
- 발행 완료 글: 워드프레스 기록이 있으면 "워드프레스에 발행했거나 발행 완료로 표시한 글입니다." + "글 열기" 링크, 없으면 "앱은 발행하지 않으며, 블로그에서 직접 발행한 것을 표시한 상태입니다." 버튼은 "발행 완료 취소"(→ 임시저장 완료), "초안 완료로 되돌리기". **다시 올리는 버튼은 없다** (먼저 취소).
- "초안 완료로 되돌리기"는 확인 창을 거친다: "블로그에 이미 저장·발행된 글은 그대로 남습니다."
- 진행 단계: 임시저장 완료·예약됨은 "임시저장" 단계까지 완료이고 "발행 완료"가 다음 할 일로 강조된다. 발행 완료는 모든 단계가 완료로 보인다.
- 목록 배지: "발행 완료"는 보라색(`--pub`), "예약됨"은 청록색(`--sch`), 임시저장 완료는 초록. 어두운 테마 색은 따로 있다.
- 목록 상태 필터: 전체·진행 중·초안 완료·임시저장 완료·예약됨·발행 완료·실패 → [[writing/flows/내 글 목록 상태 필터 플로우]].

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 공용 | `JobStatus`에 `scheduled`·`published`, 상태 이름 `STATUS_LABEL` | `blog-writer:shared/types.ts:218-229`, `blog-writer:shared/labels.ts:4-14` |
| 서버 | `MANUAL_TRANSITIONS`, `MANUAL_LOG`, `PUT /api/jobs/:id/status` | `blog-writer:server/routes/jobs.ts:145-177` |
| 화면 | `api.setStatus`, `NextStep`, `WordPressNext`, `confirmRevert`, `Progress` | `blog-writer:src/api.ts:94-96`, `blog-writer:src/job/NextStep.tsx:6-153`, `:254-263`, `blog-writer:src/job/Progress.tsx:5-44` |
| 화면(목록) | 필터 칩 | `blog-writer:src/App.tsx:24-36` |
| 스타일 | `--pub`, `--sch`, `.badge.published`, `.badge.scheduled` | `blog-writer:src/styles.css:6-7`, `:17-18`, `:95-96` |

## 예외 / 경계값
- 발행 완료 글에서 이미지를 다시 만들면 이미지 단계가 `draft_ready`로 끝나 발행 완료 표시가 풀린다. 의도다 (2026-10-05 확정).
- 앱은 크롬 블로그의 실제 발행 여부를 확인하지 않는다. 표시는 전적으로 사용자 입력이다.
- 워드프레스에 자동발행해 `published`가 된 글도 "발행 완료 취소"로 `posted`가 될 수 있다. 이때 사이트의 글은 공개 상태 그대로다 ([[publishing/open-questions]] #8).
- 초안 완료로 되돌려도 블로그에 올라간 임시저장 글·발행 글은 그대로이며 앱이 지우지 않는다.
- `published`·`scheduled`는 `BUSY_STATUSES`가 아니다 (재시작 복구 대상 아님).

## 영향받는 플로우
[[publishing/flows/블로그 임시저장 플로우]], [[publishing/flows/워드프레스 API 등록 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 (발행 완료 상태·표시·취소 추가) | |
| 2026-10-05 | 수기로 초안 완료로 되돌리기 추가, 엔드포인트를 `PUT /status`로 일반화, 발행 완료 배지를 보라색으로, 이미지 재생성 시 초안 완료 복귀를 의도로 확정 | |
| 2026-10-07 | `scheduled`(예약됨) 상태 추가: `scheduled → published/draft_ready` 수기 전이, 예약됨 배지·필터. 화면 문구에 워드프레스 경우 추가. 서버 코드는 `server/routes/jobs.ts`로 옮겨짐 | `blog-writer:server/routes/jobs.ts:147-151` |
