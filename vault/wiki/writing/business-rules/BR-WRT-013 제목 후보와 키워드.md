---
type: business-rule
domain: writing
id: BR-WRT-013
name: 제목 후보와 키워드
status: active
confidence: medium
consistency: single-source
source:
  - blog-writer:rules/default-writing-rules.md:14-17
  - blog-writer:server/research.ts:23
  - blog-writer:server/writer.ts:26
  - blog-writer:server/writer.ts:121-124
  - blog-writer:src/job/Report.tsx:14-27
entities: [Post]
updated: 2026-10-07
---
# BR-WRT-013 제목 후보와 키워드

## 규칙
글을 쓰기 전에 이 글이 답할 검색 질문 한 문장, 메인 키워드 1개, 서브 키워드 2~3개(롱테일 우선)를 정한다. 제목 후보는 3개를 내고, 메인 키워드를 앞쪽에, 25~35자 안팎으로, 검색 의도와 날짜·숫자를 넣는다. 제목은 후보 중 가장 좋은 것과 똑같이 쓴다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 리서치 | `searchQuestion`, `mainKeyword`, `subKeywords`를 정함 |
| 글 작성 | 리서치 방향을 받아 "더 나은 것이 있으면 바꿔도 됨". `titleCandidates` 3개, `title` = 그중 하나 |
| 화면 | 후보를 누르면 제목이 바뀜(자동 저장), 후보마다 글자수 표시 |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 규칙 문서 | SEO 장 | 메인1·서브2~3, 후보 3개, 25~35자 | `blog-writer:rules/default-writing-rules.md:14-17` |
| 프롬프트(리서치) | 검색 질문·키워드 정하기 | 서브 2~3 | `blog-writer:server/research.ts:23` |
| 프롬프트(작성) | 후보 3개, 제목=후보 중 하나 | | `blog-writer:server/writer.ts:26` |
| 서버 검증 | 없음 | 개수·길이·제목 일치 모두 검사 안 함 | `blog-writer:server/schema.ts:20`, `:26` |
| 화면 | 후보 선택 UI | | `blog-writer:src/job/Report.tsx:14-27` |

프롬프트에만 있어 `consistency: single-source`, 결과 보장이 없어 `confidence: medium`.

## 예외 / 경계값
- 메인·서브 키워드는 네이버 검색어 제안 수집의 입력이 된다 → [[writing/business-rules/BR-WRT-015 네이버 검색어 제안 수집 범위]].

## 영향받는 플로우
[[writing/flows/초안 작성 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
