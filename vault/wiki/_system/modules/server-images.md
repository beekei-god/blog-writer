---
type: module
project: blog-writer
module: server-images
paths: [server/images/**]
source:
  - blog-writer:server/images/index.ts
  - blog-writer:server/images/plan.ts
updated: 2026-11-02
---
# server-images (이미지 생성)

## 역할
이미지 대상 모으기, 기획, 생성(SVG/API/사이트), 결과 기록 → [[image/implementations/blog-writer 구현]]

## 주요 파일과 export
`index.ts`(`collectTargets`, `generateImages`, `recordImageFile`), `plan.ts`(`planImages`), `styles.ts`(`imageRequest`), `api.ts`(`generateWithApi`, `testImageApiKey`), `webAi.ts`(`generateWithWebAi`), `svg.ts`(`generateSvgImage`), `errors.ts`(`ImageGenError`, `errorKindOf`)

## 의존하는 모듈 / 쓰이는 곳
`pipeline.ts`가 부른다. `browser/claudeChrome.ts`, `claude.ts`, `secrets.ts`, `store.ts`를 쓴다. 공용 `imageErrors.ts`가 오류 분류를 제공한다.

## 주의할 점
- 결과는 장마다 즉시 작업 파일에 기록한다. 새 파일이 기록된 뒤에만 예전 파일을 지운다.
- Claude 이미지를 먼저, 웹 AI를 나중에 처리한다. API 실패는 크롬으로 자동 전환하지 않는다 → [[image/business-rules/BR-IMG-004 API와 크롬 생성 방법]]
