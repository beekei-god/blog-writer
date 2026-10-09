---
type: module
project: blog-writer
module: server-recommend
paths: [server/recommend.ts, server/datalab.ts, server/searchad.ts, server/explore.ts, server/trends.ts]
source:
  - blog-writer:server/recommend.ts:1-255
  - blog-writer:server/datalab.ts:1-116
  - blog-writer:server/searchad.ts:1-129
  - blog-writer:server/explore.ts:1-74
  - blog-writer:server/trends.ts:1-61
updated: 2026-10-09
---
# server-recommend 모듈

## 책임
분야를 받아 최근 뉴스·통계 기반 블로그 주제 후보를 만들고, 네이버 자동완성 개수와 데이터랩 검색 관심도로 보강·정렬한다. 2026-10-09부터 **키워드 탐색**(네이버 검색광고 키워드 도구의 월간 검색량, 입력이 없으면 구글 트렌드와 최근 주제 추천 기준)도 이 모듈이 맡는다. 키워드 탐색은 주제 추천의 후보를 만들지 않고 추천 기록(`listRecommendations`)만 읽는다.

## 파일
| 파일 | 줄 | 역할 | 주요 export | 관련 페이지 |
|---|---|---|---|---|
| `server/recommend.ts` | 255 | 추천 저장(한 줄로 직렬화한 원자적 쓰기), 목록·삭제·재시작 복구, Claude 추천 프롬프트, 3단계 실행(후보→자동완성→데이터랩→정렬) | `startRecommendation`, `listRecommendations`, `deleteRecommendation`, `isRecommending`, `recoverRecommendations` | [[topic/flows/주제 추천 플로우]] |
| `server/searchad.ts` | 129 | (2026-10-09 새 파일) 네이버 검색광고 키워드 도구 호출: 요청 서명 `sign`(HMAC-SHA256), 검색량 값 해석 `parseCount`("< 10"은 5로 치고 low 표시), 응답을 화면 줄로 `toRows`(합계·검색량 순 정렬·입력 키워드 표시·상위 200개), 입력 나누기 `splitHints`·`parseHints`(최대 5개), 5개씩 나눠 조회·합치기 `lookupKeywords`, 키 확인 `testSearchAd`("날씨" 한 번 호출). 오류 `SearchAdError` | `MAX_HINTS`, `MAX_ROWS`, `SearchAdError`, `sign`, `parseCount`, `toRows`, `splitHints`, `parseHints`, `testSearchAd`, `lookupKeywords` | [[_system/integrations/naver-searchad]] |
| `server/explore.ts` | 74 | (2026-10-09 새 파일) 키워드 탐색 구성 `exploreKeywords(input)`: 키 없으면 null, 입력이 있으면 한 덩어리("입력한 키워드"), 없으면 ① 지금 뜨는 검색어(구글 트렌드 상위 `TRENDING_LIMIT`=10, 실패하면 그 덩어리만 `error`) ② 최근 주제 추천의 분야(완료된 최근 `RECOMMENDATION_LIMIT`=3개의 `anchorKeyword`||`field`, 최대 5개, 없으면 덩어리 없음). 기준이 하나도 없으면 안내와 함께 `SearchAdError` | `exploreKeywords`, `TRENDING_LIMIT`, `RECOMMENDATION_LIMIT` | [[_system/integrations/naver-searchad]], [[_system/integrations/google-trends]], [[topic/index]] |
| `server/trends.ts` | 61 | (2026-10-09 새 파일) 구글 트렌드 한국 일일 급상승 검색어(공개 RSS) 가져오기: 정규식으로 `<item>`의 검색어·`approx_traffic` 읽기 `parseTrending`, 10분 메모리 캐시 `fetchTrending`, 실패는 `TrendsError`, 시험용 캐시 비우기 | `TrendingTerm`, `TrendsError`, `parseTrending`, `fetchTrending`, `clearTrendingCache` | [[_system/integrations/google-trends]] |
| `server/datalab.ts` | 116 | NAVER API HUB 검색어 트렌드 호출, 키 확인, 기준 키워드 환산·상승세 계산(순수 함수 `interestStat`, 테스트 있음) | `compareInterest`, `interestStat`, `testDatalab`, `DatalabError` | [[_system/integrations/naver-datalab]], [[topic/business-rules/BR-TOP-002 검색 관심도 환산]] |

## 의존
- 사용하는 모듈: [[_system/modules/server-claude]], [[_system/modules/server-pipeline]] (`naverAutocomplete`), [[_system/modules/server-core]] (`listJobs`, `todayKST`, `getNaverKeys`, `getSearchAdKeys`, `DATA_DIR`), [[_system/modules/shared]] (`KeywordRow`, `KeywordSection`, `errorText`)
- 사용되는 곳: [[_system/modules/server-routes]] (`routes/recommendations.ts`, `routes/settings.ts`, `routes/keywords.ts`)
