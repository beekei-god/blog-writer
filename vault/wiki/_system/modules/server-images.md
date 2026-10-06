---
type: module
project: blog-writer
module: server-images
paths: [server/images/**]
source:
  - blog-writer:server/images/index.ts:1-120
  - blog-writer:server/images/plan.ts:1-113
  - blog-writer:server/images/svg.ts:1-80
  - blog-writer:server/images/webAi.ts:1-271
  - blog-writer:server/images/styles.ts:1-19
  - blog-writer:server/images/errors.ts:1-15
updated: 2026-10-07
---
# server-images 모듈

## 책임
썸네일·본문 이미지 만들기: 대상 고르기, 본문 기반 기획(설명·문구), Claude SVG→PNG 또는 Gemini/ChatGPT 웹 화면 조작, 결과·실패 기록.

## 파일
| 파일 | 줄 | 역할 | 주요 export | 관련 페이지 |
|---|---|---|---|---|
| `server/images/index.ts` | 120 | 범위(scope)별 대상 수집(`bodyIndexOf`), 파일 이름은 `imageKey`+시각, Claude 먼저·웹 AI 나중 순서로 생성, 결과/오류를 job에 바로 기록 | `collectTargets`, `countImages`, `generateImages`, `Target` | [[image/flows/이미지 생성 플로우]], [[image/business-rules/BR-IMG-009 다시 만들기 범위]] |
| `server/images/plan.ts` | 113 | 만들기 직전 본문을 다시 읽고 이미지마다 prompt·headline·basis를 정하는 Claude 호출 | `planImages`, `PlanTarget`, `PlanResult` | [[image/business-rules/BR-IMG-004 본문 기반 이미지 기획]] |
| `server/images/svg.ts` | 80 | Claude가 SVG를 그리고 헤드리스 크롬으로 PNG 스크린샷. SVG 안전 검증 | `generateSvgImage`, `ImageKind` | [[image/business-rules/BR-IMG-011 SVG 안전 검증과 크기]] |
| `server/images/webAi.ts` | 271 | Claude in Chrome으로 Gemini/ChatGPT 웹에서 이미지 생성, 입력·다운로드 스크립트, 다운로드 폴더에서 파일 회수 | `generateWithWebAi`, `insertScript`, `downloadScript`, `WebAi` | [[_system/integrations/gemini-chatgpt-web]] |
| `server/images/styles.ts` | 19 | 웹 AI에 붙일 영어 화풍 지시문 (쓰이지 않던 `STYLE_LABEL_KO`는 2026-10-07에 삭제) | `STYLE_PROMPT`, `styledPrompt` | [[image/business-rules/BR-IMG-002 AI별 허용 스타일]] |
| `server/images/errors.ts` | 15 | 원인을 아는 이미지 오류 클래스, 오류 → 원인 분류 | `ImageGenError`, `errorKindOf` | [[image/business-rules/BR-IMG-007 이미지 실패 격리와 원인 분류]] |

## 의존
- 사용하는 모듈: [[_system/modules/server-claude]], [[_system/modules/server-browser]] (`claudeChrome.ts`), [[_system/modules/server-pipeline]] (`STYLE_GUIDE`), [[_system/modules/server-core]], [[_system/modules/shared]]
- 사용되는 곳: [[_system/modules/server-pipeline]] (`makeImages`)
