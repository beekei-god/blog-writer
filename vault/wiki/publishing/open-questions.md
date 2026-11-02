---
type: open-questions
domain: publishing
updated: 2026-11-02
---
# 확인이 필요한 질문
| # | 종류 | 내용 | 근거 | 관련 페이지 | 상태 |
|---|---|---|---|---|---|
| 1 | 위험 | 네이버 주제 목록(33개)이 코드에 고정돼 있어 네이버가 분류를 바꾸면 낡는다(못 찾으면 주제 없이 올림) | `server/naverTopic.ts` | [[publishing/business-rules/BR-PUB-007 카테고리와 네이버 주제]] | closed 2026-11-02: 알려진 위험으로 둠 |
| 2 | 위험 | 발행 창·에디터 단계는 사이트 화면에 의존해 깨질 수 있다(깨지면 임시저장으로 남김) | `server/browser/publish.ts`, `category.ts` | [[publishing/business-rules/BR-PUB-004 임시저장 우선과 발행 단계 실패]] | closed 2026-11-02: 알려진 위험으로 둠 |
| 3 | 의도 불명 | 평소 크롬 방식은 macOS 전용이라 그 밖 OS의 네이버는 앱 전용 크롬(Playwright)으로 간다. 이 경로를 계속 유지할지 | `server/browser/userChrome.ts:43` | [[publishing/business-rules/BR-PUB-005 크롬 방식 선택과 막힌 사이트]] | closed 2026-11-02: 비-macOS 경로 유지 |
| 4 | 이력 | 이전 wiki의 해결 완료 질문 기록은 옮기지 않았다(백업에만 있음) | | | open |
