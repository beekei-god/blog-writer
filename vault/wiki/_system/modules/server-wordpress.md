---
type: module
project: blog-writer
module: server-wordpress
paths: [server/wordpress.ts]
source:
  - blog-writer:server/wordpress.ts:1-326
updated: 2026-11-02
---
# server-wordpress

## 역할
워드프레스 REST API 클라이언트: 연결 확인, 카테고리, 이미지 업로드, 태그, 글 등록·갱신 → [[publishing/business-rules/BR-PUB-006 워드프레스 등록 규칙]]

## 주요 파일과 export
`normalizeSite`, `wordpressSiteOf`, `testWordPress`, `listCategories`, `postToBlocks`, `checkSchedule`, `publishToWordPress`, `WordPressError`

## 의존하는 모듈 / 쓰이는 곳
`pipeline.ts`(`doWordPressPost`)와 `routes/jobs.ts`·`settings.ts`가 쓴다. 인증은 `secrets.ts`.

## 주의할 점
- 오류 메시지에 비밀번호가 들어가지 않는다(테스트로 확인).
- `/wp-json`이 없으면 `?rest_route=`로 재시도한다.
