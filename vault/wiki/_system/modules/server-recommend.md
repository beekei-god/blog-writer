---
type: module
project: blog-writer
module: server-recommend
paths: [server/recommend.ts, server/datalab.ts, server/searchad.ts, server/explore.ts, server/trends.ts]
source:
  - blog-writer:server/recommend.ts
  - blog-writer:server/searchad.ts
updated: 2026-11-02
---
# server-recommend (주제 추천·키워드)

## 역할
주제 추천 실행·저장, 데이터랩 관심도, 검색광고 키워드 도구, 키워드 탐색, 구글 트렌드 → [[topic/implementations/blog-writer 구현]]

## 주요 파일과 export
`recommend.ts`(`startRecommendation`, `listRecommendations`, `recoverRecommendations`), `datalab.ts`(`compareInterest`, `interestStat`), `searchad.ts`(`lookupKeywords`, `sign`, `splitHints`), `explore.ts`(`exploreKeywords`), `trends.ts`(`fetchTrending`)

## 의존하는 모듈 / 쓰이는 곳
`claude.ts`(후보 찾기), `naver.ts`(자동완성), `secrets.ts`(키), `store.ts`(작업 목록).

## 주의할 점
- 추천은 한 번에 하나(`running`), 중지는 작업 중지와 같은 `cancelJob`을 쓴다 → [[topic/business-rules/BR-TOP-005 추천은 한 번에 하나]]
