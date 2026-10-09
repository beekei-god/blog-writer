---
type: business-rule
domain: usage
id: BR-USG-005
name: 한도 경고 단계
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:src/Usage.tsx:184-198
  - blog-writer:src/App.tsx:253-261
entities: [PlanLimits]
updated: 2026-10-07
---
# BR-USG-005 한도 경고 단계

## 규칙
플랜 한도 사용률이 **80% 이상이면 "많이 씀"(경고), 95% 이상이면 "거의 다 씀"(위험)**으로 표시한다.

## 조건과 결과
| 사용률 (반올림 %) | 사용량 화면 미터 | 상단 칩 |
|---|---|---|
| < 80 | normal | 기본색 |
| 80~94 | warning, "⚠ 많이 씀" | warning |
| ≥ 95 | critical, "⚠ 거의 다 씀" | critical |
| 값 없음 | "정보 없음" | 그 창은 표시 안 함 |

초기화 시각은 "오늘 HH:MM 초기화" 또는 "M월 D일 (요일) HH:MM 초기화" (`blog-writer:src/labels.ts:81-87`).

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 화면 | `Meter`, `PlanPct` | `blog-writer:src/Usage.tsx:184-198`, `blog-writer:src/App.tsx:253-261` |
| 서버 | 없음 (값만 저장) | |

## 예외 / 경계값
- 한도 근처라고 작업을 막지는 않는다. 한도에 걸리면 Claude 호출이 실패하고 이미지라면 `limit`으로 분류된다 → [[image/business-rules/BR-IMG-007 이미지 실패 격리와 원인 분류]].

## 영향받는 플로우
[[usage/flows/사용량 확인 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-07 | 줄 번호·경로 보정 (리팩터링: API는 `server/routes/`로, 저장은 `server/fsutil.ts` 공용 도우미로). 규칙 변화 없음 | |
