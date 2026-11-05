---
type: implementation
domain: writing
project: blog-writer
paths: [server/writer.ts, server/research.ts, server/titles.ts, server/titleGuide.ts, server/editPost.ts, server/experience.ts, server/naver.ts, server/rules.ts, server/schema.ts, server/store.ts, server/cancel.ts, server/routes/jobs.ts, server/routes/edit.ts, shared/length.ts, shared/keywords.ts, shared/tone.ts, shared/place.ts, shared/blockDiff.ts, rules/default-writing-rules.md]
last_ingested_commit: 73f47a6
updated: 2026-11-05
---
# blog-writer의 writing 구현

## 파일과 역할
| 파일 | 함수/컴포넌트 | 구현하는 규칙/엔티티 |
|---|---|---|
| `server/writer.ts` | `writePost`, `BASE_SYSTEM`, `TONE_GUIDE`, `FORMAT_GUIDE`, `enforceTone`, `enforceLength`, `verifyTagSources`, `isCompleteTable`, `stripUpdateLines`, `enforceImageOptions` | BR-WRT-001/002/003/005/006/007/013 |
| `server/research.ts` | `deepResearch` | [[writing/business-rules/BR-WRT-010 자료 조사]] |
| `server/titles.ts`, `server/titleGuide.ts` | `regenerateTitles`, `TITLE_TECHNIQUES` | [[writing/business-rules/BR-WRT-005 제목 후보와 후킹 기법]] |
| `server/editPost.ts` | `proposeEdit`, `applyProposal`, `rewriteSection`, `keywordSection` | BR-WRT-011/012 |
| `server/experience.ts` | `draftExperienceMemo` | [[writing/business-rules/BR-WRT-003 글 형식과 경험 메모]] |
| `server/naver.ts` | `collectNaverSuggestions` | [[writing/business-rules/BR-WRT-007 태그 수와 출처 확인]] |
| `server/rules.ts` | `getRules`, `saveRules`, `resetRules`, `todayKST` | [[writing/business-rules/BR-WRT-009 글쓰기 규칙 문서와 작업별 사본]] |
| `server/schema.ts` | `PostSchema`, `WritingOptionsSchema` | [[writing/entities/글]], [[writing/entities/글쓰기 옵션]] |
| `server/store.ts` | `createJob`, `updateJob`, `migrateJob`, `recoverStuckJobs` | [[writing/entities/작업]] |
| `server/pipeline.ts` | `runDraft`, `doDraft`, `startEdit` | [[writing/flows/초안 작성]] |
| `server/routes/jobs.ts`, `server/routes/edit.ts` | 작업·제목·경험 메모·고치기 API | 위 플로우 |
| `shared/length.ts` | 분량 상수·`countBodyChars` | BR-WRT-001 |
| `shared/keywords.ts` | `KEYWORD_RULES`, `keywordOveruse` | BR-WRT-004 |
| `shared/tone.ts` | `toneProblem` | BR-WRT-002 |
| `shared/place.ts` | `placeLines`, `placeSearchQuery` | BR-WRT-008 |
| `shared/blockDiff.ts` | `diffBlocks` | BR-WRT-011 |
| `rules/default-writing-rules.md` | 기본 글쓰기 규칙 | BR-WRT-006/007/009/013 |

## 테스트
| 테스트 파일 | 확인하는 것 | 규칙 |
|---|---|---|
| `tests/writer.test.ts` | 날짜 표시줄·표 정리·이미지 개수·태그 출처 | BR-WRT-006/007 |
| `tests/writingOptions.test.ts` | 분량·말투·형식·경험 메모·제목 기법·썸네일 문구·답 먼저 없음 | BR-WRT-001/002/003/005/013 |
| `tests/tone.test.ts` | 말투 판정 | BR-WRT-002 |
| `tests/keywords.test.ts` | 키워드 세기·초과 | BR-WRT-004 |
| `tests/titles.test.ts` | 제목 다시 만들기 | BR-WRT-005 |
| `tests/editPost.test.ts` | 고치기·적용·다시 쓰기 | BR-WRT-011/012 |
| `tests/place.test.ts` | 장소 블록 | BR-WRT-008 |
| `tests/store.test.ts` | 저장·마이그레이션 | 작업 |
