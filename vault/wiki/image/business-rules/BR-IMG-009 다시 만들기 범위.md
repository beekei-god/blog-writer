---
type: business-rule
domain: image
id: BR-IMG-009
name: 다시 만들기 범위
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:shared/types.ts:21-33
  - blog-writer:server/images/index.ts:18-30
  - blog-writer:server/routes/images.ts:15-106
  - blog-writer:server/pipeline.ts:149-246
  - blog-writer:src/job/JobDetail.tsx:127-143
  - blog-writer:src/job/JobDetail.tsx:278-296
  - blog-writer:src/job/images.tsx:168-241
entities: [ImageSpec, ImageOptions]
updated: 2026-10-09
---
# BR-IMG-009 다시 만들기 범위

## 규칙
이미지를 다시 만들 때는 범위를 고른다: 전부(`all`), 아직 파일이 없는 것만(`failed`), 썸네일만(`thumbnail`), 본문 한 장(`body-<블록 번호>`). 썸네일 옵션이 꺼져 있으면 썸네일은 대상이 아니다.

## 조건과 결과
| 화면 동작 | API | 범위 | 이미지 옵션 변경 |
|---|---|---|---|
| 이미지 하나의 "이미지 다시 생성"(실패했거나 파일이 있는 이미지) / "이미지 생성"(아직 없는 이미지) → 스타일 / 만드는 곳 / 만드는 방법(Gemini·ChatGPT만)을 한 줄씩 고르고 "이미지 다시 만들기"(또는 "이미지 만들기") | `images/:target/regenerate` `{provider, style, method}` | thumbnail / body-n | **저장 안 함** (AI·화풍·방법 모두 이번 실행만). 썸네일인데 옵션이 꺼져 있으면 켬. `method`는 [[image/business-rules/BR-IMG-013 이미지 API 우선과 만드는 방법 선택]] |
| "썸네일이 없습니다" → 스타일 → AI 고르고 "썸네일 만들기" | `regenerate-images` `{thumbnailProvider, thumbnailStyle, onlyFailed, addThumbnail}` | thumbnail | `thumbnail: true`, 썸네일 AI·화풍 저장, 기본 썸네일 spec 생성. 방법은 고르지 않고 글에 저장된 썸네일 방법을 씀 |
| (API만) 실패한 것 | `regenerate-images` `{provider?, style?, onlyFailed: true}` | failed | 준 값만 저장 (화면에서 쓰는 곳은 없어짐, 2026-10-08) |
| (API만) 전부 | `regenerate-images` `{}` | all | 준 값만 저장 |

| 조건 | 결과 |
|---|---|
| 대상 0개 | 아무것도 안 하고 로그 ("다시 만들 실패한 이미지가 없습니다." 등) |
| 대상 있음 | 상태 `generating_images`, `generatingImages`(대상 키), `regeneratingImages`(이미 파일이 있던 대상)에 이번 대상을 더하고 끝나면 이번 대상만 뺀다 (한 장씩 동시에 만들 수 있어서) → [[image/business-rules/BR-IMG-014 한 장씩 다시 만들기 동시 실행]] |
| 한 장 대상이 없음(블록이 이미지가 아님) | 404 "다시 만들 이미지를 찾지 못했습니다. 화면을 새로고침해 주세요." |

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 공용 | `ImageScope`, `ImageMethod`, 이미지 키 만들기·읽기 `bodyImageKey`·`imageKey`·`bodyIndexOf` (서버 범위 판정·진행 표시·API 대상 검사가 같이 씀) | `blog-writer:shared/types.ts:21-33` |
| 서버 | `collectTargets` | `blog-writer:server/images/index.ts:18-30` |
| 서버 API | 두 엔드포인트 | `blog-writer:server/routes/images.ts:15-106` |
| 서버 파이프라인 | `runImages`(작업 잠금)·`runImage`(한 장), `makeImages` 진행 표시 | `blog-writer:server/pipeline.ts:149-246` |
| 테스트 | 이미지 키 해석(`body-x`, 경로 섞인 값은 null), 대상 없음 404 | `blog-writer:tests/shared.test.ts:81-89`, `blog-writer:tests/api.test.ts:129-133` |
| 화면 | 썸네일 없음 안내, 이미지별 도구("이미지 다시 생성") | `blog-writer:src/job/JobDetail.tsx:278-296`, `blog-writer:src/job/images.tsx:168-241` |

## 예외 / 경계값
- 다시 만들면 새 파일명(`<key>-<timestamp>`)으로 저장하고, 저장·기록이 끝난 뒤 그 이미지 자리의 예전 파일을 지운다 (2026-10-05 변경, `removeImageFile`). 생성이 실패하면 기록에서 파일 참조가 사라지고 예전 파일은 지워지지 않는다(고아 파일로 남음).
- `failed` 범위는 "에러가 있는 것"이 아니라 "파일이 없는 것"이다. 한 번도 안 만든 이미지도 포함된다.

## 영향받는 플로우
[[image/flows/이미지 다시 만들기 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-05 | 교체 시 예전 이미지 파일 삭제 | `blog-writer:server/images/index.ts:31-51`, `blog-writer:server/store.ts:81-83` |
| 2026-10-07 | 리팩터링: 코드 위치 이동 (`server/index.ts` → `server/routes/images.ts`, 화면 → `src/job/`), `body-<n>` 처리를 공용 함수로 합침. 동작 변화 없음 | `blog-writer:shared/types.ts:24-30` |
| 2026-10-08 | 위쪽 "실패한 N개를 ○○로 다시 만들기" 안내 삭제 → 실패하면 이미지마다 "이미지 다시 생성"으로 한 장씩. 버튼 문구 "다시 만들기…/만들기…" → "이미지 다시 생성/이미지 생성"(실패한 이미지도 "다시"). 한 장 요청에 `method`(api/chrome) 추가, 한 장씩 동시 실행 | 커밋 38ae96c |
| 2026-10-09 | 이미지 다시 생성 창: AI 고르기 + API/크롬 두 버튼 → 스타일 / 만드는 곳 / 만드는 방법 한 줄씩 + 버튼 하나. "썸네일이 없습니다"의 고르기 순서가 스타일 → AI(스타일은 버튼). 범위·저장 여부는 그대로 | 커밋 65bfa3e, `blog-writer:src/job/images.tsx:168-211`, `blog-writer:src/job/JobDetail.tsx:278-296` |
