---
type: module
project: blog-writer
module: server-routes
paths: [server/routes/**]
source:
  - blog-writer:server/app.ts
  - blog-writer:server/routes/util.ts
  - blog-writer:server/routes/jobs.ts
updated: 2026-11-02
---
# server-routes (HTTP 라우트)

## 역할
요청 검사(zod)와 상태 확인 후, 작업은 백그라운드로 시작하고 202를 돌려준다. 전체 목록은 [[_system/api]].

## 주요 파일과 export
`jobs.ts`(작업·제목·올리기·상태), `edit.ts`, `images.ts`, `settings.ts`(설정·규칙·키), `browser.ts`(확장·차단·로그인 창), `categories.ts`, `recommendations.ts`, `keywords.ts`, `usage.ts`, `claudeAuth.ts`, `util.ts`(`wrap`, `markBusy`, `wordpressStatus`)

## 의존하는 모듈 / 쓰이는 곳
`pipeline.ts`, `store.ts`, `schema.ts` 등. `app.ts`가 라우터 배열로 등록한다.

## 주의할 점
- 검사 메시지가 사용자에게 그대로 보이는 한국어 문구다(문구를 바꾸면 테스트 `tests/api.test.ts`가 깨질 수 있다).
- 이미지 업로드만 `express.raw`(20MB)이고 나머지는 JSON 2MB.
- `PUT /post`는 화면의 낡은 초안이 서버가 기록한 이미지 결과를 덮어쓰지 않게 `keepImageResults`를 거친다 → [[image/business-rules/BR-IMG-008 실패 기록과 계속 진행]]
