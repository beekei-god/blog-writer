---
type: implementation
domain: image
project: blog-writer
paths: [server/images/**, server/routes/images.ts, shared/imageErrors.ts, server/pipeline.ts, src/job/**]
last_ingested_commit: 73f47a6
updated: 2026-11-02
---
# blog-writer의 image 구현

## 파일과 역할
| 파일 | 함수/컴포넌트 | 구현하는 규칙/엔티티 |
|---|---|---|
| `shared/types.ts` | `ImageOptions`, `ImageSpec`, `STYLES_BY_PROVIDER`, `aiFor`, `methodFor`, `fitStyle`, `MAX_BODY_IMAGES`, 키 헬퍼 | [[image/entities/이미지 옵션]], BR-IMG-001/002/003 |
| `shared/imageErrors.ts` | `IMAGE_ERROR_INFO`, `classifyImageError` | [[image/entities/이미지 오류 종류]], BR-IMG-008 |
| `server/images/index.ts` | `collectTargets`, `generateImages`, `recordImageFile`, `record` | BR-IMG-003/004/008 |
| `server/images/plan.ts` | `planImages`, `bodyOutline` | [[image/business-rules/BR-IMG-005 이미지 기획과 문구]] |
| `server/images/styles.ts` | `imageRequest`, `STYLE_PROMPT` | BR-IMG-002/005 |
| `server/images/api.ts` | `generateWithApi`, `testImageApiKey`, `saveImageFile` | [[image/business-rules/BR-IMG-004 API와 크롬 생성 방법]] |
| `server/images/webAi.ts` | `generateWithWebAi` | BR-IMG-004 |
| `server/images/svg.ts` | `generateSvgImage`, `validateSvg` | BR-IMG-009 |
| `server/images/errors.ts` | `ImageGenError`, `errorKindOf` | BR-IMG-008 |
| `server/pipeline.ts` | `runImages`, `runImage`, `makeImages`, `isImageBusy` | BR-IMG-010 |
| `server/routes/images.ts` | 다시 만들기·한 장·올리기·자리 추가·삭제·미리보기 | BR-IMG-007/010/011 |
| `server/writer.ts` | `imageInstructions`, `enforceImageOptions`, `THUMBNAIL_*`, `BODY_HEADLINE_RULE`, `STYLE_GUIDE` | BR-IMG-001/006 |
| `src/job/JobDetail.tsx` 외 | 이미지 카드, 썸네일 안내 | BR-IMG-007 |

## 테스트
| 테스트 파일 | 확인하는 것 | 규칙 |
|---|---|---|
| `tests/imagePlan.test.ts` | 기획 프롬프트가 글 작성과 같은 문구 | BR-IMG-005/006 |
| `tests/imageApi.test.ts` | API/크롬 선택, 실패 분류, 키 저장 | BR-IMG-004 |
| `tests/imageParallel.test.ts` | 한 장씩 동시, 중복·중지, 요청 거절 | BR-IMG-010 |
| `tests/webAi.test.ts` | 크롬 방식의 성공/실패 판정 | BR-IMG-004 |
| `tests/writer.test.ts` | 이미지 개수 | BR-IMG-001 |
| `tests/svg.test.ts` | SVG 검증: 형식, 거절 요소 7종, 내부 참조 통과 | BR-IMG-009 |
