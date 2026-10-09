---
type: business-rule
domain: topic
id: BR-TOP-007
name: 키워드 검색량 표기와 집계
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/searchad.ts:15-17
  - blog-writer:server/searchad.ts:32-39
  - blog-writer:server/searchad.ts:43-77
  - blog-writer:server/searchad.ts:109-128
  - blog-writer:shared/types.ts:282-296
  - blog-writer:src/Keywords.tsx:9-10
  - blog-writer:src/Keywords.tsx:55-65
  - blog-writer:tests/searchad.test.ts:21-54
entities: [KeywordRow]
updated: 2026-10-09
---
# BR-TOP-007 키워드 검색량 표기와 집계

## 규칙
키워드 탐색의 검색량은 네이버 검색광고 키워드 도구가 주는 **최근 한 달 월간 검색량**(PC·모바일)이다. 10 미만은 API가 숫자 대신 `"< 10"`으로 주므로 **5로 계산하고 `low`로 표시**한다. 한 번에 보내는 키워드(`hintKeywords`)는 최대 5개이고, 입력이 그보다 많으면 5개씩 나눠 부른 뒤 합친다. 결과는 검색량 큰 순으로 정렬해 **최대 200행**만 돌려준다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 검색량이 숫자 | 반올림·0 이상으로 그대로 |
| 검색량 문자열에 `<` 또는 "미만" | 5, `lowPc`/`lowMobile` = true. 합계(`total`)는 5를 더해 계산. 화면 표에는 "<10"으로 표시(합계 칸은 숫자) |
| 쉼표 섞인 문자열("1,234") | 숫자만 뽑아 1234 |
| 숫자·문자열이 아니거나 숫자 없음 | 0 |
| 경쟁 정도가 낮음·중간·높음이 아님 | "알 수 없음" |
| 정렬(서버) | `total` 큰 순, 같으면 키워드 가나다순 |
| 200행 초과 | 검색량 큰 순 상위 200개만 (한 덩어리마다, 합친 뒤에 자름) |
| 입력 구분 | 쉼표·줄바꿈·가운뎃점(`·` `ㆍ`)·`/`·`|`로 나누고, 공백 제거, 중복 제거 |
| 사용자가 입력한 키워드가 5개 초과 | 앞 5개만 쓴다(`parseHints`). 나머지는 조용히 버려짐 |
| 입력 없이 만든 기준 키워드가 5개 초과 | 자르지 않고(`splitHints`) 5개씩 나눠 여러 번 호출 |
| 나눠 부른 응답에 같은 키워드가 여러 번 | 검색량 합계가 큰 쪽 한 줄만 (공백 뺀 키워드 기준) |
| 입력한 키워드 자신 | `seed: true` (공백 뺀 값이 같으면). 화면에 "입력"/"기준" 배지 |
| 구글 트렌드에 있는 키워드 | `trend`에 대략의 규모("200+")를 붙임 |
| 화면 정렬·필터 | 키워드·월간·PC·모바일 정렬 토글, 최소 월간 검색량(0/100/500/1000/5000/10000), 경쟁 정도, 키워드 포함. 서버가 준 줄(최대 200)에서만 거른다 |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 서버 | `parseCount`, `toRows`(합계·정렬·`MAX_ROWS`), `splitHints`/`parseHints`, `lookupKeywords`(5개씩 나눠 호출·병합) | `MAX_HINTS=5`, `MAX_ROWS=200`, 낮은 값 5 | `blog-writer:server/searchad.ts:15-17`, `:33-39`, `:44-64`, `:67-77`, `:113-128` |
| 공용 | `KeywordRow` 타입(`total`·`pc`·`mobile`·`lowPc`·`lowMobile`·`competition`·`seed`·`trend`) | | `blog-writer:shared/types.ts:283-296` |
| 화면 | `countText`("<10" 표시), 정렬·필터 `useMemo`, 안내 문구("10 미만은 <10이고 합계에는 5로 계산", "최대 200개") | | `blog-writer:src/Keywords.tsx:10`, `:55-65`, `:162`, `:216-219` |
| 서버 API | 입력 200자 초과는 400 | 쉼표로 최대 5개 | `blog-writer:server/routes/keywords.ts:15-16` |
| 테스트 | 검색량 값 파싱, 입력 분리·최대 5개, 정렬·seed·경쟁, 200행 | | `blog-writer:tests/searchad.test.ts:21-54` |
| 프롬프트 | 없음 | | |

## 예외 / 경계값
- "< 10"의 실제 값은 0~9인데 5로 근사해 합계·정렬에 쓴다. 합계는 과대·과소일 수 있다(`lowPc`/`lowMobile`로만 구분).
- 화면 필터가 걸린 상태에서도 "N개 중 M개 표시"로 서버가 준 전체 수를 함께 보여 준다.
- 검색량은 네이버 기준 절대 값이며, 구글 트렌드 `trend`는 별개 지표다. 경쟁 정도는 광고 입찰 경쟁이라 글 경쟁과 다르다(화면 안내).
- 5개 초과 입력을 버리는 것은 화면에 따로 알리지 않는다. 안내 문구는 "쉼표로 최대 5개"뿐이다.
- 응답 필드 이름(`relKeyword`, `monthlyPcQcCnt`, `monthlyMobileQcCnt`, `compIdx`, `keywordList`)은 공식 문서를 근거로 한 가정이며 실제 API로는 아직 확인하지 못했다 → [[topic/open-questions]] #5

## 영향받는 플로우
[[topic/flows/키워드 탐색 플로우]]

## 확인 필요
- [[topic/open-questions]] #5

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-09 | 최초 기록 (커밋 4ffb5eb: 키워드 탐색 추가) | `blog-writer:server/searchad.ts:1-129` |
