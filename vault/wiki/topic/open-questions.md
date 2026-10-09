---
type: open-questions
domain: topic
updated: 2026-10-09
---
# 확인이 필요한 질문

| # | 종류 | 내용 | 근거 | 관련 페이지 | 상태 |
|---|---|---|---|---|---|
| 1 | 레이어 불일치 | 분야 100자 상한은 서버만 검사하고, 초과 시 오류가 "2자 이상 입력하세요"로 나온다 | `blog-writer:server/routes/recommendations.ts:15-19`, `blog-writer:src/Recommend.tsx:146` | [[topic/business-rules/BR-TOP-005 추천 동시 실행과 입력 제한]] | resolved (2026-10-05) — 화면 maxLength 100과 서버 오류 문구 분리 |
| 2 | 의도 불명 | 기준 키워드 평균이 0이면 배율 1로 원값을 쓴다. 이때 level은 다른 요청 묶음과 비교할 수 없는데 그대로 정렬에 쓰인다 | `blog-writer:server/datalab.ts:110-112` | [[topic/business-rules/BR-TOP-002 검색 관심도 환산]] | resolved (2026-10-05) — 관심도를 비우고 순위 맨 뒤로 |
| 3 | 기능 공백 | 진행 중인 추천은 중지할 방법이 없다 (최대 20분 Claude 호출) | `blog-writer:server/recommend.ts:163-165` | [[topic/business-rules/BR-TOP-005 추천 동시 실행과 입력 제한]] | resolved (2026-10-05) — 추천 중지 버튼·API 추가 |
| 4 | 의도 불명 | 근거 URL을 모두 새 글의 참고 링크로 넘기는데, 리서치는 사용자 링크를 "모두 열어" 반영한다. 근거가 많으면 리서치 비용이 커진다. 의도된 것인가? | `blog-writer:src/Recommend.tsx:200`, `blog-writer:server/research.ts:18` | [[topic/flows/주제 추천 플로우]] | resolved (2026-10-05) — 근거 전부 채우는 것이 의도 |
| 5 | 미검증 (confidence medium) | 네이버 검색광고 키워드 도구를 실제 계정·실제 응답으로 아직 확인하지 못했다. 코드는 문서 기준 필드 이름(`keywordList`, `relKeyword`, `monthlyPcQcCnt`, `monthlyMobileQcCnt`, `compIdx`)과 서명 방식을 가정한다. 필드 이름이 실제와 다르면 `keywordList`가 비거나 줄이 걸러져 **결과가 조용히 비어 보일 수 있다**(오류 없이). 광고 미집행 계정에서도 키워드 도구가 되는지도 화면 안내만 있고 확인 못 함 | `blog-writer:server/searchad.ts:21-26`, `:79-102`, `:47` | [[topic/business-rules/BR-TOP-007 키워드 검색량 표기와 집계]], [[topic/business-rules/BR-TOP-009 검색광고 키 확인과 우선순위]] | open |
| 6 | 미검증 (confidence medium) | 구글 트렌드 공개 RSS(`geo=KR`)의 주소·`<ht:approx_traffic>` 형식을 실제 호출로 확인하지 못했다(테스트는 가짜 RSS). 비공식에 가까워 바뀌면 "지금 뜨는 검색어" 덩어리만 오류가 된다. 한국 블로그와 무관한 검색어도 섞임 | `blog-writer:server/trends.ts:6`, `:26-36`, `:53` | [[topic/business-rules/BR-TOP-008 입력 없는 키워드 탐색의 기준과 오류 처리]] | open |
| 7 | 의도 불명 | 입력한 키워드가 5개를 넘으면 앞 5개만 쓰고 나머지는 알림 없이 버린다. 의도된 제한인가, 5개씩 나눠 모두 조회해야 하는가(입력 없는 탐색은 나눠 조회함) | `blog-writer:server/searchad.ts:67-77`, `blog-writer:server/explore.ts:24-27` | [[topic/business-rules/BR-TOP-007 키워드 검색량 표기와 집계]] | open |
