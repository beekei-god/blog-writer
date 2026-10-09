---
type: entity
domain: writing
name: Post
aliases: [초안, 글, 본문]
status: active
confidence: high
source:
  - blog-writer:shared/types.ts:189-228
  - blog-writer:server/schema.ts:23-45
  - blog-writer:server/schema.ts:88-164
  - blog-writer:server/writer.ts:149-175
updated: 2026-10-09
---
# Post (초안)

## 의미
블로그에 들어갈 글 한 편과, 본문에는 들어가지 않는 "작성 리포트"(검색 질문, 키워드, 제목 후보, 태그 근거, 뺀 항목). Claude가 JSON 스키마로 쓰고 서버가 다듬은 뒤, 사용자가 편집한다.

## 속성
| 속성 | 타입 | 의미 | 화면 표시 |
|---|---|---|---|
| `title` | string(1자 이상) | 제목. `titleCandidates` 중 하나와 같게 쓰도록 지시 | 제목 |
| `summary` | string | 핵심 요약 (썸네일 기본 장면에도 씀) | |
| `tags` | string[] ≤30 | 블로그에 넣을 태그('#' 없이). 서버가 `tagDetails`에서 만든다 | 태그 입력/미리보기 |
| `searchQuestion` | string? | 이 글이 답할 검색 질문 | 작성 리포트 |
| `mainKeyword`, `subKeywords` | string, string[]? | 메인 1개·서브 2~3개 | 작성 리포트 |
| `titleCandidates` | string[]? | 제목 후보 3개 | 눌러서 제목으로 |
| `tagDetails` | {tag, source, query}[]? | 태그마다 출처(메인·서브 키워드/자동완성/함께 많이 찾는/본문 고유명사. 스마트블록 주제는 서버가 제외)와 확인 검색어 | "태그를 고른 근거" 표 |
| `tagsCheckedAt` | string? | 태그 확인 날짜 YYYY.MM.DD (한국 시간) | |
| `omittedItems` | string[]? | 자료를 못 찾았거나 분량 때문에 본문에서 뺀 항목 | "본문에서 뺀 항목" |
| `thumbnail` | ImageSpec? | 썸네일 → [[image/entities/ImageSpec]] | 맨 위 이미지 |
| `blocks` | PostBlock[] | 본문 블록: `heading`, `paragraph`(텍스트 안에서 문장마다 `\n`으로 줄을 나눔 → 블로그에는 `<br>`로 들어감, 문단은 2~4줄·짧으면 한 줄), `list{items}`, `quote`, `table{headers,rows}`, `image(ImageSpec)` | 본문 |

텍스트 안의 굵게는 `**…**`만 쓴다. 그 밖의 마크다운은 쓰지 않고, 링크는 "기관 이름: https://…" 일반 텍스트다 (`blog-writer:server/writer.ts:23-24`). 표시·입력할 때 `**`는 `<strong>`, 주소는 `<a>`로 바뀐다 (`blog-writer:shared/postHtml.ts:24-31`).

## 상태와 전이
상태 필드는 없다. 생성(writePost) → 사용자 편집(자동 저장) → 이미지 결과 기록 → 블로그 입력에 쓰임. 리서치부터 다시 하면 통째로 바뀐다.

## 저장 위치
`Job.post` → [[_system/data-storage]]

## 적용되는 규칙
[[writing/business-rules/BR-WRT-001 본문 분량 상한]], [[writing/business-rules/BR-WRT-002 본문 글자수 계산]], [[writing/business-rules/BR-WRT-004 태그 최대 30개]], [[writing/business-rules/BR-WRT-005 태그 출처 검증]], [[writing/business-rules/BR-WRT-006 스마트블록 주제 태그 금지]], [[writing/business-rules/BR-WRT-007 빈 칸 있는 표 행 제거]], [[writing/business-rules/BR-WRT-008 날짜 표시줄 제거]], [[writing/business-rules/BR-WRT-013 제목 후보와 키워드]]
