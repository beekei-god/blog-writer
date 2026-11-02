---
type: implementation
domain: topic
project: blog-writer
paths: [server/recommend.ts, server/datalab.ts, server/searchad.ts, server/explore.ts, server/trends.ts, server/naver.ts, server/routes/recommendations.ts, server/routes/keywords.ts]
last_ingested_commit: 73f47a6
updated: 2026-11-02
---
# blog-writer의 topic 구현

## 파일과 역할
| 파일 | 함수/컴포넌트 | 구현하는 규칙/엔티티 |
|---|---|---|
| `server/recommend.ts` | `startRecommendation`, `run`, `listRecommendations`, `recoverRecommendations` | BR-TOP-001/002/003/005, [[topic/entities/주제 추천]] |
| `server/datalab.ts` | `compareInterest`, `interestStat`, `testDatalab` | [[topic/business-rules/BR-TOP-004 데이터랩 관심도와 순위]] |
| `server/searchad.ts` | `lookupKeywords`, `toRows`, `sign`, `splitHints` | [[topic/business-rules/BR-TOP-006 키워드 탐색]] |
| `server/explore.ts` | `exploreKeywords` | BR-TOP-006 |
| `server/trends.ts` | `fetchTrending`, `parseTrending` | [[topic/business-rules/BR-TOP-007 지금 뜨는 검색어]] |
| `server/naver.ts` | `naverAutocomplete` | BR-TOP-003 |
| `server/routes/recommendations.ts`, `server/routes/keywords.ts` | API | 위 플로우 |

## 테스트
| 테스트 파일 | 확인하는 것 | 규칙 |
|---|---|---|
| `tests/searchad.test.ts` | 서명·검색량 파싱·묶음 처리 | BR-TOP-006 |
| `tests/explore.test.ts` | 입력 유무에 따른 탐색, 트렌드 | BR-TOP-006/007 |
| `tests/datalab.test.ts` | 데이터랩 환산 | BR-TOP-004 |
| `tests/recommend.test.ts` | 근거 없는 후보 제거, 한 번에 하나, 재시작 복구 | BR-TOP-001/005 |
