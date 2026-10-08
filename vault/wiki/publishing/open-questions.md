---
type: open-questions
domain: publishing
updated: 2026-10-07
---
# 확인이 필요한 질문

| # | 종류 | 내용 | 근거 | 관련 페이지 | 상태 |
|---|---|---|---|---|---|
| 1 | 레이어 불일치 | 앱 전용 크롬 자동 조작(네이버·티스토리)은 모든 블록 사이에 빈 줄을, 소제목 앞에는 두 줄을 넣는 것으로 보인다. 글쓰기 규칙 6장(소제목 위 한 줄만)과 다르다. 실제 에디터에서 어떻게 보이는지 확인 필요 | `blog-writer:server/browser/adapters.ts:137-138` | [[publishing/business-rules/BR-PUB-007 소제목 위 빈 줄]] | resolved (2026-10-05) — 소제목 위 한 줄만 넣도록 수정, 실제 에디터에서 빈 줄 수 확인은 남음 |
| 2 | 경로 간 차이 | 네이버에서 Claude in Chrome 경로는 이미지 파일 이름을 alt로 바꾸지 않는다(원래 생성 파일명). 다른 두 경로는 alt 이름으로 올린다 | `blog-writer:server/browser/blogPost.ts:131-146`, `blog-writer:server/browser/postHtml.ts:27-35` | [[publishing/business-rules/BR-PUB-009 네이버 이미지 파일 이름과 크기]] | resolved (2026-10-05) — alt 이름 사본으로 통일 |
| 3 | 경로 간 차이 | 로그인 화면에서 Claude in Chrome·평소 크롬은 멈추고, 자동 조작은 5분 기다린다. 의도된 차이인가? | `blog-writer:server/browser/adapters.ts:151-155` | [[publishing/business-rules/BR-PUB-012 로그인 화면이면 멈춤]] | resolved (2026-10-05) — 자동 조작도 로그인 화면이면 즉시 중단 |
| 4 | 정책 | 자동 조작이 자동화 표시를 끄고 사람 같은 마우스 움직임을 쓴다. 대상 블로그 서비스의 자동화 관련 약관·정책과 맞는지 확인 필요 | `blog-writer:server/browser/runner.ts:58-63`, `blog-writer:server/browser/mouse.ts:1-74` | [[_system/known-issues]] | resolved (2026-10-05) — 현재 설정 유지, 약관 확인은 사용자 책임으로 기록 |
| 5 | 화면 문구 | 막힌 블로그 목록은 모두 "자동 조작으로 진행"으로 표시하지만 네이버+macOS는 평소 크롬 경로를 쓴다 | `blog-writer:src/BlockedSites.tsx:30` | [[publishing/business-rules/BR-PUB-003 입력 경로 선택과 막힌 사이트 기억]] | resolved (2026-10-05) — 실제 경로로 표시 |
| 6 | 동작 확인 | "다시 임시저장"은 이전 임시저장 글을 갱신하지 않고 새 글을 하나 더 만든다. 블로그에 임시저장 글이 쌓이는 것이 의도인가? | `blog-writer:src/job/NextStep.tsx:123` | [[publishing/business-rules/BR-PUB-001 발행하지 않고 임시저장까지만]] | resolved (2026-10-05) — 동작 유지, 화면에 안내 추가 (워드프레스는 2026-10-07부터 같은 글 갱신) |
| 7 | 의도 불명 | 발행 완료 글에서 이미지를 다시 만들면 상태가 초안 완료로 돌아가 발행 완료 표시가 풀린다. 유지가 의도인가? | `blog-writer:server/pipeline.ts:189-189` | [[publishing/business-rules/BR-PUB-013 발행 완료 표시]] | resolved (2026-10-05) — 초안 완료로 돌아가는 것이 의도 |
| 8 | 의도 불명 | 워드프레스에 자동발행해 사이트에서 실제로 공개된 글도 "발행 완료 취소"로 `posted`(임시저장 완료)가 된다. 사이트의 글은 공개된 채라 앱 표시와 실제가 달라진다. 워드프레스 기록이 있는 글은 취소를 막아야 하는가? | `blog-writer:server/routes/jobs.ts:147-151`, `blog-writer:src/job/NextStep.tsx:92-115` | [[publishing/business-rules/BR-PUB-013 발행 완료 표시]] | open |
| 9 | 안정성 | 막힌 사이트 파일(`data/blocked-sites.json`)은 다른 저장 파일과 달리 임시 파일에 쓴 뒤 바꾸는 방식이 아니고, 읽기-수정-쓰기도 줄 세우지 않는다. 쓰는 도중 서버가 죽으면 파일이 깨져 빈 목록으로 읽힌다 | `blog-writer:server/browser/blockedSites.ts:28-33` | [[publishing/entities/막힌 사이트]] | open — 2026-10-07 리팩터링에서 동작 유지로 남김 |
| 10 | 화면 처리 | Claude in Chrome이 로그인 화면에서 멈춘 경우(`BlogLoginRequired`)를 다른 실패와 구분하지 않아, 화면에 로그인 안내 상자를 따로 띄우지 않는다(자동 조작 실패만 로그 문구로 판단해 로그인 창 상자를 띄움) | `blog-writer:server/browser/blogPost.ts:116`, `:206`, `blog-writer:src/job/JobDetail.tsx:203-212` | [[publishing/business-rules/BR-PUB-012 로그인 화면이면 멈춤]] | open |
