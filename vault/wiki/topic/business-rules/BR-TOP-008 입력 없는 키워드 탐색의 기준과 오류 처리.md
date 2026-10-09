---
type: business-rule
domain: topic
id: BR-TOP-008
name: 입력 없는 키워드 탐색의 기준과 오류 처리
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/explore.ts:8-74
  - blog-writer:server/trends.ts:1-61
  - blog-writer:server/routes/keywords.ts:11-25
  - blog-writer:shared/types.ts:298-311
  - blog-writer:src/Keywords.tsx:201-215
  - blog-writer:tests/explore.test.ts:23-150
entities: [KeywordSection]
updated: 2026-10-09
---
# BR-TOP-008 입력 없는 키워드 탐색의 기준과 오류 처리

## 규칙
키워드를 입력하지 않으면 두 기준으로 각각 찾아 **덩어리(section) 두 개**로 보여 준다. ① **지금 뜨는 검색어**: 구글 트렌드(한국, 공개 RSS) 상위 10개 ② **최근 주제 추천의 분야**: 완료된 최근 추천 3개의 `anchorKeyword`(없으면 `field`)에서 뽑은 최대 5개. 구글 트렌드를 못 가져온 것은 그 덩어리만 오류로 보이고, 검색광고 키 오류·호출 한도는 전체 오류다. 두 기준이 모두 비면 400으로 거절한다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 검색광고 키 없음 | 입력 유무와 무관하게 400 "먼저 설정에서 네이버 검색광고 API 키를 연결하세요." (키 확인이 가장 먼저) |
| 입력 있음 | 그 키워드(최대 5개)만 조회한 `input` 덩어리 하나. 구글 트렌드는 부르지 않음 |
| 입력 없음 | `trending` 덩어리(상위 `TRENDING_LIMIT=10`개 → `splitHints`로 쪼개 중복 제거 → 5개씩 나눠 조회) + `recommendation` 덩어리 |
| 구글 트렌드 실패·빈 결과·형식 변경 | `trending` 덩어리만 `error` 문구, 나머지는 그대로 |
| 완료된(`done`) 주제 추천이 없음 | `recommendation` 덩어리를 만들지 않음 |
| 구글 트렌드 검색어도 없고 추천 기준도 없음 | 400 "입력한 키워드가 없고 탐색할 기준도 없습니다. 키워드를 입력하거나, 주제 추천을 한 번 해 보세요." (+ 트렌드 오류 문구) |
| 검색광고 401/403(키 오류)·429(한도)·그 밖의 오류 | 덩어리별이 아니라 요청 전체가 오류. 라우터는 `SearchAdError`면 400, 그 외 예외는 502 |
| 구글 트렌드 호출 | 10분 캐시, 10초 타임아웃. 항목마다 첫 `<title>`(검색어)과 대략 규모 `approx_traffic` |
| 구글 트렌드 검색어와 같은 키워드 | 결과 줄에 "급상승 규모"(`trend`) 표시 |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 서버 | `exploreKeywords`, `exploreWithoutInput` | 기준 10개·추천 3개·시드 5개 | `blog-writer:server/explore.ts:8-74` |
| 서버 | `fetchTrending`(캐시·오류), `parseTrending` | 구글 트렌드 geo=KR, 10분 | `blog-writer:server/trends.ts:6-56` |
| 서버 API | `GET /api/keywords?q=` (q 비어도 허용, 200자 초과 400) | 오류 상태 구분 | `blog-writer:server/routes/keywords.ts:11-25` |
| 공용 | `KeywordSection` (`id`: input/trending/recommendation, `note`, `seeds`, `rows`, `error`) | | `blog-writer:shared/types.ts:299-311` |
| 화면 | 덩어리마다 카드(제목·기준 안내·조회 키워드·표 또는 `sec.error`), 비워 두면 버튼 "지금 뜨는 키워드 찾기" | | `blog-writer:src/Keywords.tsx:160`, `:201-215` |
| 테스트 | RSS 파싱·캐시·TrendsError, 두 기준 조회, 트렌드 실패의 부분 오류, 추천 없음, 기준 없음 거절, 키 오류·429 전체 오류, 입력 시 트렌드 미호출 | | `blog-writer:tests/explore.test.ts:23-150` |
| 프롬프트 | 없음 | | |

## 예외 / 경계값
- 구글 트렌드는 한국 블로그 분야와 맞지 않는 검색어(스포츠 경기 등)도 섞인다 (코드 주석·화면 안내). 네이버에는 공개 인기 검색어가 없어 대체한 것이다.
- 구글 트렌드가 실패해도 주제 추천 기록이 있으면 요청은 성공(200)하고 `trending` 덩어리에만 오류가 붙는다. 반대로 둘 다 없을 때만 400이다.
- 주제 추천의 `anchorKeyword`는 [[topic/entities/Recommendation]]의 기준 키워드이고, 없으면 분야 문자열을 `·`·`/`·`,` 등으로 쪼갠다.
- 구글 트렌드 RSS 주소·형식은 비공식에 가까워 바뀔 수 있다. 실제 호출로는 아직 확인하지 못했다 → [[topic/open-questions]] #6

## 영향받는 플로우
[[topic/flows/키워드 탐색 플로우]]

## 확인 필요
- [[topic/open-questions]] #5, #6

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-09 | 최초 기록 (커밋 4ffb5eb) | `blog-writer:server/explore.ts:1-74` |
