---
type: business-rule
domain: topic
id: BR-TOP-007
name: 지금 뜨는 검색어
status: active
confidence: high
consistency: single-source
source:
  - blog-writer:server/trends.ts:1-61
entities: [키워드 행]
updated: 2026-11-02
---
# BR-TOP-007 지금 뜨는 검색어

## 규칙
네이버에는 공개된 인기 검색어가 없으므로(실시간 검색어 서비스 종료) **구글 트렌드의 한국 일일 급상승 검색어**(공개 RSS, 키 불필요)로 대신한다. 가져온 목록은 10분 동안 다시 쓴다. 한국 블로그 분야와 맞지 않는 검색어(스포츠 경기 등)도 섞인다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 10분 안 재호출 | 캐시 |
| HTTP 오류/연결 실패 | `TrendsError` |
| 검색어를 못 읽음 | `TrendsError`("형식이 바뀌었을 수 있습니다") |
| 항목 | 첫 `<title>`과 `<ht:approx_traffic>` ("200+" 등), 같은 검색어는 한 번만 |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 서버 | `fetchTrending`, `parseTrending`, `clearTrendingCache` | 주소 `https://trends.google.com/trending/rss?geo=KR` (시험용 `TRENDS_URL`) | `blog-writer:server/trends.ts` |
| 테스트 | 탐색 테스트에서 가짜 주소 사용 | | `blog-writer:tests/explore.test.ts` |

## 예외 / 경계값 · 변경 시 같이 볼 곳
- RSS 형식이 바뀌면 `parseTrending` 정규식을 고친다 → [[_system/integrations/google-trends]]

## 영향받는 플로우
[[topic/flows/키워드 탐색]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-11-02 | wiki 재생성 때 코드(73f47a6) 기준으로 작성 | 코드 |
