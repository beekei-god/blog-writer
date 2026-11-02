---
type: open-questions
domain: image
updated: 2026-11-02
---
# 확인이 필요한 질문
| # | 종류 | 내용 | 근거 | 관련 페이지 | 상태 |
|---|---|---|---|---|---|
| 1 | 검증 안 됨 | SVG 검증(`validateSvg`)을 직접 확인하는 전용 테스트를 찾지 못했다 | `server/images/svg.ts`, `tests/` | [[image/business-rules/BR-IMG-009 SVG 안전 렌더링]] | closed 2026-11-02: `tests/svg.test.ts` 추가 |
| 2 | 위험 | Gemini/ChatGPT 크롬 방식은 사이트 화면 변화에 의존해 깨질 수 있다(`ui_changed`, `site_error`로 분류만 함) | `server/images/webAi.ts` | [[image/business-rules/BR-IMG-004 API와 크롬 생성 방법]] | closed 2026-11-02: 알려진 위험으로 둠 |
| 3 | 의도 불명 | 썸네일 정보가 `madeForTitle` 없이 저장된 예전 글은 제목이 바뀌어도 안내가 없다. 의도된 것인지 | `src/job/JobDetail.tsx:307` | [[image/business-rules/BR-IMG-007 제목 확정 후 썸네일 생성]] | closed 2026-11-02: 그대로 둠(제목을 알 수 없어 안내 안 함) |
| 4 | 이력 | 이전 wiki의 해결 완료 질문 기록은 옮기지 않았다(백업에만 있음) | | | open |
