---
type: open-questions
domain: topic
updated: 2026-11-02
---
# 확인이 필요한 질문
| # | 종류 | 내용 | 근거 | 관련 페이지 | 상태 |
|---|---|---|---|---|---|
| 1 | 검증 안 됨 | 후보 개수(10~12)와 근거 필수는 프롬프트 지시뿐이고 코드가 검사하지 않으며 전용 테스트도 없다 | `server/recommend.ts` | [[topic/business-rules/BR-TOP-001 근거 있는 후보만]] | closed 2026-11-02: 근거 0개 후보는 코드에서 버림(개수 10~12는 프롬프트만) |
| 2 | 위치 | 데이터랩 환산 테스트가 `tests/writer.test.ts`에 들어 있다. 전용 테스트 파일로 옮길지 | `tests/writer.test.ts:70` | [[topic/business-rules/BR-TOP-004 데이터랩 관심도와 순위]] | closed 2026-11-02: `tests/datalab.test.ts`로 이동 |
| 3 | 검증 안 됨 | 추천 동시 실행 방지·복구를 직접 확인하는 테스트를 찾지 못했다 | `tests/` | [[topic/business-rules/BR-TOP-005 추천은 한 번에 하나]] | closed 2026-11-02: `tests/recommend.test.ts`에 추가 |
| 4 | 이력 | 이전 wiki의 해결 완료 질문 기록은 옮기지 않았다(백업에만 있음) | | | open |
