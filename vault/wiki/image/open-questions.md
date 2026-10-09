---
type: open-questions
domain: image
updated: 2026-10-09
---
# 확인이 필요한 질문

| # | 종류 | 내용 | 근거 | 관련 페이지 | 상태 |
|---|---|---|---|---|---|
| 1 | 의도 불명 | 모델이 본문 이미지를 지정 개수보다 적게 만들면 그대로 둔다. 부족분을 채우지 않는 것이 의도인가? | `blog-writer:server/writer.ts:267-275` | [[image/business-rules/BR-IMG-001 본문 이미지 개수]] | resolved (2026-10-05) — 그대로 두고 로그 안내 |
| 2 | 의도 불명 | 설정의 `images`는 "마지막으로 쓴 값을 기억"한다고 되어 있지만 새 글 폼은 썸네일을 항상 켠다. 썸네일 끔은 기억하지 않는 것이 의도인가? | `blog-writer:shared/types.ts:136-137`, `blog-writer:src/NewJob.tsx:56-67` | [[image/entities/ImageOptions]] | resolved (2026-10-05) — 항상 켜기가 의도, 주석 보강 |
| 3 | 정리 정책 | 다시 만들거나 올릴 때 예전 이미지 파일을 지우지 않는다. 보관이 의도인가? | `blog-writer:server/images/index.ts:58-59` | [[image/business-rules/BR-IMG-009 다시 만들기 범위]] | resolved (2026-10-05) — 교체 후 예전 파일 삭제. 재생성 실패 시 남는 고아 파일은 known-issues #6 |
| 4 | 위험 | 웹 AI 이미지 회수 시 이름이 맞지 않아도 "시작 이후 새로 생긴 이미지"를 다운로드 폴더에서 옮겨 온다. 사용자의 다른 파일을 가져갈 수 있다 | `blog-writer:server/images/webAi.ts:145-146` | [[_system/integrations/gemini-chatgpt-web]] | resolved (2026-10-05) — 이름 맞는 파일만 사용 |
| 5 | 미사용 코드 | `classifyReply`(글 답변 → 한도/거절)가 쓰이지 않는다. 제거 대상인가, 연결이 빠진 것인가? | `blog-writer:shared/imageErrors.ts:91-93` | [[image/business-rules/BR-IMG-007 이미지 실패 격리와 원인 분류]] | resolved (2026-10-05) — 삭제 |
| 6 | 의도 불명 | "이미지 다시 생성" 창의 만드는 방법은 열 때마다 `api`로 시작한다(키가 있으면 API 선택). AI·화풍은 글의 설정으로 시작하지만 방법은 글에 저장된 `method`·`thumbnailMethod`를 쓰지 않는다(`defaults`에 방법이 없음). 새 글에서 크롬을 고른 글도 다시 만들 때는 API가 기본인 것이 의도인가? | `blog-writer:src/job/images.tsx:177-180`, `:219`, `blog-writer:src/job/JobDetail.tsx:121-126` | [[image/business-rules/BR-IMG-013 이미지 API 우선과 만드는 방법 선택]] | open |
| 7 | 레이어 차이 | 한 장 다시 만들기 API에서 `method`를 빼면 서버는 글에 저장된 방법이 아니라 `api`로 만든다(`runImage` 기본값). 화면은 항상 `method`를 보내므로 지금은 영향 없음. 다른 호출자가 생기면 저장된 방법을 따라야 하는가? | `blog-writer:server/pipeline.ts:222`, `blog-writer:server/routes/images.ts:87`, `:104` | [[image/business-rules/BR-IMG-013 이미지 API 우선과 만드는 방법 선택]] | open |
| 8 | 의도 불명 | `classifyImageError`는 한도(`LIMIT`: "try again later", "나중에 다시" 등)·거절·다운로드 검사를 `site_error`보다 먼저 한다. 사이트 오류 안내에 "나중에 다시 시도하세요"가 붙어 있으면 `limit`("생성 한도를 다 썼습니다")로 보인다. 또 웹 AI 경로는 Claude가 `failed`로 보고했을 때만 `site_error`를 판단한다. 의도한 우선순위인가? | `blog-writer:shared/imageErrors.ts:92-117`, `blog-writer:server/images/webAi.ts:255-259` | [[image/business-rules/BR-IMG-007 이미지 실패 격리와 원인 분류]] | open |
| 9 | 레이어 차이 | 본문 이미지 자리를 직접 추가·삭제해도 `imageOptions.bodyImages`는 갱신되지 않는다. 그래서 글 안의 이미지 블록 수와 어긋날 수 있다(6장 제한은 블록 수로 세므로 영향 없음). 의도한 것인가, 맞춰야 하는가? | `blog-writer:server/routes/images.ts:143-199` | [[image/business-rules/BR-IMG-015 본문 이미지 자리 추가와 이미지 삭제]], [[image/entities/ImageOptions]] | open |
| 10 | 의도 불명 | 진행 단계 표시의 "이미지 생성"은 `thumbnail` 또는 `bodyImages > 0`일 때만 보인다. 썸네일 없음 + 본문 0장으로 만든 글에 이미지 자리를 추가해 만들면 그 단계가 표시되지 않는다. 의도한 것인가? | `blog-writer:src/job/Progress.tsx:6` | [[image/business-rules/BR-IMG-015 본문 이미지 자리 추가와 이미지 삭제]] | open |
