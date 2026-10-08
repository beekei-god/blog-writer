---
type: open-questions
domain: writing
updated: 2026-10-07
---
# 확인이 필요한 질문

| # | 종류 | 내용 | 근거 | 관련 페이지 | 상태 |
|---|---|---|---|---|---|
| 1 | 레이어 불일치 | 태그 최대 30개: 서버 저장 검증은 30, 편집 화면은 제한 없음. 31개째에서 자동 저장이 원인 모를 오류로 실패한다. 화면에서 막을지, 서버가 잘라 받을지? | `blog-writer:server/schema.ts:22`, `blog-writer:src/job/PostEditor.tsx:8-47` | [[writing/business-rules/BR-WRT-004 태그 최대 30개]] | resolved (2026-10-05) — 화면에서 30개에서 입력을 막음 |
| 2 | 규칙 충돌 | 스마트블록 주제 태그: 기본 글쓰기 규칙은 권장, 글 작성 프롬프트는 금지, 서버는 거르지 않음. 어느 쪽이 맞는가? 규칙 문서를 고칠지, 서버가 그 출처 태그를 뺄지? | `blog-writer:rules/default-writing-rules.md:33-36`, `blog-writer:server/writer.ts:31` | [[writing/business-rules/BR-WRT-006 스마트블록 주제 태그 금지]] | resolved (2026-10-05) — 금지로 통일 (규칙 문서 수정, 서버 제거) |
| 3 | 의도 불명 | 글자수 계산 주석은 "줄바꿈은 세지 않는다"인데 문단 안 `\n`은 1자로 센다. 의도는 블록 사이 줄바꿈만 뺀다는 것인가? | `blog-writer:shared/length.ts:8-12` | [[writing/business-rules/BR-WRT-002 본문 글자수 계산]] | resolved (2026-10-05) — 줄바꿈은 세지 않도록 수정 |
| 4 | 레이어 불일치 | 표 빈 칸 행 제거는 작성 직후에만 한다. 사용자가 편집에서 만든 빈 칸·"-"는 그대로 블로그에 들어간다. 의도된 허용인가? | `blog-writer:server/writer.ts:166`, `blog-writer:src/job/PostEditor.tsx:49-55` | [[writing/business-rules/BR-WRT-007 빈 칸 있는 표 행 제거]] | resolved (2026-10-05) — 저장(PUT)에서도 정리 |
| 5 | 레이어 불일치 | 주제 300자 상한·링크 형식/개수는 서버만 검사하고, 300자 초과 시 오류 문구가 "2자 이상 입력하세요"로 나온다 | `blog-writer:server/routes/jobs.ts:53-64` | [[writing/business-rules/BR-WRT-010 주제와 참고 링크 입력 검증]] | resolved (2026-10-05) — 주제 300자 상한을 화면에도 적용, 오류 문구 분리 (링크 형식·개수도 화면에서 검사하도록 수정) |
| 6 | 의도 불명 | 사용자가 태그를 편집하면 `tagDetails`(근거 표)는 갱신되지 않는다. 근거 표를 "작성 당시 기록"으로 보는 것이 의도인가? | `blog-writer:src/job/PostEditor.tsx:146`, `blog-writer:src/job/Report.tsx:56-80` | [[writing/business-rules/BR-WRT-005 태그 출처 검증]] | resolved (2026-10-05) — 작성 당시 기록으로 두고 화면에 표시 |
| 7 | 의도 불명 | 분량 3,000자 초과 초안도 임시저장을 막지 않는다 (경고만). 의도된 것인가? | `blog-writer:src/job/JobDetail.tsx:270-273` | [[writing/business-rules/BR-WRT-001 본문 분량 상한]] | resolved (2026-10-05) — 경고만이 의도 |
| 8 | 의도 불명 | 워드프레스에 예약발행한 글(`scheduled`, 예약됨)은 예약 시각이 지나도 앱이 상태를 바꾸지 않는다. 사용자가 "발행 완료로 표시"해야 목록 필터에서 발행 완료로 보인다. 사이트 상태를 다시 확인해 자동으로 바꿀지, 지금처럼 수기로 둘지? | `blog-writer:server/pipeline.ts:335-339`, `blog-writer:server/routes/jobs.ts:147-151` | [[writing/entities/Job]], [[publishing/business-rules/BR-PUB-013 발행 완료 표시]] | open (2026-10-07) |

> 2026-10-07: 해결된 질문의 근거 경로는 파일 분리(`server/index.ts` → `server/routes/*`, `src/JobDetail.tsx` → `src/job/*`) 뒤의 현재 위치로 바꿨다.
