---
type: module
project: blog-writer
module: server-core
paths: [server/writer.ts, server/research.ts, server/titles.ts, server/titleGuide.ts, server/editPost.ts, server/experience.ts, server/naver.ts, server/naverTopic.ts, server/rules.ts, server/schema.ts, server/store.ts, server/cancel.ts, server/fsutil.ts, server/secrets.ts, server/categories.ts, server/app.ts, server/index.ts]
source:
  - blog-writer:server/writer.ts
  - blog-writer:server/store.ts
  - blog-writer:server/schema.ts
updated: 2026-11-02
---
# server-core (글쓰기 프롬프트·저장·공통)

## 역할
글을 만드는 프롬프트와 후처리(검사·보정), 작업·설정 저장, 중지·파일·비밀 유틸.

## 주요 파일과 export
| 파일 | export |
|---|---|
| `writer.ts` | `writePost`, `enforceTone`, `enforceLength`, `verifyTagSources`, `isCompleteTable`, `stripUpdateLines`, `enforceImageOptions`, `TONE_GUIDE`, `FORMAT_GUIDE`, `STYLE_GUIDE`, `THUMBNAIL_*`, `BODY_HEADLINE_RULE` |
| `research.ts` | `deepResearch` |
| `titles.ts`, `titleGuide.ts` | `regenerateTitles`, `TITLE_TECHNIQUES` |
| `editPost.ts` | `proposeEdit`, `applyProposal`, `EDIT_PROMPT_MAX` |
| `experience.ts` | `draftExperienceMemo` |
| `naver.ts`, `naverTopic.ts` | 자동완성·함께 많이 찾는, 네이버 주제 선택 |
| `rules.ts` | `getRules`, `saveRules`, `resetRules`, `kstDate`, `todayKST` |
| `schema.ts` | zod: `PostSchema`, `ImageOptionsSchema`, `WritingOptionsSchema`, `BlogCategorySchema` |
| `store.ts` | `DATA_DIR`, 작업·설정 읽기/쓰기, `migrateJob`, `recoverStuckJobs`, 이미지 경로 |
| `cancel.ts` | `withCancel`, `cancelJob`, `throwIfCancelled`, `CancelledError` |
| `fsutil.ts` | 원자적 쓰기, `serialQueue`, `keyedQueue` |
| `secrets.ts` | 비밀 키 읽기/쓰기 |
| `categories.ts` | 카테고리 기억 |

## 의존하는 모듈 / 쓰이는 곳
`claude.ts`([[_system/modules/server-claude]])를 호출하고, `pipeline.ts`와 라우트가 쓴다. `shared/`의 판정 함수를 사용한다.

## 주의할 점
- `writer.ts`가 이미지 지시 상수를 내보내 `images/plan.ts`가 같은 문구를 쓴다(한쪽만 바꾸지 말 것) → [[image/business-rules/BR-IMG-005 이미지 기획과 문구]]
- 도메인: [[writing/implementations/blog-writer 구현]]
