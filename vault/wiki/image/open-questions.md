---
type: open-questions
domain: image
updated: 2026-10-07
---
# 확인이 필요한 질문

| # | 종류 | 내용 | 근거 | 관련 페이지 | 상태 |
|---|---|---|---|---|---|
| 1 | 의도 불명 | 모델이 본문 이미지를 지정 개수보다 적게 만들면 그대로 둔다. 부족분을 채우지 않는 것이 의도인가? | `blog-writer:server/writer.ts:267-275` | [[image/business-rules/BR-IMG-001 본문 이미지 개수]] | resolved (2026-10-05) — 그대로 두고 로그 안내 |
| 2 | 의도 불명 | 설정의 `images`는 "마지막으로 쓴 값을 기억"한다고 되어 있지만 새 글 폼은 썸네일을 항상 켠다. 썸네일 끔은 기억하지 않는 것이 의도인가? | `blog-writer:shared/types.ts:130-131`, `blog-writer:src/NewJob.tsx:56-67` | [[image/entities/ImageOptions]] | resolved (2026-10-05) — 항상 켜기가 의도, 주석 보강 |
| 3 | 정리 정책 | 다시 만들거나 올릴 때 예전 이미지 파일을 지우지 않는다. 보관이 의도인가? | `blog-writer:server/images/index.ts:58-59` | [[image/business-rules/BR-IMG-009 다시 만들기 범위]] | resolved (2026-10-05) — 교체 후 예전 파일 삭제. 재생성 실패 시 남는 고아 파일은 known-issues #6 |
| 4 | 위험 | 웹 AI 이미지 회수 시 이름이 맞지 않아도 "시작 이후 새로 생긴 이미지"를 다운로드 폴더에서 옮겨 온다. 사용자의 다른 파일을 가져갈 수 있다 | `blog-writer:server/images/webAi.ts:145-146` | [[_system/integrations/gemini-chatgpt-web]] | resolved (2026-10-05) — 이름 맞는 파일만 사용 |
| 5 | 미사용 코드 | `classifyReply`(글 답변 → 한도/거절)가 쓰이지 않는다. 제거 대상인가, 연결이 빠진 것인가? | `blog-writer:shared/imageErrors.ts:91-93` | [[image/business-rules/BR-IMG-007 이미지 실패 격리와 원인 분류]] | resolved (2026-10-05) — 삭제 |
