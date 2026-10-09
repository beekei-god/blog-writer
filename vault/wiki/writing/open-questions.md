---
type: open-questions
domain: writing
updated: 2026-10-09
---
# 확인이 필요한 질문

| # | 종류 | 내용 | 근거 | 관련 페이지 | 상태 |
|---|---|---|---|---|---|
| 1 | 레이어 불일치 | 태그 최대 30개: 서버 저장 검증은 30, 편집 화면은 제한 없음. 31개째에서 자동 저장이 원인 모를 오류로 실패한다. 화면에서 막을지, 서버가 잘라 받을지? | `blog-writer:server/schema.ts:26`, `blog-writer:src/job/PostEditor.tsx:9-48` | [[writing/business-rules/BR-WRT-004 태그 최대 30개]] | resolved (2026-10-05) — 화면에서 30개에서 입력을 막음 |
| 2 | 규칙 충돌 | 스마트블록 주제 태그: 기본 글쓰기 규칙은 권장, 글 작성 프롬프트는 금지, 서버는 거르지 않음. 어느 쪽이 맞는가? 규칙 문서를 고칠지, 서버가 그 출처 태그를 뺄지? | `blog-writer:rules/default-writing-rules.md:33-36`, `blog-writer:server/writer.ts:31` | [[writing/business-rules/BR-WRT-006 스마트블록 주제 태그 금지]] | resolved (2026-10-05) — 금지로 통일 (규칙 문서 수정, 서버 제거) |
| 3 | 의도 불명 | 글자수 계산 주석은 "줄바꿈은 세지 않는다"인데 문단 안 `\n`은 1자로 센다. 의도는 블록 사이 줄바꿈만 뺀다는 것인가? | `blog-writer:shared/length.ts:8-12` | [[writing/business-rules/BR-WRT-002 본문 글자수 계산]] | resolved (2026-10-05) — 줄바꿈은 세지 않도록 수정 |
| 4 | 레이어 불일치 | 표 빈 칸 행 제거는 작성 직후에만 한다. 사용자가 편집에서 만든 빈 칸·"-"는 그대로 블로그에 들어간다. 의도된 허용인가? | `blog-writer:server/writer.ts:166`, `blog-writer:src/job/PostEditor.tsx:50-56` | [[writing/business-rules/BR-WRT-007 빈 칸 있는 표 행 제거]] | resolved (2026-10-05) — 저장(PUT)에서도 정리 |
| 5 | 레이어 불일치 | 주제 300자 상한·링크 형식/개수는 서버만 검사하고, 300자 초과 시 오류 문구가 "2자 이상 입력하세요"로 나온다 | `blog-writer:server/routes/jobs.ts:54-65` | [[writing/business-rules/BR-WRT-010 주제와 참고 링크 입력 검증]] | resolved (2026-10-05) — 주제 300자 상한을 화면에도 적용, 오류 문구 분리 (링크 형식·개수도 화면에서 검사하도록 수정) |
| 6 | 의도 불명 | 사용자가 태그를 편집하면 `tagDetails`(근거 표)는 갱신되지 않는다. 근거 표를 "작성 당시 기록"으로 보는 것이 의도인가? | `blog-writer:src/job/PostEditor.tsx:151`, `blog-writer:src/job/Report.tsx:56-80` | [[writing/business-rules/BR-WRT-005 태그 출처 검증]] | resolved (2026-10-05) — 작성 당시 기록으로 두고 화면에 표시 |
| 7 | 의도 불명 | 분량 3,000자 초과 초안도 임시저장을 막지 않는다 (경고만). 의도된 것인가? | `blog-writer:src/job/JobDetail.tsx:285-288` | [[writing/business-rules/BR-WRT-001 본문 분량 상한]] | resolved (2026-10-05) — 경고만이 의도 |
| 8 | 의도 불명 | 블로그에 예약발행한 글(`scheduled`, 블로그 발행 예약)은 예약 시각이 지나도 앱이 상태를 바꾸지 않는다. 사용자가 글 상태를 "블로그 발행완료"로 골라야 한다. 2026-10-09부터 워드프레스뿐 아니라 네이버·티스토리 예약발행도 해당 (목록 필터에서는 발행 예약도 "발행 완료" 칩에 함께 보여 차이가 줄었다). 사이트 상태를 다시 확인해 자동으로 바꿀지, 지금처럼 수기로 둘지? | `blog-writer:server/pipeline.ts:408-412`, `:411-415`, `blog-writer:server/routes/jobs.ts:170-190`, `blog-writer:src/App.tsx:32` | [[writing/entities/Job]], [[publishing/business-rules/BR-PUB-013 발행 완료 표시]] | open (2026-10-07) |

| 9 | 의도 불명 | 네이버·티스토리 예약발행·자동발행 중, 임시저장은 끝났고 발행 창 단계를 진행하는 사이에 사용자가 중지하면 `CancelledError`로 처리되어 상태가 **초안 검토(draft_ready)** 로 돌아간다. 블로그에는 임시저장 글이 남아 있는데 앱은 올리기 전 상태로 보인다. 발행 창에서 멈춘 경우(`PublishStepError`)처럼 블로그 임시저장 완료(posted)로 둘지? | `blog-writer:server/browser/publish.ts:319-362`, `blog-writer:server/pipeline.ts:479-491` | [[writing/business-rules/BR-WRT-012 중단 시 작업 상태 복구]], [[writing/entities/Job]] | open (2026-10-09) |
| 10 | 의도 불명 | 프롬프트로 글 고치기에서 편집 화면에서 **떨어진 블록**(예: #1, #5)을 고르면 범위는 최소~최대(#1~#5)가 되어 사이 블록도 함께 고쳐진다 (화면이 안내 문구로 알림). 고른 블록만 고치도록(여러 범위) 바꿀지, 지금처럼 둘지? | `blog-writer:src/job/EditByPrompt.tsx:13-14`, `:47`, `:79-83` | [[writing/business-rules/BR-WRT-016 프롬프트로 글 고치기]] | open (2026-10-09) |
| 11 | 의도 불명 | 고친 결과가 본문 3,000자 상한을 넘어도 적용할 수 있다 (비교 화면에 경고만, 적용 뒤 직접 줄이게 안내). 상한 초과 시 적용을 막거나 자동으로 줄일지? | `blog-writer:src/job/EditByPrompt.tsx:140-145`, `blog-writer:server/routes/edit.ts:34-55` | [[writing/business-rules/BR-WRT-016 프롬프트로 글 고치기]], [[writing/business-rules/BR-WRT-001 본문 분량 상한]] | open (2026-10-09) |
| 12 | 의도 불명 | 고친 결과(제안)를 만든 뒤 그 범위의 글이 바뀌면 적용을 409로 거절만 하고 자동으로 다시 만들지 않는다. 사용자가 같은 요청으로 직접 다시 만들어야 하는 것이 의도인가? | `blog-writer:server/editPost.ts:195-207`, `blog-writer:server/routes/edit.ts:51` | [[writing/business-rules/BR-WRT-017 고친 결과 적용 조건과 잠금]] | open (2026-10-09) |
| 13 | 검증 안 됨 | 프롬프트로 글 고치기는 실제 Claude로 써 보기 전이라 결과 품질(요청한 부분만 고치는지, 이미지 ref를 지키는지, 웹 검색으로 더한 사실의 정확성)을 확인하지 못했다. 테스트는 Claude 호출을 흉내 낸 것이다 | `blog-writer:tests/editPost.test.ts:5-30` | [[writing/business-rules/BR-WRT-016 프롬프트로 글 고치기]], [[writing/business-rules/BR-WRT-018 고칠 때 이미지는 그대로]] | open (2026-10-09) |

> 2026-10-07: 해결된 질문의 근거 경로는 파일 분리(`server/index.ts` → `server/routes/*`, `src/JobDetail.tsx` → `src/job/*`) 뒤의 현재 위치로 바꿨다.
