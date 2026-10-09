---
type: entity
domain: topic
name: KeywordRow
aliases: [키워드 줄, KeywordSection, 키워드 덩어리]
status: active
confidence: high
source:
  - blog-writer:shared/types.ts:282-311
  - blog-writer:server/searchad.ts:44-64
  - blog-writer:server/explore.ts:21-74
  - blog-writer:src/Keywords.tsx:76-130
updated: 2026-10-09
---
# KeywordRow / KeywordSection (키워드 탐색 결과)

## 의미
`KeywordRow`는 키워드 하나와 월간 검색량(PC·모바일)·경쟁 정도. `KeywordSection`은 한 기준(입력한 키워드, 지금 뜨는 검색어, 최근 주제 추천 분야)으로 찾은 줄들의 묶음이다. 저장하지 않고 요청 때마다 만들어 화면에만 보인다.

## 속성
### KeywordRow
| 속성 | 타입 | 의미 | 화면 표시 |
|---|---|---|---|
| `keyword` | string | 연관 키워드 (API의 `relKeyword`) | 키워드 칸 |
| `total` | number | PC + 모바일 월간 검색량 | 월간 검색량(막대 + 숫자) |
| `pc`, `mobile` | number | 각각의 월간 검색량 ("< 10"이면 5) | PC / 모바일 (낮으면 "<10") |
| `lowPc`, `lowMobile` | boolean | "< 10"으로만 나온 쪽 | "<10" 표기 |
| `competition` | 낮음·중간·높음·알 수 없음 | 광고 입찰 경쟁 | 경쟁 칸 |
| `seed` | boolean | 입력(기준) 키워드 자신인지 | "입력"/"기준" 배지 |
| `trend` | string? | 구글 트렌드의 대략 규모("200+") | "급상승 200+" |

### KeywordSection
| 속성 | 타입 | 의미 |
|---|---|---|
| `id` | input·trending·recommendation | 어떤 기준의 덩어리인지 |
| `title`, `note` | string | 제목, 무엇을 기준으로 찾았는지 한 줄 |
| `seeds` | string[] | 실제 조회한 키워드(공백·중복 제거) |
| `rows` | KeywordRow[] | 검색량 큰 순 최대 200 |
| `error` | string? | 이 덩어리만 못 만든 이유 (구글 트렌드 실패) |

## 상태와 전이
없음 (조회 결과일 뿐). 줄에서 "이 키워드로 글쓰기"(새 글 주제로)나 "주제 추천받기"(분야로 추천 시작)로 이어진다 → [[topic/flows/키워드 탐색 플로우]].

## 저장 위치
저장하지 않는다 (화면 상태). 응답 형식은 `GET /api/keywords` → `{ sections }`.

## 적용되는 규칙
[[topic/business-rules/BR-TOP-007 키워드 검색량 표기와 집계]], [[topic/business-rules/BR-TOP-008 입력 없는 키워드 탐색의 기준과 오류 처리]]
