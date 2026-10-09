---
type: integration
project: blog-writer
system: 구글 트렌드 일일 급상승 검색어 (공개 RSS)
confidence: medium
source:
  - blog-writer:server/trends.ts:1-61
  - blog-writer:server/explore.ts:31-74
  - blog-writer:tests/explore.test.ts:23-56
updated: 2026-10-09
---
# 구글 트렌드 일일 급상승 검색어 (공개 RSS)

## 무엇에 쓰나
키워드 탐색 탭에서 **키워드를 입력하지 않았을 때** "지금 뜨는 검색어" 덩어리의 기준으로 쓴다. 네이버에는 공개된 인기 검색어가 없어(실시간 검색어 서비스 종료) 구글 기준으로 대신한다. 한국 블로그 분야와 맞지 않는 검색어(스포츠 경기 등)도 섞인다 (`blog-writer:server/trends.ts:1-4`). 가져온 검색어로 네이버 월간 검색량을 조회하는 쪽은 [[_system/integrations/naver-searchad]].

> 상태: 실제 구글 응답으로 확인해 보지 않았고 가짜 RSS 테스트로만 확인했다. 비공식 공개 주소라 바뀔 수 있다 → [[_system/known-issues]] #35. `confidence: medium`.

## 호출 방식
- `GET https://trends.google.com/trending/rss?geo=KR` (한국 일일 급상승 검색어). 키·로그인 없음, 헤더는 `User-Agent: Mozilla/5.0`, 10초 타임아웃 (`blog-writer:server/trends.ts:5-6`, `:45`). 시험용으로만 환경변수 `TRENDS_URL`로 주소를 바꾼다 ([[_system/configuration]]).
- 파싱은 XML 파서 없이 정규식이다: `<item>`마다 첫 `<title>`을 검색어로, `<ht:approx_traffic>`을 대략의 검색 규모("200+")로 읽는다. 항목 안 뉴스 제목은 `<ht:news_item_title>`이라 섞이지 않는다. HTML 엔티티를 풀고 같은 검색어는 한 번만 둔다 (`blog-writer:server/trends.ts:18-36`).
- **10분 캐시**: 성공한 목록을 메모리에 두고 10분 안에는 다시 부르지 않는다. 실패는 캐시하지 않는다. 서버를 다시 띄우면 사라진다 (`:7-8`, `:38-56`).
- 탐색에서는 상위 10개(`TRENDING_LIMIT`)만 쓰고, 검색어를 공백·구분자로 쪼개 5개씩 검색광고에 조회한다. 구글이 준 규모는 결과 줄의 `trend` 값으로 붙는다 (`blog-writer:server/explore.ts:9`, `:38-55`).

## 실패 처리
- 응답이 200이 아니면 "구글 트렌드가 <코드>로 응답했습니다.", 연결 실패는 "구글 트렌드에 연결하지 못했습니다: …", 항목을 하나도 못 읽으면 "구글 트렌드에서 검색어를 읽지 못했습니다 (형식이 바뀌었을 수 있습니다)." (`TrendsError`) (`blog-writer:server/trends.ts:46-53`).
- **실패는 "지금 뜨는 검색어" 덩어리만 오류로** 두고(`KeywordSection.error`), 다른 덩어리("최근 주제 추천의 분야")는 그대로 보여 준다. 구글 트렌드도 실패하고 주제 추천 기록도 없어 기준이 하나도 없으면 안내와 함께 400으로 거절한다 (`blog-writer:server/explore.ts:44-72`, `blog-writer:tests/explore.test.ts:105-129`).
- 반대로 검색광고 키 오류·호출 한도는 덩어리별이 아니라 전체 오류다 ([[_system/integrations/naver-searchad]]).

## 바깥 변화에 취약한 지점
- RSS 주소와 `geo=KR` 파라미터 (구글이 공식 문서로 약속한 주소가 아니다).
- 항목 구조(`<item>`, `<title>`, `<ht:approx_traffic>` 태그 이름). 바뀌면 "형식이 바뀌었을 수 있습니다" 오류가 나지만, 일부만 바뀌면(예: 규모 태그 이름) 검색어는 읽히고 규모만 조용히 빠진다.
- 구글이 봇을 막거나 `User-Agent`를 검사하는 정책.
- 검색어 내용이 블로그 분야와 맞는지는 코드가 걸러 주지 않는다.
