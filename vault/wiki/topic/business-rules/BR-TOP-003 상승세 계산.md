---
type: business-rule
domain: topic
id: BR-TOP-003
name: 상승세 계산
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/datalab.ts:63-73
  - blog-writer:shared/types.ts:320-321
  - blog-writer:src/Recommend.tsx:37-39
  - blog-writer:tests/writer.test.ts:70-83
entities: [TopicCandidate]
updated: 2026-10-07
---
# BR-TOP-003 상승세 계산

## 규칙
상승세(momentum)는 **최근 7일 평균 ÷ 그 전 21일 평균 − 1**을 백분율 정수로 나타낸 값이다.

## 조건과 결과
| 조건 | momentum |
|---|---|
| 앞 21일 평균 > 0 | round((최근 7일 평균 / 앞 21일 평균 − 1) × 100) |
| 앞 21일 평균 = 0, 최근 7일 평균 > 0 | 100 |
| 둘 다 0 | 0 |
| 화면 | 0 이상이면 "▲ N%", 음수면 "▼ |N|%" |

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 서버 | `interestStat` (`compareInterest`가 후보마다 호출) | `blog-writer:server/datalab.ts:66-70` |
| 화면 | 화살표 표시 | `blog-writer:src/Recommend.tsx:37-39` |
| 테스트 | 앞 21일 10·최근 7일 20 → 100%, 앞 0·최근 >0 → 100%, 모두 0 → 0% | `blog-writer:tests/writer.test.ts:70-83` |

## 영향받는 플로우
[[topic/flows/주제 추천 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-07 | 계산을 `interestStat`로 분리 (값 변화 없음), 자동 테스트 추가 | |
