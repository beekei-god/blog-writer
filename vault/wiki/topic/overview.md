---
type: domain-overview
domain: topic
aliases: [주제 추천, 키워드 탐색]
projects: [blog-writer]
updated: 2026-11-02
---
# topic (주제 추천) 도메인

## 한 문단 요약
무엇을 쓸지 모를 때 두 가지를 도와준다. ① **주제 추천**: 분야를 주면 Claude가 최근 2주 뉴스·공식 통계를 웹 검색해 근거가 있는 주제 후보 10~12개를 내고, 네이버 자동완성과 데이터랩 검색 관심도로 순위를 매긴다. ② **키워드 탐색**: 키워드나 지금 뜨는 검색어를 기준으로 네이버 월간 검색량과 경쟁 정도를 보여 준다. 근거 없는 후보는 만들지 않고, 검색량 근거(데이터랩)가 없으면 순위를 매기지 않는다.

## 경계
- 포함: 주제 추천(후보, 근거, 순위), 키워드 탐색(검색광고 키워드 도구, 구글 트렌드)
- 제외: 글 작성 → [[writing/overview]] (후보를 주제로 쓰면 작업이 생김). 태그용 자동완성 수집은 글 작성의 일부 → [[writing/business-rules/BR-WRT-007 태그 수와 출처 확인]]

## 핵심 개념
- [[topic/entities/주제 추천]] · [[topic/entities/주제 후보]] · [[topic/entities/키워드 행]]

## 주요 플로우
- [[topic/flows/주제 추천]] · [[topic/flows/키워드 탐색]]

## 규칙
[[topic/index]]의 규칙 표 (BR-TOP-001~007)

## 레이어별 역할
| 레이어 | 역할 | 주요 모듈 |
|---|---|---|
| 프롬프트 | 후보 찾기 지시(웹 검색, 근거 필수) | [[_system/modules/server-recommend]] |
| 서버 | 추천 실행·저장, 데이터랩·검색광고·트렌드 호출 | [[_system/modules/server-recommend]], [[_system/modules/server-routes]] |
| 화면 | 추천/키워드 화면 | [[_system/modules/web-screens]] |
| 외부 | 네이버 자동완성·데이터랩·검색광고, 구글 트렌드 | [[_system/integrations/naver-search]], [[_system/integrations/naver-datalab]], [[_system/integrations/naver-searchad]], [[_system/integrations/google-trends]] |

## 구현 지도
- [[topic/implementations/blog-writer 구현]]
