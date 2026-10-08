---
type: open-questions
domain: usage
updated: 2026-10-09
---
# 확인이 필요한 질문

| # | 종류 | 내용 | 근거 | 관련 페이지 | 상태 |
|---|---|---|---|---|---|
| 1 | 정확도 | 중지·타임아웃으로 강제 종료된 호출은 결과 이벤트가 없어 토큰이 기록되지 않는다. 사용량이 적게 잡히는 것을 감수하는가? | `blog-writer:server/claude.ts:166-181` | [[usage/business-rules/BR-USG-006 실패한 호출도 기록]] | resolved (2026-10-05) — 현재 동작 유지, 화면에 안내 추가 |
| 2 | 의도 불명 | `calls`는 호출 수가 아니라 기록 줄 수다(호출 한 번에 모델이 여럿이면 여러 줄). 화면은 "호출 N회"로 표시한다 | `blog-writer:server/usage.ts:98-112`, `blog-writer:src/Usage.tsx:208` | [[usage/entities/UsageRecord]] | resolved (2026-10-05) — `callId`로 실제 호출 수 집계 |
| 3 | 표시 | 일별 막대의 요일 라벨이 브라우저 현지 시간 기준이다 | `blog-writer:src/Usage.tsx:217-221` | [[usage/business-rules/BR-USG-004 사용량 집계 기준]] | resolved (2026-10-05) — 문자열 기준으로 요일 계산 |
