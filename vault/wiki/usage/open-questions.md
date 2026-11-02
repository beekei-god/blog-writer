---
type: open-questions
domain: usage
updated: 2026-11-02
---
# 확인이 필요한 질문
| # | 종류 | 내용 | 근거 | 관련 페이지 | 상태 |
|---|---|---|---|---|---|
| 1 | 검증 안 됨 | `runClaude`(모델 결정, 시간 초과, 이벤트 처리)와 사용량 집계를 직접 확인하는 전용 테스트를 찾지 못했다(다른 테스트는 `runClaude`를 가짜로 대체) | `tests/` | [[usage/business-rules/BR-USG-002 Claude 호출 방식]], [[usage/business-rules/BR-USG-005 집계 기준]] | open |
| 2 | 레이어 차이 | 추천 모델의 이유 문구는 화면(`src/labels.ts`)에 있고 기본값은 `shared/types.ts`에 있어 둘이 따로 관리된다 | `shared/types.ts`, `src/labels.ts` | [[usage/business-rules/BR-USG-001 단계별 모델 선택]] | open |
| 3 | 이력 | 이전 wiki의 해결 완료 질문 기록은 옮기지 않았다(백업에만 있음) | | | open |
