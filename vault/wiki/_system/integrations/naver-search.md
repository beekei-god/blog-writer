---
type: integration
project: blog-writer
name: 네이버 검색·자동완성
source:
  - blog-writer:server/naver.ts
updated: 2026-11-02
---
# 네이버 검색·자동완성

## 무엇을 위해
주제의 검색 의도와 상위 노출 글 구성을 보기 위해 네이버 검색 결과 페이지와 자동완성을 읽는다. 키가 필요 없는 공개 페이지 요청이다.

## 엔드포인트
- 자동완성: `https://ac.search.naver.com/nx/ac`
- 검색: `https://search.naver.com/search.naver?query=`

## 주의
HTML 구조에 의존하므로 네이버 화면이 바뀌면 파싱이 깨진다. 브라우저 User-Agent로 요청한다. 쓰는 곳: [[topic/overview]], [[_system/modules/server-recommend]]
