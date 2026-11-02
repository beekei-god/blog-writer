---
type: system-api
project: blog-writer
source:
  - blog-writer:server/app.ts:1-44
  - blog-writer:server/routes/jobs.ts
  - blog-writer:server/routes/images.ts
  - blog-writer:server/routes/settings.ts
updated: 2026-11-02
---
# API (로컬 HTTP)

모두 `127.0.0.1:5172`의 `/api/*`. 모양은 `server/routes/*.ts`의 zod 검사가 기준이다. 오류는 `{ error: "한국어 메시지" }`.

## 글(작업) — `routes/jobs.ts`
| 메서드 경로 | 하는 일 | 관련 |
|---|---|---|
| GET `/api/jobs`, GET `/api/jobs/:id` | 목록·상세 | [[writing/entities/작업]] |
| POST `/api/jobs` | 작업 만들기(주제, 이미지/분량·말투, 링크) → 초안 작성 시작(201) | [[writing/flows/초안 작성]] |
| PUT `/api/jobs/:id/post` | 초안 저장(진행 중이면 409, 이미지 결과 보존) | [[image/business-rules/BR-IMG-008 실패 기록과 계속 진행]] |
| POST `/api/experience-draft` | 리뷰 경험 메모 초안 | [[writing/business-rules/BR-WRT-003 글 형식과 경험 메모]] |
| POST `/api/jobs/:id/titles` | 제목 후보 다시 만들기 | [[writing/flows/제목 후보 다시 만들기]] |
| POST `/api/jobs/:id/post-to-blog` | 블로그에 올리기(202) | [[publishing/flows/블로그에 올리기]] |
| PUT `/api/jobs/:id/blogs/:platform/status` | 블로그별 상태 수동 표시 | [[publishing/business-rules/BR-PUB-009 수동 상태 표시와 목록 필터]] |
| POST `/api/jobs/:id/cancel`, `/retry`; DELETE `/api/jobs/:id` | 중지·다시 시도·삭제 | |
| GET `/api/jobs/:id/usage` | 글 단위 사용량 | [[usage/business-rules/BR-USG-003 호출 기록과 보관]] |

## 고치기 — `routes/edit.ts`
POST `/api/jobs/:id/edit`, POST `…/edit/apply`, DELETE `…/edit` → [[writing/flows/프롬프트로 글 고치기]]

## 이미지 — `routes/images.ts`
| 경로 | 하는 일 |
|---|---|
| POST `/api/jobs/:id/regenerate-images` | 전체/실패만/썸네일 만들기 |
| POST `/api/jobs/:id/images/:target/regenerate` | 한 장 다시 만들기 |
| POST `/api/jobs/:id/images/:target` | 직접 올리기(바이너리) |
| POST `/api/jobs/:id/images` | 본문 이미지 자리 추가 |
| DELETE `/api/jobs/:id/images/:target` | 삭제 |
| GET `/api/images/:id/:file` | 미리보기 파일 |

## 설정·연결 — `routes/settings.ts`, `browser.ts`, `categories.ts`, `claudeAuth.ts`
`/api/settings`, `/api/rules`(+`/reset`), `/api/datalab`, `/api/searchad`, `/api/image-api[/:ai]`, `/api/wordpress`(조회·저장·삭제, 비밀은 돌려주지 않음), `/api/chrome-extension`(+`/check`, `/open-options`), `/api/blocked-sites`, `/api/browser/login`(+`/close`), `/api/categories/:platform`(+`/refresh`), `/api/claude/auth`(+`/login`, `/cancel`).

## 추천·키워드·사용량
`/api/recommendations`(GET/POST, `/:id/cancel`, DELETE), `/api/keywords?q=`, `/api/usage`(+`/check`) → [[topic/overview]], [[usage/overview]]
