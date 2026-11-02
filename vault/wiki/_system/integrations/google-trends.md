---
type: integration
project: blog-writer
name: 구글 트렌드 (인기 검색어 RSS)
source:
  - blog-writer:server/trends.ts
updated: 2026-11-02
---
# 구글 트렌드 (인기 검색어 RSS)

## 무엇을 위해
주제 추천의 "지금 뜨는 검색어" 후보. 키가 필요 없다.

## 엔드포인트
`https://trends.google.com/trending/rss?geo=KR` (`TRENDS_URL`로 시험용 변경).

## 주의
RSS 형식이 바뀌면 파싱이 깨진다. 쓰는 곳: [[topic/overview]]. 모듈: [[_system/modules/server-recommend]]
