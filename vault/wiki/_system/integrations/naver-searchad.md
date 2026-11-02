---
type: integration
project: blog-writer
name: 네이버 검색광고 (키워드 도구)
source:
  - blog-writer:server/searchad.ts
updated: 2026-11-02
---
# 네이버 검색광고 (키워드 도구)

## 무엇을 위해
키워드 탐색에서 연관 키워드와 월 검색량·경쟁도를 읽는다.

## 엔드포인트·키
`https://api.searchad.naver.com`(`SEARCHAD_HOST`로 시험용 변경). 키: `SEARCHAD_CUSTOMER_ID`, `SEARCHAD_API_KEY`, `SEARCHAD_SECRET_KEY`. 요청마다 서명 헤더를 만든다.

## 한도
호출 간격 `SEARCHAD_GAP_MS`(기본 400ms). 429가 오면 간격을 4배씩 늘려 다시 시도하고, 끝내 안 되면 `SearchAdError(429)`.

## 주의
쓰는 곳: [[topic/overview]]. 모듈: [[_system/modules/server-recommend]]
