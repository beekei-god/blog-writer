---
type: integration
project: blog-writer
name: 네이버 데이터랩 (검색어 트렌드)
source:
  - blog-writer:server/datalab.ts
updated: 2026-11-02
---
# 네이버 데이터랩 (검색어 트렌드)

## 무엇을 위해
주제 추천에서 검색량 추이를 비교한다.

## 엔드포인트·키
`https://naverapihub.apigw.ntruss.com/search-trend/v1/search` (NAVER API HUB). 키: `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` 또는 설정 화면.

## 실패 형태
키 없음, 인증 실패, 하루 호출 한도 초과(429) — `DatalabError` 한국어 문구.

## 주의
쓰는 곳: [[topic/overview]]. 모듈: [[_system/modules/server-recommend]]
