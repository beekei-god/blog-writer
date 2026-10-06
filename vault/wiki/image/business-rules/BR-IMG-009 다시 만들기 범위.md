---
type: business-rule
domain: image
id: BR-IMG-009
name: 다시 만들기 범위
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:shared/types.ts:17-19
  - blog-writer:server/images/index.ts:15-27
  - blog-writer:server/routes/images.ts:14-99
  - blog-writer:server/pipeline.ts:162-187
  - blog-writer:src/job/JobDetail.tsx:278-307
entities: [ImageSpec, ImageOptions]
updated: 2026-10-07
---
# BR-IMG-009 다시 만들기 범위

## 규칙
이미지를 다시 만들 때는 범위를 고른다: 전부(`all`), 아직 파일이 없는 것만(`failed`), 썸네일만(`thumbnail`), 본문 한 장(`body-<블록 번호>`). 썸네일 옵션이 꺼져 있으면 썸네일은 대상이 아니다.

## 조건과 결과
| 화면 동작 | API | 범위 | 이미지 옵션 변경 |
|---|---|---|---|
| "실패한 N개를 ○○로 다시 만들기" | `regenerate-images` `{provider, style, onlyFailed: true}` | failed | provider·style 저장 |
| "썸네일 만들기" (썸네일 없는 글) | `regenerate-images` `{thumbnailProvider, thumbnailStyle, onlyFailed, addThumbnail}` | thumbnail | `thumbnail: true`, 썸네일 AI 저장, 기본 썸네일 spec 생성 |
| 이미지 하나의 "다시 만들기…/만들기…" | `images/:target/regenerate` `{provider, style}` | thumbnail / body-n | **저장 안 함** (이번 실행만). 썸네일인데 옵션이 꺼져 있으면 켬 |
| (API만) 전부 | `regenerate-images` `{}` | all | 준 값만 저장 |

| 조건 | 결과 |
|---|---|
| 대상 0개 | 아무것도 안 하고 로그 ("다시 만들 실패한 이미지가 없습니다." 등) |
| 대상 있음 | 상태 `generating_images`, `generatingImages`(대상 키), `regeneratingImages`(이미 파일이 있던 대상) 기록 → 끝나면 지움 |
| 한 장 대상이 없음(블록이 이미지가 아님) | 404 "다시 만들 이미지를 찾지 못했습니다. 화면을 새로고침해 주세요." |

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 공용 | `ImageScope`, 이미지 키 만들기·읽기 `bodyImageKey`·`imageKey`·`bodyIndexOf` (서버 범위 판정·진행 표시·API 대상 검사가 같이 씀) | `blog-writer:shared/types.ts:17-27` |
| 서버 | `collectTargets` | `blog-writer:server/images/index.ts:15-27` |
| 서버 API | 두 엔드포인트 | `blog-writer:server/routes/images.ts:14-99` |
| 서버 파이프라인 | `makeImages` 진행 표시 | `blog-writer:server/pipeline.ts:162-187` |
| 테스트 | 이미지 키 해석(`body-x`, 경로 섞인 값은 null), 대상 없음 404 | `blog-writer:tests/shared.test.ts:75-83`, `blog-writer:tests/api.test.ts:114-118` |
| 화면 | 썸네일 없음 안내, 실패 안내, 이미지별 도구 | `blog-writer:src/job/JobDetail.tsx:278-307`, `blog-writer:src/job/images.tsx:166-224` |

## 예외 / 경계값
- 다시 만들면 새 파일명(`<key>-<timestamp>`)으로 저장하고, 저장·기록이 끝난 뒤 그 이미지 자리의 예전 파일을 지운다 (2026-10-05 변경, `removeImageFile`). 생성이 실패하면 기록에서 파일 참조가 사라지고 예전 파일은 지워지지 않는다(고아 파일로 남음).
- `failed` 범위는 "에러가 있는 것"이 아니라 "파일이 없는 것"이다. 한 번도 안 만든 이미지도 포함된다.

## 영향받는 플로우
[[image/flows/이미지 다시 만들기 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-05 | 교체 시 예전 이미지 파일 삭제 | `blog-writer:server/images/index.ts:31-58`, `blog-writer:server/store.ts:85-87` |
| 2026-10-07 | 리팩터링: 코드 위치 이동 (`server/index.ts` → `server/routes/images.ts`, 화면 → `src/job/`), `body-<n>` 처리를 공용 함수로 합침. 동작 변화 없음 | `blog-writer:shared/types.ts:21-27` |
