---
type: entity
domain: topic
name: TopicCandidate
aliases: [주제 후보, 추천 주제]
status: active
confidence: high
source:
  - blog-writer:shared/types.ts:279-307
  - blog-writer:server/recommend.ts:189-204
  - blog-writer:src/Recommend.tsx:20-61
updated: 2026-10-07
---
# TopicCandidate (주제 후보)

## 의미
블로그 글 하나로 답할 수 있는 구체적인 주제 하나와 "지금 써야 하는 이유", 근거 자료, 검색 수요 지표.

## 속성
| 속성 | 타입 | 의미 | 화면 표시 |
|---|---|---|---|
| `topic` | string | 구체적 주제 (예: "2026년 11월 서울 무순위 청약 일정과 자격") | 카드 제목 |
| `keywords` | string[] 1~3 | 네이버에 실제로 칠 만한 2~4단어 검색어 (데이터랩 비교용) | "검색어" |
| `reason` | string | 왜 지금인지 2~3문장 (근거의 날짜·숫자) | 본문 |
| `evidence` | {title,url,date?,kind: news/stat/official}[] | 실제로 검색·열람한 근거, http(s)만 | 근거 목록 (뉴스/통계/공식 배지) |
| `autocompleteCount` | number? | 첫 검색어의 네이버 자동완성 개수 | "자동완성 N개" |
| `interest` | {level, momentum, series}? | 데이터랩 관심도 → [[topic/business-rules/BR-TOP-002 검색 관심도 환산]], [[topic/business-rules/BR-TOP-003 상승세 계산]] | "관심도 N ▲M%" + 스파크라인 |

## 상태와 전이
없음. "이 주제로 글쓰기"를 누르면 새 글 폼에 주제와 근거 URL들(링크 칸)이 채워진다. 근거 전부를 채우는 것이 의도이며(2026-10-05 확정), 리서치는 사용자 링크를 모두 열어 비용이 커질 수 있으니 필요 없는 링크는 새 글 화면에서 지운다 (`blog-writer:src/Recommend.tsx:173`, `blog-writer:src/App.tsx:194-200`).

## 저장 위치
`Recommendation.candidates`

## 적용되는 규칙
[[topic/business-rules/BR-TOP-001 추천 후보 조건]], [[topic/business-rules/BR-TOP-002 검색 관심도 환산]], [[topic/business-rules/BR-TOP-003 상승세 계산]], [[topic/business-rules/BR-TOP-004 추천 순위]]
