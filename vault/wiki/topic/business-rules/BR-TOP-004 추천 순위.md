---
type: business-rule
domain: topic
id: BR-TOP-004
name: 추천 순위
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/recommend.ts:200-245
  - blog-writer:src/Recommend.tsx:142-144
  - blog-writer:src/Recommend.tsx:182-205
entities: [Recommendation, TopicCandidate]
updated: 2026-10-07
---
# BR-TOP-004 추천 순위

## 규칙
데이터랩 결과가 있을 때만 후보에 순위를 매긴다: **관심도(level) 높은 순, 같으면 상승세(momentum) 높은 순**. 데이터랩이 없거나 실패하면 검색량 근거가 없으므로 순위를 매기지 않고 Claude가 찾은 순서대로 보여 준다. 자동완성 개수는 검색어 표현에 따라 0이 되기도 해서 순위 근거로 쓰지 않는다.

## 조건과 결과
| datalab | 정렬 | 화면 안내 |
|---|---|---|
| ok | level 내림차순 → momentum 내림차순. 관심도가 비어 있는 후보(기준 키워드 평균 0인 묶음)는 맨 뒤, 로그 "기준 키워드 검색량이 0이라 관심도를 비교하지 못한 후보 N개" (2026-10-05 추가) | "데이터랩 기간, 기준 키워드" |
| not_configured (키 없음) | 찾은 순서 | "데이터랩 미사용: 검색량 근거가 없어 순위 없이…", 상단 경고 |
| failed | 찾은 순서 | 같은 안내, 로그에 실패 원인 |
| (공통) | 자동완성 개수는 표시만 | "자동완성 N개" |

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 서버 | 정렬 조건 | `blog-writer:server/recommend.ts:229-236` |
| 화면 | 순번·안내 | `blog-writer:src/Recommend.tsx:182-205`, `:115-117` |

## 영향받는 플로우
[[topic/flows/주제 추천 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-05 | 관심도 없는 후보를 정렬 맨 뒤로 | `blog-writer:server/recommend.ts:219-220`, `:232-235` |
| 2026-10-07 | 줄 번호 보정 (리팩터링, 규칙 변화 없음) | |
