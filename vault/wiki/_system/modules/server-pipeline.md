---
type: module
project: blog-writer
module: server-pipeline
paths: [server/pipeline.ts]
source:
  - blog-writer:server/pipeline.ts:1-514
updated: 2026-11-02
---
# server-pipeline (작업 실행)

## 역할
글 작업의 단계를 백그라운드에서 실행하고 상태를 바꾼다.

## 주요 파일과 export
- `runDraft`/`doDraft`: 조사 → 쓰기 → 이미지 → 초안 → [[writing/flows/초안 작성]]
- `startEdit`/`doEdit`: 프롬프트로 고치기 → [[writing/flows/프롬프트로 글 고치기]]
- `runImages`(범위), `runImage`(한 장), `isImageBusy`, `makeImages` → [[image/flows/이미지 생성]]
- `runPost`, `doPost`, `doWordPressPost`, `setBlogStatus` → [[publishing/flows/블로그에 올리기]]
- `isRunning`, `enqueueBrowser`(직렬 큐), `failStep`, `requireDraft`

## 의존하는 모듈 / 쓰이는 곳
`writer`, `research`, `editPost`, `images`, `browser`, `wordpress`, `store`를 엮는다. 라우트가 `void run…()`으로 시작한다.

## 주의할 점
- 상태를 먼저 `markBusy`로 바꾼 뒤 실행해야 화면이 진행을 따라간다.
- 실패/중지는 `failStep`이 초안이 있으면 `draft_ready`로 돌린다. 중지는 오류로 남기지 않는다.
- 크롬을 쓰는 작업은 `enqueueBrowser`를 거쳐야 같은 크롬을 동시에 쓰지 않는다.
- 이미지 한 장씩 모드(`imageRuns`)는 다른 이미지와 동시 실행되고, 끝나야 초안 상태로 돌아온다.
