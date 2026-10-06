---
type: implementation
domain: image
project: blog-writer
paths: [server/images/**, shared/imageErrors.ts, shared/types.ts, server/schema.ts, server/pipeline.ts, server/routes/images.ts, server/routes/jobs.ts, src/job/**, src/NewJob.tsx, tests/**]
last_ingested_commit: 스냅샷 2026-10-07 (git 없음)
updated: 2026-10-07
---
# blog-writer의 image 구현

## 파일과 역할
| 파일 | 함수/컴포넌트 | 구현하는 규칙/엔티티 |
|---|---|---|
| `shared/types.ts` | `STYLES_BY_PROVIDER`(9-13), `MAX_BODY_IMAGES`(15), `ImageScope`(17-19), 이미지 키 `bodyImageKey`·`imageKey`·`bodyIndexOf`(21-27), `ImageOptions`(29-40), `fitStyle`(42-44), `aiFor`(46-51), `ImageSpec`(149-167) | BR-IMG-001, 002, 003, 009, [[image/entities/ImageSpec]] |
| `shared/imageErrors.ts` | `IMAGE_ERROR_KINDS`(2-17), `IMAGE_ERROR_INFO`(25-79), `classifyImageError`(86-104) | [[image/business-rules/BR-IMG-007 이미지 실패 격리와 원인 분류]] |
| `server/schema.ts` | `ImageSpecShape`(5-17), `ImageOptionsSchema`(43-59), 작성 스키마의 이미지 블록 순서(137-141) | BR-IMG-002, 004, 005 |
| `server/writer.ts` | `STYLE_GUIDE`(34-42), `imageInstructions`(44-84), `enforceImageOptions`(266-274) | BR-IMG-001, 004, 005 |
| `server/pipeline.ts` | `runImages`·`doImages`(121-160), `makeImages`(162-187), `makeImagesInner`(189-259) | [[image/flows/이미지 생성 플로우]], BR-IMG-003, 004, 006 |
| `server/images/index.ts` | `collectTargets`(15-27), `record`(31-58), `generateImages`(64-120). 파일 이름은 `imageKey`+시각 | BR-IMG-007, 009 |
| `server/images/plan.ts` | `planImages`(67-113), `bodyOutline`(46-65) | [[image/business-rules/BR-IMG-004 본문 기반 이미지 기획]] |
| `server/images/svg.ts` | `validateSvg`(29-36), `generateSvgImage`(39-80) | [[image/business-rules/BR-IMG-011 SVG 안전 검증과 크기]] |
| `server/images/webAi.ts` | `generateWithWebAi`(174-271), `findNewDownload`(121-146), `fetchImage`(158-173) | [[_system/integrations/gemini-chatgpt-web]] |
| `server/images/styles.ts` | `STYLE_PROMPT`(7-15), `styledPrompt`(17-19) | BR-IMG-002 |
| `server/images/errors.ts` | `ImageGenError`(4-12), `errorKindOf`(14-15) | BR-IMG-007 |
| `server/routes/images.ts` | `regenerate-images`(14-67), 한 장 다시 만들기(69-99), 직접 올리기(101-138), 이미지 파일(140-146) | BR-IMG-002, 009, 010 |
| `server/routes/jobs.ts` | `keepImageResults`(17-39), 초안 저장에서 호출(84-97) | [[image/business-rules/BR-IMG-008 이미지 결과는 서버 기록 우선]] |
| `src/NewJob.tsx` | 이미지 옵션(143-189), `AiRows`(202-253) | [[image/entities/ImageOptions]] |
| `src/job/images.tsx` | `imageSpecs`(9-12), `kindOf`(14-16), `FailedPlaceholder`(20-38), `AiPicker`(40-78), `ImageFailures`(80-154), `ImageTools`(165-224), `PreviewImage`(226-259) | BR-IMG-002, 007, 009, 010, 012 |
| `src/job/PostEditor.tsx` | `ImageEditor`(57-116), 블록 삭제(132-136) | BR-IMG-005, 006 |
| `src/job/JobDetail.tsx` | 이미지 도구 연결(113-148), 썸네일 추가(278-297), 실패 안내 표시(299-306) | BR-IMG-009, 012 |
| `tests/shared.test.ts` | `fitStyle`·`aiFor`·이미지 키·`classifyImageError` 테스트 | BR-IMG-002, 003, 007 |
| `tests/api.test.ts` | 한 장 다시 만들기·직접 올리기 입력 검사, 미리보기 경로 제한 테스트 | BR-IMG-002, 010 |

모듈 페이지: [[_system/modules/server-images]], [[_system/modules/server-routes]], [[_system/modules/web-job]].

## 다른 도메인과의 접점
- 처음 이미지 블록 배치·초기 prompt는 글 작성 프롬프트 → [[writing/flows/초안 작성 플로우]].
- 웹 AI 이미지와 블로그 입력은 같은 크롬 큐 → [[publishing/business-rules/BR-PUB-004 크롬 작업 직렬화]].
- 워드프레스 API 등록은 만든 이미지 파일을 사이트 미디어로 올리고, 다시 등록할 때는 이미 올린 미디어를 재사용한다 → [[publishing/overview]].
- 블로그 입력은 `file`이 있는 이미지만 올림 → [[publishing/business-rules/BR-PUB-008 생성되지 않은 이미지 건너뜀]].
- 기획·SVG는 `images` 단계, 웹 AI는 `browser` 단계 모델 → [[usage/business-rules/BR-USG-001 단계별 추천 모델]].
