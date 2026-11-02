---
type: business-rule
domain: topic
id: BR-TOP-004
name: 데이터랩 관심도와 순위
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/datalab.ts:1-116
  - blog-writer:server/recommend.ts:run
entities: [주제 후보, 주제 추천]
updated: 2026-11-02
---
# BR-TOP-004 데이터랩 관심도와 순위

## 규칙
데이터랩(네이버 검색어 트렌드)의 값은 "요청에 넣은 그룹 중 최댓값=100"인 상대값이라 요청끼리 비교할 수 없다. 그래서 모든 요청에 **같은 기준 키워드(anchor)**를 넣고 기준 키워드의 평균을 100으로 환산한다. 후보의 관심도는 `level`(환산 일별 값의 평균)과 `momentum`(최근 7일이 그 전보다 몇 % 늘었는지)이다. 순위는 **level 큰 순 → momentum 큰 순**이고, 데이터랩이 성공했을 때만 매긴다. 데이터랩 키가 없거나 실패하면 순위를 매기지 않고(검색량 근거가 없으므로) 후보 순서를 그대로 둔다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 조회 기간 | 28일, 한국 시간 어제까지(데이터랩은 전날까지 집계) |
| 한 요청 | 기준 1개 + 후보 4개씩, 하루 호출 한도 1,000회 |
| 값이 0인 날 | 응답에서 빠지므로 0으로 채움 |
| 기준 키워드 평균이 0 | 그 묶음의 후보는 `interest` 비움, 순위 맨 뒤, 로그 안내 |
| `momentum` | 이전 평균 > 0이면 증감 %, 이전 0이고 최근 > 0이면 100, 아니면 0 |
| 키 없음 | `datalab=not_configured`, 비교 건너뜀 |
| 401 / 403 / 429 / 그 외 | 키 확인 / 권한 / 하루 한도 / 일반 오류 문구(`DatalabError`), `datalab=failed` |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 서버 | `interestStat`, `compareInterest`, `testDatalab` | 환산·배치 | `blog-writer:server/datalab.ts` |
| 서버 | `run`의 정렬 | level → momentum | `blog-writer:server/recommend.ts` |
| 설정 | NCP API HUB Client ID/Secret(개발자센터 키와 다름) | 키 이름만: `naver` 키 | [[_system/integrations/naver-datalab]] |
| 테스트 | 기준 100 환산·최근 7일 증감·이전 0 | | `blog-writer:tests/writer.test.ts:70-85` |

## 예외 / 경계값 · 변경 시 같이 볼 곳
- 테스트가 `tests/writer.test.ts`에 있어 위치가 직관적이지 않다 → [[topic/open-questions]] 2번

## 영향받는 플로우
[[topic/flows/주제 추천]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-11-02 | wiki 재생성 때 코드(73f47a6) 기준으로 작성 | 코드 |
