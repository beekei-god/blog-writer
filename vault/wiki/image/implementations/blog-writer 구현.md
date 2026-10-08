---
type: implementation
domain: image
project: blog-writer
paths: [server/images/**, server/cancel.ts, server/secrets.ts, server/routes/settings.ts, src/ImageApiSettings.tsx, shared/imageErrors.ts, shared/types.ts, server/schema.ts, server/pipeline.ts, server/routes/images.ts, server/routes/jobs.ts, src/job/**, src/NewJob.tsx, tests/**]
last_ingested_commit: 38ae96c
updated: 2026-10-08
---
# blog-writer의 image 구현

## 파일과 역할
| 파일 | 함수/컴포넌트 | 구현하는 규칙/엔티티 |
|---|---|---|
| `shared/types.ts` | `STYLES_BY_PROVIDER`(8-12), `MAX_BODY_IMAGES`(15), `ImageScope`(17-19), `ImageMethod`(21-22), 이미지 키 `bodyImageKey`·`imageKey`·`bodyIndexOf`(24-30), `ImageOptions`(32-43), `fitStyle`(45-47), `aiFor`(49-54), `ImageSpec`(152-170), Job의 `generatingImages`·`regeneratingImages`·`imageRunsOnly`(260-265) | BR-IMG-001, 002, 003, 009, 013, [[image/entities/ImageSpec]] |
| `shared/imageErrors.ts` | `IMAGE_ERROR_KINDS`(2-18, 14종), `IMAGE_ERROR_INFO`(26-84), `classifyImageError`(91-109) | [[image/business-rules/BR-IMG-007 이미지 실패 격리와 원인 분류]] |
| `server/schema.ts` | `ImageSpecShape`(5-17), `ImageOptionsSchema`(43-59), 작성 스키마의 이미지 블록 순서(137-141) | BR-IMG-002, 004, 005 |
| `server/writer.ts` | `STYLE_GUIDE`(34-42), `imageInstructions`(44-84), `enforceImageOptions`(266-274) | BR-IMG-001, 004, 005 |
| `server/pipeline.ts` | `imageRuns`·`isRunning`·`isImageBusy`(29-40), `runImages`(131-147), `runImage`(149-173), `imagesStep`(175-197), `makeImages`(199-228, 진행 표시는 더하고 빼기), `makeImagesInner`(230-304; 크롬 큐 판단 286-298) | [[image/flows/이미지 생성 플로우]], BR-IMG-003, 004, 006, 013, 014 |
| `server/images/index.ts` | `collectTargets`(18-30), `record`(34-61), `generateImages`(67-133; API/크롬 선택 120-132) | BR-IMG-007, 009, 013 |
| `server/images/api.ts` | `apiError`(25-40), `call`(42-56), `generateWithApi`(63-115), `testImageApiKey`(117-126) | [[_system/integrations/image-api]], BR-IMG-007, 013 |
| `server/images/plan.ts` | `planImages`(67-113), `bodyOutline`(46-65) | [[image/business-rules/BR-IMG-004 본문 기반 이미지 기획]] |
| `server/images/svg.ts` | `validateSvg`(29-36), `generateSvgImage`(39-80) | [[image/business-rules/BR-IMG-011 SVG 안전 검증과 크기]] |
| `server/images/webAi.ts` | `downloadScript`(62-94), `findNewDownload`(127-150), `fetchImage`(162-177), `generateWithWebAi`(180-265; failed여도 폴더 먼저 확인 249-258) | [[_system/integrations/gemini-chatgpt-web]] |
| `server/images/styles.ts` | `STYLE_PROMPT`(7-15), `styledPrompt`(17-19), `imageRequest`(21-40, API·크롬 공용 요청문) | BR-IMG-002, 005 |
| `server/images/errors.ts` | `ImageGenError`(4-12), `errorKindOf`(14-15) | BR-IMG-007 |
| `server/secrets.ts` | `getImageApiKey`(83-88, 환경변수 우선)·`saveImageApiKey`(90-93) | BR-IMG-013 |
| `server/routes/images.ts` | `regenerate-images`(14-67), 한 장 다시 만들기(69-106, 동시 허용), 직접 올리기(108-147), 이미지 파일(149-155) | BR-IMG-002, 009, 010, 014 |
| `server/routes/settings.ts` | 이미지 API 키 `GET/PUT/DELETE /api/image-api`(91-125) | BR-IMG-013 |
| `server/routes/jobs.ts` | `keepImageResults`(17-39), 초안 저장에서 호출(84-97) | [[image/business-rules/BR-IMG-008 이미지 결과는 서버 기록 우선]] |
| `server/cancel.ts` | 작업마다 여러 중지 신호 `withCancel`·`cancelJob`(15-33) | BR-IMG-014 |
| `src/NewJob.tsx` | 이미지 옵션(143-189), `AiRows`(202-253) | [[image/entities/ImageOptions]] |
| `src/job/images.tsx` | `kindOf`·`reasonOf`(9-13), `FailedPlaceholder`(17-35, 실제 이유와 안내), `useImageApi`(37-44), `AiPicker`(46-80), `MakeButtons`(82-127, API 버튼 비활성+툴팁), `ImageTools`(137-196, "이미지 다시 생성"), `PreviewImage`(198-231, 만드는 중인 이미지는 도구 숨김) | BR-IMG-002, 007, 009, 010, 013, 014 |
| `src/ImageApiSettings.tsx` | 설정 화면 "이미지 API 설정" 카드 | BR-IMG-013 |
| `src/job/PostEditor.tsx` | `ImageEditor`(57-116), 블록 삭제(132-136) | BR-IMG-005, 006 |
| `src/job/JobDetail.tsx` | 이미지 도구 연결(129-146, 한 장씩 만드는 중이면 다른 이미지 도구 사용 가능), 썸네일 추가(278-296) | BR-IMG-009, 014 |
| `tests/shared.test.ts` | `fitStyle`·`aiFor`·이미지 키·`classifyImageError` 테스트 | BR-IMG-002, 003, 007 |
| `tests/webAi.test.ts` | 웹 AI가 `failed`로 보고해도 다운로드 폴더의 이번 이미지는 회수, 없으면 `ui_changed` (크롬·Claude 호출은 mock) | BR-IMG-007 |
| `tests/imageApi.test.ts` | 키 있으면 API·없으면 크롬, 크롬 선택, 한도·거절·잘못된 키는 크롬으로 넘기지 않고 실패, 키 값은 화면에 안 돌려줌 | BR-IMG-007, 013 |
| `tests/imageParallel.test.ts` | 한 장씩 다시 만들기 동시 실행·같은 이미지 무시·중지·진행 중 요청 409 | BR-IMG-014 |
| `tests/api.test.ts` | 한 장 다시 만들기·직접 올리기 입력 검사, 미리보기 경로 제한 테스트 | BR-IMG-002, 010 |

모듈 페이지: [[_system/modules/server-images]], [[_system/modules/server-routes]], [[_system/modules/web-job]], [[_system/modules/web-screens]]. 외부 연동: [[_system/integrations/image-api]], [[_system/integrations/gemini-chatgpt-web]].

## 다른 도메인과의 접점
- 처음 이미지 블록 배치·초기 prompt는 글 작성 프롬프트 → [[writing/flows/초안 작성 플로우]].
- 크롬에서 만드는 웹 AI 이미지와 블로그 입력은 같은 크롬 큐 (API로 만드는 이미지는 줄 서지 않음) → [[publishing/business-rules/BR-PUB-004 크롬 작업 직렬화]].
- 한 장씩 다시 만들기는 작업 실행 잠금의 예외 → [[writing/business-rules/BR-WRT-011 작업 중복 실행과 진행 중 변경 금지]].
- 워드프레스 API 등록은 만든 이미지 파일을 사이트 미디어로 올리고, 다시 등록할 때는 이미 올린 미디어를 재사용한다 → [[publishing/overview]].
- 블로그 입력은 `file`이 있는 이미지만 올림 → [[publishing/business-rules/BR-PUB-008 생성되지 않은 이미지 건너뜀]].
- 기획·SVG는 `images` 단계, 웹 AI는 `browser` 단계 모델 → [[usage/business-rules/BR-USG-001 단계별 추천 모델]].
