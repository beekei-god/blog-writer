---
type: business-rule
domain: topic
id: BR-TOP-001
name: 추천 후보 조건
status: active
confidence: medium
consistency: consistent
source:
  - blog-writer:server/recommend.ts:69-83
  - blog-writer:server/recommend.ts:169-198
entities: [TopicCandidate, Recommendation]
updated: 2026-10-07
---
# BR-TOP-001 추천 후보 조건

## 규칙
주제 후보는 그 분야에서 **지금** 사람들이 네이버에서 많이 검색할 블로그 주제여야 한다. 최근 2주 안의 뉴스와 최근 발표된 공식 통계·공고에서 찾고, 일정이 다가오는 것(마감·접수 시작·시행일·발표일), 새로 바뀐 제도, 큰 숫자 변화를 우선한다. 근거 없는 후보는 만들지 않고, 이미 쓴 글과 같은 의도의 주제는 뺀다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 후보 수 | 10~12개, 검색 의도가 서로 겹치지 않게 |
| 검색어 | 오늘 기준 연월을 넣어 검색 |
| WebFetch | 검색 결과로 날짜·숫자를 확인할 수 없을 때만, 전체 3번 이하 |
| 이미 쓴 글 | 작업 목록에서 제목(없으면 주제) 최근 50개를 "같은 의도는 제외" 목록으로 전달 |
| 서버 후처리 | 검색어 앞뒤 공백 제거·중복 제거·최대 3개, 근거는 http(s) URL만 |
| 근거 날짜 | 확인 못 했으면 비움 |

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 프롬프트(추천) | 위 지시 | `blog-writer:server/recommend.ts:69-83` |
| 서버 | 이미 쓴 글 50개, 검색어·근거 정리, Claude 호출(effort high, 20분, WebSearch/WebFetch) | `blog-writer:server/recommend.ts:171-193` |
| 스키마 | anchorKeyword 1자 이상, 후보 topic 1자 이상, keywords 1개 이상 | `blog-writer:server/recommend.ts:121-138` |

10~12개, 2주, 3번 제한은 프롬프트 지시라 `confidence: medium`.

## 영향받는 플로우
[[topic/flows/주제 추천 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-07 | 줄 번호 보정 (리팩터링, 규칙 변화 없음) | |
