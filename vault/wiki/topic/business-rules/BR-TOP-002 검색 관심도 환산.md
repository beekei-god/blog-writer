---
type: business-rule
domain: topic
id: BR-TOP-002
name: 검색 관심도 환산
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/datalab.ts:4-28
  - blog-writer:server/datalab.ts:57-73
  - blog-writer:server/datalab.ts:84-116
  - blog-writer:shared/types.ts:284-291
  - blog-writer:src/Recommend.tsx:109-112
  - blog-writer:tests/writer.test.ts:70-83
entities: [TopicCandidate]
updated: 2026-10-07
---
# BR-TOP-002 검색 관심도 환산

## 규칙
후보의 검색 관심도는 **분야 대표 검색어(기준 키워드)의 최근 4주 평균을 100으로 놓은 상대값**이다. 데이터랩 값은 요청마다 "그 요청 안의 최댓값 = 100"이라 요청끼리 비교할 수 없으므로, 모든 요청에 같은 기준 키워드를 넣고 그 평균으로 환산한다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 기간 | 한국 시간 어제까지 28일 (데이터랩은 전날까지 집계), 일 단위 |
| 요청 묶음 | 기준 1 + 후보 4개씩 (그룹 최대 5) |
| 응답에 없는 날 | 0으로 채움 |
| 환산 배율 | 100 / 기준 평균. **기준 평균이 0이면** 환산·비교가 불가능하므로 그 묶음(4개)의 후보는 관심도(`interest`)를 비워 둠 (2026-10-05 변경, 예전엔 배율 1로 원값을 씀) |
| 일별 값 | 원값 × 배율, 소수 첫째 자리 반올림 |
| `level` | 28일 일별 값 평균, 소수 첫째 자리 |
| `series` | 28일 일별 값 (스파크라인) |

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 서버 | `dateRange`(기간), `compareInterest`(묶음 요청·0 채우기·기준 0 건너뜀), `interestStat`(환산·level·series 계산, 순수 함수) | `blog-writer:server/datalab.ts:20-28`, `:84-116`, `:59-73` |
| 공용 | `InterestStat` 주석 | `blog-writer:shared/types.ts:284-291` |
| 테스트 | 기준 평균 20 → 원값 10은 50, 20은 100으로 환산, level 62.5 | `blog-writer:tests/writer.test.ts:71-78` |
| 화면 | 설명 문구 "기준 키워드의 최근 4주 평균을 100으로 놓은 상대값" | `blog-writer:src/Recommend.tsx:111` |

## 예외 / 경계값
- 기준 키워드는 Claude가 정한 `anchorKeyword` (예: "청약").
- 후보 그룹에 검색어를 최대 20개까지 넣는다(실제로는 서버가 3개로 잘라 둠).

## 영향받는 플로우
[[topic/flows/주제 추천 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-05 | 기준 키워드 평균 0이면 그 묶음 후보의 관심도를 비움 | `blog-writer:server/datalab.ts:110-112` |
| 2026-10-07 | 환산 계산을 `interestStat`로 분리 (값 변화 없음), 자동 테스트 추가 | `blog-writer:server/datalab.ts:59-73` |
