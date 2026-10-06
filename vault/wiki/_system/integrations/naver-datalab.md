---
type: integration
project: blog-writer
system: NAVER API HUB 검색어 트렌드 (데이터랩)
confidence: high
source:
  - blog-writer:server/datalab.ts:1-116
  - blog-writer:server/secrets.ts:37-55
  - blog-writer:server/routes/settings.ts:60-88
updated: 2026-10-07
---
# NAVER API HUB 검색어 트렌드 (데이터랩)

## 무엇에 쓰나
주제 추천 후보들의 최근 4주 검색 관심도와 상승세를 비교해 순위를 매긴다 → [[topic/business-rules/BR-TOP-004 추천 순위]].

## 호출 방식
- `POST https://naverapihub.apigw.ntruss.com/search-trend/v1/search`, 헤더 `X-NCP-APIGW-API-KEY-ID`/`X-NCP-APIGW-API-KEY`(네이버 클라우드 플랫폼 Application 키. 개발자센터 키와 다름), 15초 타임아웃 (`blog-writer:server/datalab.ts:4-49`).
- 요청: `startDate`~`endDate`(한국 시간 어제까지 28일), `timeUnit: "date"`, `keywordGroups` 최대 5개 = 기준 키워드 그룹 1 + 후보 4 (`PER_REQUEST = 4`), 후보 그룹당 검색어 최대 20개 (`:95-104`).
- 응답 값은 요청 안의 최댓값을 100으로 한 상대값이라 요청끼리 비교할 수 없다 → 매 요청에 같은 기준 키워드를 넣어 환산한다 → [[topic/business-rules/BR-TOP-002 검색 관심도 환산]].
- 하루 호출 한도 1,000회 (주석, `:9`).
- 키 저장 전 확인: 최근 7일 "날씨" 한 그룹으로 호출해 본다 (`:52-55`).

## 실패 처리
| 상태 | 메시지 |
|---|---|
| 401 | 키가 올바르지 않음 |
| 403 | Application에 '검색어 트렌드' 사용 설정 필요 |
| 429 | 하루 호출 한도 초과 |
| 그 밖 | "데이터랩 오류 <code>" |
추천 중 실패하면 `datalab: "failed"`로 두고 순위 없이 끝낸다. 키가 없으면 `not_configured` (`blog-writer:server/recommend.ts:208-227`).

## 바깥 변화에 취약한 지점
엔드포인트·헤더 이름·응답 구조(`results[].title/data[].period/ratio`), 0인 날이 응답에서 빠지는 동작(코드가 0으로 채움, `:105-109`).
