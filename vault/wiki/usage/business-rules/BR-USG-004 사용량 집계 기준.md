---
type: business-rule
domain: usage
id: BR-USG-004
name: 사용량 집계 기준
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/usage.ts:93-162
  - blog-writer:server/usage.ts:81-90
  - blog-writer:src/labels.ts:70
  - blog-writer:src/Usage.tsx:84-92
entities: [UsageRecord]
updated: 2026-10-09
---
# BR-USG-004 사용량 집계 기준

## 규칙
날짜는 **한국 시간** 기준이고, 이번 주는 **월요일**부터다. "토큰"은 입력+출력+캐시 읽기+캐시 쓰기를 모두 더한 값이다.

## 조건과 결과
| 집계 | 범위 |
|---|---|
| 오늘 | KST 날짜가 오늘인 기록 |
| 이번 주 | KST 날짜 ≥ 이번 주 월요일 |
| 최근 7일 | 오늘 포함 KST 7일, 날짜별 |
| 모델별·단계별 | 이번 주 기록만, 총 토큰 많은 순 |
| 단계별 마지막 모델 | 전체 기록에서 단계마다 마지막 줄의 모델 |
| 작업별 | 그 jobId 기록 전체, 모델별 |
| 호출 수(`calls`) | 묶음마다 `callId`가 다른 호출만 셈. 한 호출의 여러 모델 줄은 1회 (2026-10-05 변경, `callId`가 없는 예전 기록은 줄마다 1회) |

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 서버 | `kstDate`(한국 날짜, 2026-10-09부터 `server/rules.ts` 공용), `kstWeekStart`, `getUsageSummary`, `getJobUsage` | `blog-writer:server/usage.ts:93-162`, `:81-90`, `blog-writer:server/rules.ts:40` |
| 화면 | `totalTokens` 합산, 표·막대 | `blog-writer:src/labels.ts:70`, `blog-writer:src/Usage.tsx` |

## 예외 / 경계값
- 화면 일별 막대의 요일 라벨은 서버가 준 KST 날짜 문자열에서 UTC 기준으로 요일을 계산해, 브라우저 시간대와 무관하게 집계 날짜와 같다 (2026-10-05 수정).

## 영향받는 플로우
[[usage/flows/사용량 확인 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-05 | 호출 수를 `callId` 기준으로 집계 | `blog-writer:server/usage.ts:98-112`, `blog-writer:server/claude.ts:168-171` |
| 2026-10-05 | 요일 라벨을 시간대와 무관하게 계산 | `blog-writer:src/Usage.tsx:216-221` |
| 2026-10-07 | 줄 번호·경로 보정 (리팩터링: API는 `server/routes/`로, 저장은 `server/fsutil.ts` 공용 도우미로). 규칙 변화 없음 | |
