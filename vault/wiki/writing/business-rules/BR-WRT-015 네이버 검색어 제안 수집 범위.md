---
type: business-rule
domain: writing
id: BR-WRT-015
name: 네이버 검색어 제안 수집 범위
status: active
confidence: high
consistency: single-source
source:
  - blog-writer:server/naver.ts:25-37
  - blog-writer:server/naver.ts:80-89
  - blog-writer:server/pipeline.ts:100-110
  - blog-writer:server/writer.ts:127-131
entities: [Post]
updated: 2026-10-07
---
# BR-WRT-015 네이버 검색어 제안 수집 범위

## 규칙
태그 후보를 위해 리서치가 정한 메인·서브 키워드로 네이버 자동완성과 "함께 많이 찾는"을 수집한다. 롱테일 키워드는 자동완성이 거의 없으므로 뒤 단어를 하나씩 뗀 짧은 형태(2단어까지)도 함께 조회한다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 자동완성 검색어 | 키워드마다 전체 → 뒤 단어 하나씩 뗀 형태 … 앞 2단어까지(1단어 키워드는 그대로). 중복 제거 후 **최대 20개**, 동시에 호출 |
| 함께 많이 찾는 검색어 | 키워드 원형만, 중복 제거 후 **최대 6개**, 하나씩 0.5초 간격 |
| 결과가 없는 검색어 | 목록에서 뺌 |
| 수집 결과를 글 작성에 | "네이버 자동완성 (날짜 수집)", "네이버 함께 많이 찾는" 목록으로 전달. 함께 많이 찾는이 비면 "이 출처의 태그는 만들지 마세요" |
| 로그 | "자동완성 N개, 함께 많이 찾는 M개 수집" (+0개면 "영역이 없거나 꺼져 있음") |

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 서버 | `expandQueries`, `collectAutocomplete`, `collectNaverSuggestions` | `blog-writer:server/naver.ts:25-37`, `:80-89` |
| 서버(파이프라인) | 키워드 = [main, ...sub] | `blog-writer:server/pipeline.ts:101-103` |
| 프롬프트(작성) | 수집 목록 전달 | `blog-writer:server/writer.ts:127-131` |

## 예외 / 경계값
- 수집 실패는 모두 빈 결과로 처리하고 작업은 계속한다 → [[_system/integrations/naver-search]].
- 스마트블록 주제는 수집하지 않는다 → [[writing/business-rules/BR-WRT-006 스마트블록 주제 태그 금지]].

## 영향받는 플로우
[[writing/flows/초안 작성 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
