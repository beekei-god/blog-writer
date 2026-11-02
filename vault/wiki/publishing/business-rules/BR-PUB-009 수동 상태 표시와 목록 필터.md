---
type: business-rule
domain: publishing
id: BR-PUB-009
name: 수동 상태 표시와 목록 필터
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/routes/jobs.ts:PUT /api/jobs/:id/blogs/:platform/status
  - blog-writer:shared/blogStatus.ts:matchesFilter
entities: [블로그별 상태]
updated: 2026-11-02
---
# BR-PUB-009 수동 상태 표시와 목록 필터

## 규칙
초안이 있는 글은 블로그마다 상태를 **직접 바꿔 표시**할 수 있다. 앱이 블로그에 올리거나 발행하지는 않고 표시만 바꾼다. 고를 수 있는 값은 초안검토(none)·임시저장·발행예약·발행완료이고 다른 블로그의 상태는 그대로다. "내 글" 목록은 블로그 필터(전체/블로그 하나)와 상태 필터(전체·자료 조사 중·초안검토·임시저장·발행완료)로 거른다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 초안 없음 | 400 |
| 진행 중 | 409 |
| 이미 같은 상태 | 400 "이미 … 상태입니다" |
| none으로 표시 | 그 블로그 기록 삭제 |
| 워드프레스를 발행예약으로 표시 | 앱이 예약한 기록이 있으면 그 예약 시각, 없으면 null |
| 필터: 자료 조사 중 | 초안 전(researching/writing/generating_images), 블로그와 무관 |
| 필터: 초안검토 | 초안 있음 + (draft_ready 또는 posting) + 고른 블로그(전체면 모두)에 아직 안 올림 |
| 필터: 임시저장 | 올리는 중이거나 임시저장 |
| 필터: 발행완료 | 발행예약이거나 발행완료 |
| 실패한 글 | "전체"에서만 보임 |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 서버 | 상태 변경 라우트 | `MANUAL_STATUSES` | `blog-writer:server/routes/jobs.ts` |
| 공용 | `matchesFilter`, `StatusFilter`, `BlogFilter` | 필터 | `blog-writer:shared/blogStatus.ts` |
| 화면 | 상태 버튼, 목록 필터 | | [[_system/modules/web-screens]] |
| 테스트 | 필터·상태 | | `blog-writer:tests/shared.test.ts` |

## 예외 / 경계값 · 변경 시 같이 볼 곳
- 필터 이름을 바꾸면 화면 문구(`labels.ts`)와 `POSITIONS` 매핑을 함께 고친다.

## 영향받는 플로우
[[publishing/flows/블로그에 올리기]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-11-02 | wiki 재생성 때 코드(73f47a6) 기준으로 작성 | 코드 |
