---
type: business-rule
domain: image
id: BR-IMG-001
name: 본문 이미지 개수
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:shared/types.ts:15
  - blog-writer:server/schema.ts:46
  - blog-writer:src/NewJob.tsx:70
  - blog-writer:src/NewJob.tsx:152-168
  - blog-writer:server/writer.ts:74-81
  - blog-writer:server/writer.ts:266-274
entities: [ImageOptions, ImageSpec]
updated: 2026-10-07
---
# BR-IMG-001 본문 이미지 개수

## 규칙
본문 이미지는 0~6장이다. 사용자가 정한 개수보다 많이 만들지 않고, 썸네일을 끈 글에는 썸네일을 두지 않는다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 개수 0이고 썸네일 끔 | 프롬프트: 이미지 넣지 말 것 |
| 개수 N>0 | 프롬프트: 서로 다른 소제목 섹션 안, 설명 문단 바로 뒤에 **정확히 N개**. 첫·마지막 블록과 참고 자료 섹션 금지 |
| 모델이 N개보다 많이 만듦 | 서버가 앞에서 N개만 남기고 나머지 image 블록 삭제 |
| 모델이 N개보다 적게 만듦 | 그대로 두고(추가 생성 없음) 로그 "본문 이미지 N개 중 M개만 만들어졌습니다…" (2026-10-05 추가) |
| 썸네일 끔 | 모델이 썸네일을 냈어도 삭제 |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 공용 상수 | `MAX_BODY_IMAGES` | 6 | `blog-writer:shared/types.ts:15` |
| 서버 검증 | `ImageOptionsSchema.bodyImages` | 정수 0~6 | `blog-writer:server/schema.ts:46` |
| 화면 | 스테퍼 | 0~6 | `blog-writer:src/NewJob.tsx:70`, `:152-168` |
| 프롬프트(작성) | 위치·개수 지시 | 정확히 N | `blog-writer:server/writer.ts:74-81` |
| 서버(작성 후) | `enforceImageOptions` | 초과분 삭제 | `blog-writer:server/writer.ts:266-274` |

## 예외 / 경계값
- 편집 화면에서 이미지 블록을 지울 수는 있지만 추가할 수는 없다 (`blog-writer:src/job/PostEditor.tsx:132-136`).
- 썸네일이 없는 글에 나중에 썸네일만 추가할 수 있다 → [[image/business-rules/BR-IMG-009 다시 만들기 범위]].

## 영향받는 플로우
[[writing/flows/초안 작성 플로우]], [[image/flows/이미지 생성 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-05 | 이미지가 부족하면 채우지 않고 로그로 안내하기로 결정 | `blog-writer:server/writer.ts:167-172` |
