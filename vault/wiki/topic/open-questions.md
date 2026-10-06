---
type: open-questions
domain: topic
updated: 2026-10-07
---
# 확인이 필요한 질문

| # | 종류 | 내용 | 근거 | 관련 페이지 | 상태 |
|---|---|---|---|---|---|
| 1 | 레이어 불일치 | 분야 100자 상한은 서버만 검사하고, 초과 시 오류가 "2자 이상 입력하세요"로 나온다 | `blog-writer:server/routes/recommendations.ts:15-19`, `blog-writer:src/Recommend.tsx:119` | [[topic/business-rules/BR-TOP-005 추천 동시 실행과 입력 제한]] | resolved (2026-10-05) — 화면 maxLength 100과 서버 오류 문구 분리 |
| 2 | 의도 불명 | 기준 키워드 평균이 0이면 배율 1로 원값을 쓴다. 이때 level은 다른 요청 묶음과 비교할 수 없는데 그대로 정렬에 쓰인다 | `blog-writer:server/datalab.ts:110-112` | [[topic/business-rules/BR-TOP-002 검색 관심도 환산]] | resolved (2026-10-05) — 관심도를 비우고 순위 맨 뒤로 |
| 3 | 기능 공백 | 진행 중인 추천은 중지할 방법이 없다 (최대 20분 Claude 호출) | `blog-writer:server/recommend.ts:163-165` | [[topic/business-rules/BR-TOP-005 추천 동시 실행과 입력 제한]] | resolved (2026-10-05) — 추천 중지 버튼·API 추가 |
| 4 | 의도 불명 | 근거 URL을 모두 새 글의 참고 링크로 넘기는데, 리서치는 사용자 링크를 "모두 열어" 반영한다. 근거가 많으면 리서치 비용이 커진다. 의도된 것인가? | `blog-writer:src/Recommend.tsx:173`, `blog-writer:server/research.ts:18` | [[topic/flows/주제 추천 플로우]] | resolved (2026-10-05) — 근거 전부 채우는 것이 의도 |
