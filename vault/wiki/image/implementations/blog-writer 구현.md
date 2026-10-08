---
type: implementation
domain: image
project: blog-writer
paths: [server/images/**, server/cancel.ts, server/store.ts, server/secrets.ts, server/routes/settings.ts, src/ImageApiSettings.tsx, shared/imageErrors.ts, shared/types.ts, server/schema.ts, server/pipeline.ts, server/routes/images.ts, server/routes/jobs.ts, src/job/**, src/NewJob.tsx, tests/**]
last_ingested_commit: 65bfa3e
updated: 2026-10-09
---
# blog-writer의 image 구현

## 파일과 역할
| 파일 | 함수/컴포넌트 | 구현하는 규칙/엔티티 |
|---|---|---|
| `shared/types.ts` | `STYLES_BY_PROVIDER`(9-13), `MAX_BODY_IMAGES`(15), `ImageScope`(21-22), `ImageMethod`(24-25), 이미지 키 `bodyImageKey`·`imageKey`·`bodyIndexOf`(27-33), `ImageOptions`(35-50, `method`·`thumbnailMethod` 포함), `fitStyle`(52-54), `aiFor`(56-61), `methodFor`(63-65), `ImageSpec`(163-181), `imageSpecAt`·`imageSpecsOf`(224-233, 키로 이미지 찾기·글의 모든 이미지), Job의 `generatingImages`·`regeneratingImages`·`imageRunsOnly`(288-293) | BR-IMG-001, 002, 003, 009, 013, [[image/entities/ImageSpec]], [[image/entities/ImageOptions]] |
| `shared/imageErrors.ts` | `IMAGE_ERROR_KINDS`(2-18, 15종), `IMAGE_ERROR_INFO`(27-90), `SITE_ERROR`(94), `classifyImageError`(98-118) | [[image/business-rules/BR-IMG-007 이미지 실패 격리와 원인 분류]] |
| `server/schema.ts` | `ProviderEnum`·`StyleEnum`·`MethodEnum`(5-7), `ImageSpecShape`(9-21), `ImageOptionsSchema`(47-65), 작성 스키마의 이미지 블록 순서(143-147) | BR-IMG-002, 004, 005, 013 |
| `server/writer.ts` | `STYLE_GUIDE`(35-43), `imageInstructions`(45-85), `enforceImageOptions`(271-278) | BR-IMG-001, 004, 005 |
| `server/pipeline.ts` | `NO_IMAGES`·`optionsOf`(27-28), `imageRuns`·`isRunning`·`isImageBusy`(47-58), `runImages`(149-165), `runImage`(167-191), `imagesStep`(193-215, 한 장이면 AI·화풍·방법을 이번 실행만 덮어씀), `makeImages`(217-246, 진행 표시는 더하고 빼기), `makeImagesInner`(248-317; 크롬 큐 판단 301-313) | [[image/flows/이미지 생성 플로우]], BR-IMG-003, 004, 006, 013, 014 |
| `server/images/index.ts` | `collectTargets`(18-30), `record`(34-54), `recordImageFile`(56-57, 직접 올리기도 같은 기록), `generateImages`(59-124; `methodFor`로 API/크롬 선택 110-123) | BR-IMG-007, 009, 010, 013 |
| `server/images/api.ts` | `apiError`(25-40), `call`(42-56), `saveImageFile`(63-69, 크롬 URL 회수도 사용), `generateWithApi`(71-120), `testImageApiKey`(122-131) | [[_system/integrations/image-api]], BR-IMG-007, 013 |
| `server/images/plan.ts` | `planImages`(67-113), `bodyOutline`(46-65) | [[image/business-rules/BR-IMG-004 본문 기반 이미지 기획]] |
| `server/images/svg.ts` | `validateSvg`(29-36), `generateSvgImage`(39-80) | [[image/business-rules/BR-IMG-011 SVG 안전 검증과 크기]] |
| `server/images/webAi.ts` | `downloadScript`(61-97, 내부 전용), `findNewDownload`(127-151), `fetchImage`(162-175), `generateWithWebAi`(178-267; failed여도 폴더 먼저 확인 246-254, 사이트 오류면 `site_error` 255-259), 결과 지시 프롬프트(209-212) | [[_system/integrations/gemini-chatgpt-web]], BR-IMG-007 |
| `server/images/styles.ts` | `STYLE_PROMPT`(7-15)·`styledPrompt`(17-19) 내부 전용, `imageRequest`(21-40, API·크롬 공용 요청문) | BR-IMG-002, 005 |
| `server/images/errors.ts` | `ImageGenError`(4-12), `errorKindOf`(14-15) | BR-IMG-007 |
| `server/secrets.ts` | `getImageApiKey`(76-81, 환경변수 우선)·`saveImageApiKey`(83-86) | BR-IMG-013 |
| `server/store.ts` | `jobImageDir`·`jobImagePath`(77-79, 파일명은 basename), `removeImageFile`(82-83) | BR-IMG-009 |
| `server/routes/images.ts` | `regenerate-images`(15-68), 한 장 다시 만들기(70-107, 동시 허용, `method`), 직접 올리기(109-134), 이미지 파일(136-142) | BR-IMG-002, 009, 010, 013, 014 |
| `server/routes/settings.ts` | 이미지 API 키 `GET/PUT/DELETE /api/image-api`(91-125) | BR-IMG-013 |
| `server/routes/jobs.ts` | 새 작업 이미지 옵션 검증·설정에 기억(43-70), `keepImageResults`(17-39), 초안 저장에서 호출(84-98) | [[image/entities/ImageOptions]], [[image/business-rules/BR-IMG-008 이미지 결과는 서버 기록 우선]] |
| `server/cancel.ts` | 작업마다 여러 중지 신호 `withCancel`·`cancelJob`(15-33) | BR-IMG-014 |
| `src/NewJob.tsx` | 이미지 옵션 상태·저장값 읽기(`touched`)·썸네일/본문 따로 바꾸기(44-86), 이미지 카드(154-216: 썸네일 묶음, 본문 묶음, "본문 이미지와 같게 하기"), `AiRows`(229-274, 스타일→AI→방법) | [[image/entities/ImageOptions]], BR-IMG-001, 002, 003, 013 |
| `src/job/images.tsx` | `kindOf`·`reasonOf`(9-17), `FailedPlaceholder`(20-38, 실제 이유와 안내), `useImageApi`(40-47), `hasImageApi`·`noImageApiReason`(49-57), `StylePicker`(59-80), `ProviderPicker`(82-93), `AiPicker`(95-111, 스타일→AI), `shownMethod`(113-115), `MethodPicker`(117-147, API 버튼 비활성+툴팁), `RegenRow`(149-157), `ImageTools`(159-241, "이미지 다시 생성" 창·버튼 하나), `PreviewImage`(243-276, 만드는 중인 이미지는 도구 숨김) | BR-IMG-002, 007, 009, 010, 013, 014 |
| `src/ImageApiSettings.tsx` | 설정 화면 "이미지 API 설정" 카드 | BR-IMG-013 |
| `src/job/PostEditor.tsx` | `ImageEditor`(58-117), 블록 삭제(133-136) | BR-IMG-005, 006 |
| `src/job/JobDetail.tsx` | 이미지 다시 만들기·도구 연결(113-143, 한 장씩 만드는 중이면 다른 이미지 도구 사용 가능), 썸네일 추가(278-297, `AiPicker`) | BR-IMG-009, 014 |
| `tests/shared.test.ts` | `fitStyle`·`aiFor`·`methodFor`·이미지 키·`classifyImageError`(사이트 오류 포함) 테스트 | BR-IMG-002, 003, 007, 013 |
| `tests/webAi.test.ts` | 웹 AI가 `failed`로 보고해도 다운로드 폴더의 이번 이미지는 회수, 사이트 오류면 `site_error`, 없으면 `ui_changed` (크롬·Claude 호출은 mock) | BR-IMG-007 |
| `tests/imageApi.test.ts` | 키 있으면 API·없으면 크롬, 크롬 선택, 썸네일 크롬 + 본문 API, 한도·거절·잘못된 키는 크롬으로 넘기지 않고 실패, 키 값은 화면에 안 돌려줌 | BR-IMG-007, 013 |
| `tests/imageParallel.test.ts` | 한 장씩 다시 만들기 동시 실행·같은 이미지 무시·중지·진행 중 요청 409 | BR-IMG-014 |
| `tests/api.test.ts` | 한 장 다시 만들기·직접 올리기 입력 검사, 미리보기 경로 제한 테스트(128-145) | BR-IMG-002, 010 |

모듈 페이지: [[_system/modules/server-images]], [[_system/modules/server-routes]], [[_system/modules/web-job]], [[_system/modules/web-screens]]. 외부 연동: [[_system/integrations/image-api]], [[_system/integrations/gemini-chatgpt-web]].

## 다른 도메인과의 접점
- 처음 이미지 블록 배치·초기 prompt는 글 작성 프롬프트 → [[writing/flows/초안 작성 플로우]].
- 크롬에서 만드는 웹 AI 이미지와 블로그 입력은 같은 크롬 큐 (API로 만드는 이미지는 줄 서지 않음) → [[publishing/business-rules/BR-PUB-004 크롬 작업 직렬화]].
- 한 장씩 다시 만들기는 작업 실행 잠금의 예외 → [[writing/business-rules/BR-WRT-011 작업 중복 실행과 진행 중 변경 금지]].
- 워드프레스 API 등록은 만든 이미지 파일을 사이트 미디어로 올리고, 다시 등록할 때는 이미 올린 미디어를 재사용한다 → [[publishing/overview]].
- 블로그 입력은 `file`이 있는 이미지만 올림 → [[publishing/business-rules/BR-PUB-008 생성되지 않은 이미지 건너뜀]].
- 기획·SVG는 `images` 단계, 웹 AI는 `browser` 단계 모델 → [[usage/business-rules/BR-USG-001 단계별 추천 모델]].
