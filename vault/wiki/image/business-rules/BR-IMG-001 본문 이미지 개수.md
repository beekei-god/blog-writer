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
  - blog-writer:server/writer.ts:enforceImageOptions
  - blog-writer:server/routes/images.ts:POST /api/jobs/:id/images
entities: [이미지 옵션]
updated: 2026-11-02
---
# BR-IMG-001 본문 이미지 개수

## 규칙
본문 이미지는 0~6장(`MAX_BODY_IMAGES`)이다. 사용자가 고른 개수를 모델이 어겨도 서버가 지킨다: 이미지 블록이 더 많으면 앞에서부터 고른 개수만 남기고, 적게 만들어졌으면 그만큼만 글에 들어가며 "N개 중 M개만 만들어졌습니다"를 알린다. 이미지를 고르지 않으면(썸네일 꺼짐 + 0장) 이미지 지시 자체를 프롬프트에 넣지 않는다. 이미지는 서로 다른 소제목 섹션 안, 설명하는 문단 바로 뒤에 두고 첫/마지막 블록과 "참고 자료" 섹션에는 두지 않는다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 모델이 개수보다 많이 만듦 | 앞에서부터 고른 개수만 남김 |
| 모델이 적게 만듦 | 만든 만큼만, 로그로 알림 |
| 썸네일 꺼짐 | 모델이 낸 썸네일 정보를 버림(`thumbnail: undefined`) |
| 사용자가 자리 추가 | 6장이면 400 "본문 이미지는 최대 6장입니다" |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 공용 | `MAX_BODY_IMAGES` | 6 | `blog-writer:shared/types.ts:15` |
| 프롬프트 | `imageInstructions` | 위치·개수 지시 | `blog-writer:server/writer.ts:100-150` |
| 서버 | `enforceImageOptions` | 개수 강제 | `blog-writer:server/writer.ts` |
| 서버 | 자리 추가 라우트 | 최대 6 검사 | `blog-writer:server/routes/images.ts` |
| 화면 | 이미지 개수 선택 | 0~6 | [[_system/modules/web-screens]] |
| 테스트 | "앞에서부터 정한 개수만 남기고" | | `blog-writer:tests/writer.test.ts:29-48` |

## 예외 / 경계값 · 변경 시 같이 볼 곳
- 최대 개수를 바꾸면 `shared/types.ts`, 라우트 검사, 화면 선택지, 위 테스트를 함께 본다.

## 영향받는 플로우
[[writing/flows/초안 작성]], [[image/flows/이미지 생성]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-11-02 | wiki 재생성 때 코드(73f47a6) 기준으로 작성 | 코드 |
