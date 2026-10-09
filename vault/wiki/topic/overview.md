---
type: domain-overview
domain: topic
aliases: [주제 추천, 추천, 키워드 탐색]
projects: [blog-writer]
updated: 2026-10-09
---
# topic (주제 추천) 도메인

## 한 문단 요약
사용자가 분야(예: 청약·부동산)를 넣으면 Claude가 최근 2주 뉴스와 최근 공식 통계·공고에서 지금 검색이 많을 만한 블로그 주제 10~12개를 근거와 함께 찾고, 네이버 자동완성 개수와 데이터랩(NAVER API HUB 검색어 트렌드) 관심도·상승세로 보강·정렬하는 업무. 결과는 기록으로 남고, 후보 하나를 골라 바로 새 글 작성으로 넘긴다. 별도로 **키워드 탐색**(2026-10-09 추가)은 네이버 검색광고 키워드 도구로 키워드의 월간 검색량·경쟁을 보여 주고(입력이 없으면 구글 트렌드 급상승 검색어와 최근 추천 분야 기준), 키워드를 새 글 주제로 쓰거나 그 키워드로 주제 추천을 바로 시작하게 해 준다.

## 경계
- 포함: 추천 실행·기록, 후보 조건, 데이터랩 키, 관심도·상승세 계산, 순위, 키워드 탐색(검색량 표기·집계, 탐색 기준, 검색광고 키)
- 제외(다른 도메인): 고른 주제로 글 쓰기 → [[writing/overview]]

## 핵심 개념
- [[topic/entities/Recommendation]] — 추천 실행 한 번
- [[topic/entities/TopicCandidate]] — 주제 후보
- [[topic/entities/KeywordRow]] — 키워드 탐색 결과 줄과 덩어리(KeywordSection)

## 주요 플로우
- [[topic/flows/주제 추천 플로우]]
- [[topic/flows/키워드 탐색 플로우]]

## 레이어별 역할
| 레이어 | 역할 | 주요 모듈 |
|---|---|---|
| 프롬프트 | 후보 조건(최신성·근거·중복 제외) | [[_system/integrations/claude-cli]] |
| 서버 | 실행·저장, 자동완성·데이터랩 호출, 환산·정렬. 키워드 탐색: 검색광고·구글 트렌드 호출, 합산·정렬 (`server/searchad.ts`, `explore.ts`, `trends.ts`) | [[_system/modules/server-recommend]] |
| API | 추천·데이터랩 키·검색광고 키·키워드 탐색 엔드포인트 (`server/routes/recommendations.ts`, `server/routes/settings.ts`, `server/routes/keywords.ts`) | [[_system/modules/server-routes]] |
| 화면 | 입력, 기록, 카드, 새 글로 넘기기, 데이터랩·검색광고 키 설정, 키워드 탐색 탭(`src/Keywords.tsx`)과 거기서 주제 추천 시작 | [[_system/modules/web-screens]] |
| 외부 | 네이버 자동완성, 데이터랩, 네이버 검색광고 키워드 도구, 구글 트렌드 RSS | [[_system/integrations/naver-search]], [[_system/integrations/naver-datalab]] |

## 구현 지도
- [[topic/implementations/blog-writer 구현]]
