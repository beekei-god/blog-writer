---
type: module
project: blog-writer
module: server-recommend
paths: [server/recommend.ts, server/datalab.ts]
source:
  - blog-writer:server/recommend.ts:1-255
  - blog-writer:server/datalab.ts:1-116
updated: 2026-10-07
---
# server-recommend 모듈

## 책임
분야를 받아 최근 뉴스·통계 기반 블로그 주제 후보를 만들고, 네이버 자동완성 개수와 데이터랩 검색 관심도로 보강·정렬한다.

## 파일
| 파일 | 줄 | 역할 | 주요 export | 관련 페이지 |
|---|---|---|---|---|
| `server/recommend.ts` | 255 | 추천 저장(한 줄로 직렬화한 원자적 쓰기), 목록·삭제·재시작 복구, Claude 추천 프롬프트, 3단계 실행(후보→자동완성→데이터랩→정렬) | `startRecommendation`, `listRecommendations`, `deleteRecommendation`, `isRecommending`, `recoverRecommendations` | [[topic/flows/주제 추천 플로우]] |
| `server/datalab.ts` | 116 | NAVER API HUB 검색어 트렌드 호출, 키 확인, 기준 키워드 환산·상승세 계산(순수 함수 `interestStat`, 테스트 있음) | `compareInterest`, `interestStat`, `testDatalab`, `DatalabError` | [[_system/integrations/naver-datalab]], [[topic/business-rules/BR-TOP-002 검색 관심도 환산]] |

## 의존
- 사용하는 모듈: [[_system/modules/server-claude]], [[_system/modules/server-pipeline]] (`naverAutocomplete`), [[_system/modules/server-core]] (`listJobs`, `todayKST`, `getNaverKeys`, `DATA_DIR`)
- 사용되는 곳: [[_system/modules/server-routes]] (`routes/recommendations.ts`, `routes/settings.ts`)
