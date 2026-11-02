---
type: domain-index
domain: topic
updated: 2026-11-02
---
# topic 목차

개요: [[topic/overview]] · 구현 지도: [[topic/implementations/blog-writer 구현]] · 열린 질문: [[topic/open-questions]]

## 엔티티
[[topic/entities/주제 추천]] · [[topic/entities/주제 후보]] · [[topic/entities/키워드 행]]

## 규칙
| 번호 | 이름 | 한 줄 |
|---|---|---|
| BR-TOP-001 | [[topic/business-rules/BR-TOP-001 근거 있는 후보만]] | 후보 10~12개, 근거 필수, 열람 3개 이하 |
| BR-TOP-002 | [[topic/business-rules/BR-TOP-002 이미 쓴 글과 겹치지 않기]] | 최근 글 50개와 같은 의도 제외 |
| BR-TOP-003 | [[topic/business-rules/BR-TOP-003 자동완성 수요 신호]] | 첫 키워드의 자동완성 개수 |
| BR-TOP-004 | [[topic/business-rules/BR-TOP-004 데이터랩 관심도와 순위]] | 기준 키워드=100으로 환산, 데이터랩 없으면 순위 없음 |
| BR-TOP-005 | [[topic/business-rules/BR-TOP-005 추천은 한 번에 하나]] | 동시 실행 금지, 중지·복구 |
| BR-TOP-006 | [[topic/business-rules/BR-TOP-006 키워드 탐색]] | 월간 검색량, 최대 5개, 입력 없으면 자동 기준 |
| BR-TOP-007 | [[topic/business-rules/BR-TOP-007 지금 뜨는 검색어]] | 구글 트렌드 RSS, 10분 캐시 |

## 플로우
[[topic/flows/주제 추천]] · [[topic/flows/키워드 탐색]]
