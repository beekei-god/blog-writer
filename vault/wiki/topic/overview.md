---
type: domain-overview
domain: topic
aliases: [주제 추천, 추천]
projects: [blog-writer]
updated: 2026-10-07
---
# topic (주제 추천) 도메인

## 한 문단 요약
사용자가 분야(예: 청약·부동산)를 넣으면 Claude가 최근 2주 뉴스와 최근 공식 통계·공고에서 지금 검색이 많을 만한 블로그 주제 10~12개를 근거와 함께 찾고, 네이버 자동완성 개수와 데이터랩(NAVER API HUB 검색어 트렌드) 관심도·상승세로 보강·정렬하는 업무. 결과는 기록으로 남고, 후보 하나를 골라 바로 새 글 작성으로 넘긴다.

## 경계
- 포함: 추천 실행·기록, 후보 조건, 데이터랩 키, 관심도·상승세 계산, 순위
- 제외(다른 도메인): 고른 주제로 글 쓰기 → [[writing/overview]]

## 핵심 개념
- [[topic/entities/Recommendation]] — 추천 실행 한 번
- [[topic/entities/TopicCandidate]] — 주제 후보

## 주요 플로우
- [[topic/flows/주제 추천 플로우]]

## 레이어별 역할
| 레이어 | 역할 | 주요 모듈 |
|---|---|---|
| 프롬프트 | 후보 조건(최신성·근거·중복 제외) | [[_system/integrations/claude-cli]] |
| 서버 | 실행·저장, 자동완성·데이터랩 호출, 환산·정렬 | [[_system/modules/server-recommend]] |
| API | 추천·데이터랩 키 엔드포인트 (`server/routes/recommendations.ts`, `server/routes/settings.ts`) | [[_system/modules/server-routes]] |
| 화면 | 입력, 기록, 카드, 새 글로 넘기기, 데이터랩 키 설정 | [[_system/modules/web-screens]] |
| 외부 | 네이버 자동완성, 데이터랩 | [[_system/integrations/naver-search]], [[_system/integrations/naver-datalab]] |

## 구현 지도
- [[topic/implementations/blog-writer 구현]]
