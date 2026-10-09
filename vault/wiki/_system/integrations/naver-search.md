---
type: integration
project: blog-writer
system: 네이버 검색 자동완성 · 함께 많이 찾는
confidence: high
source:
  - blog-writer:server/naver.ts:1-89
  - blog-writer:server/recommend.ts:200-204
updated: 2026-10-09
---
# 네이버 검색 (자동완성 · 함께 많이 찾는)

## 무엇에 쓰나
- 글 작성: 리서치가 정한 메인·서브 키워드로 태그 후보를 모은다 → [[writing/business-rules/BR-WRT-015 네이버 검색어 제안 수집 범위]].
- 주제 추천: 후보의 첫 검색어 자동완성 개수를 검색 수요의 간접 신호로 표시한다 (순위에는 안 씀).

## 호출 방식
- **자동완성**: `GET https://ac.search.naver.com/nx/ac?...&q=<검색어>` (공개 엔드포인트), UA `Mozilla/5.0`, 8초 타임아웃. 응답 `items[0]`의 각 항목 첫 값 중 검색어 자신을 뺀 것 (`blog-writer:server/naver.ts:4-19`).
- **함께 많이 찾는** (예전 연관검색어 자리): 검색 결과 페이지 `search.naver.com/search.naver?query=`를 브라우저 UA로 받아, HTML 안의 `s.search.naver.com/p/qra/...` 요청 주소를 정규식으로 꺼내 다시 호출. 응답 `result.contents[].query` (`:47-70`). 10초 타임아웃.
- 인증 없음.

## 실패 처리
모든 실패(HTTP 오류, 타임아웃, 파싱 실패)는 빈 배열. 작업을 멈추지 않는다. 함께 많이 찾는은 네이버가 검색어별로 꺼 두면 비는 게 정상이다 (`:45`).

## 바깥 변화에 취약한 지점
- 함께 많이 찾는은 비공개 내부 요청이고 HTML 구조에 의존한다 ([[_system/known-issues]] #7). 바뀌면 조용히 0개가 되고, 로그에 "함께 많이 찾는 영역이 없거나 꺼져 있음"으로만 보인다 (`blog-writer:server/pipeline.ts:111-115`).
- 자동완성 쿼리 파라미터가 고정되어 있다.

## 관련 규칙과 흐름
[[writing/business-rules/BR-WRT-005 태그 출처 검증]], [[writing/flows/초안 작성 플로우]], [[topic/flows/주제 추천 플로우]]
