---
type: business-rule
domain: writing
id: BR-WRT-003
name: 확인된 사실만 사용
status: active
confidence: medium
consistency: consistent
source:
  - blog-writer:rules/default-writing-rules.md:40-51
  - blog-writer:server/research.ts:8-22
  - blog-writer:server/writer.ts:20
  - blog-writer:server/writer.ts:24
  - blog-writer:server/research.ts:85-87
entities: [Post, Job]
updated: 2026-10-07
---
# BR-WRT-003 확인된 사실만 사용

## 규칙
글에 쓰는 모든 사실(날짜, 금액, 자격, 규모, 위치 등)은 이번 작업의 웹 검색·페이지 열람으로 확인한 자료에서만 가져온다. 찾지 못한 항목은 본문에서 아예 빼고(지어내거나 "확인하지 못했어요"라고 쓰지 않음) 작성 리포트의 "본문에서 뺀 항목"으로만 알린다. 링크는 리서치에서 실제로 나온 주소만 쓴다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 리서치에서 못 찾은 항목 | 노트 끝 "찾지 못한 항목" → 작성 시 `omittedItems` |
| 자료끼리 값이 다름 | 각각의 값과 출처를 적고 "공고문 확인 필요" |
| 개인 블로그 수치 | "(참고용)" 표시 |
| 출처 URL | http(s)만, URL 기준 중복 제거 |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 규칙 문서 | 5장 | 가장 중요한 규칙 | `blog-writer:rules/default-writing-rules.md:40-51` |
| 프롬프트(리서치) | 사실마다 [출처 URL], 못 찾으면 목록에 | | `blog-writer:server/research.ts:19-22` |
| 프롬프트(작성) | 노트에 출처와 함께 있는 것만, 출처 목록 URL만 | | `blog-writer:server/writer.ts:20`, `:24` |
| 서버 | 출처 정리만 (사실 검증은 없음) | http(s) 필터·중복 제거 | `blog-writer:server/research.ts:85-87` |
| 화면 | "본문에서 뺀 항목", 출처 목록, 리서치 노트 표시 | | `blog-writer:src/job/Report.tsx:44-55`, `blog-writer:src/job/JobDetail.tsx:323-345` |

본문 사실이 노트와 맞는지 코드로 검사하지는 않는다. 프롬프트 지시와 사용자 검토에 기대므로 `confidence: medium`.

## 예외 / 경계값
- 표에서 빈 칸·"미정" 행은 서버가 지운다 → [[writing/business-rules/BR-WRT-007 빈 칸 있는 표 행 제거]].
- 이미지 안 문구도 본문에 있는 사실로만 → [[image/business-rules/BR-IMG-005 이미지 안 문구 길이]].

## 영향받는 플로우
[[writing/flows/초안 작성 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
