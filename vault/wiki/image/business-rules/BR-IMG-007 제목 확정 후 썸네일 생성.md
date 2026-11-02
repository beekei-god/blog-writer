---
type: business-rule
domain: image
id: BR-IMG-007
name: 제목 확정 후 썸네일 생성
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:src/job/JobDetail.tsx:307-330
  - blog-writer:server/routes/images.ts:addThumbnail
  - blog-writer:server/images/index.ts:record
entities: [이미지 명세, 이미지 옵션]
updated: 2026-11-02
---
# BR-IMG-007 제목 확정 후 썸네일 생성

## 규칙
썸네일은 글을 처음 쓸 때 만들지 않는다(새 작업 폼에 썸네일 체크박스가 없다). 사용자가 제목을 정한 뒤 초안 화면의 **"이 제목으로 썸네일 만들기"** 버튼을 눌러야 만든다. 썸네일을 만들 때의 제목을 `madeForTitle`에 기록하고, 이후 제목을 바꾸면 **"이 제목으로 썸네일 다시 만들기"**를 안내한다(자동으로 다시 만들지 않는다).

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 썸네일 없음, 작업 중 아님 | "썸네일이 없습니다" 안내 + 만들기 버튼 |
| 썸네일 있고 `madeForTitle` ≠ 현재 제목 | "제목이 바뀌었습니다" 안내 + 다시 만들기 |
| 버튼(`addThumbnail`) | `imageOptions.thumbnail=true`, 기본 썸네일 정보(제목·요약 기반) 넣고 `thumbnail` 범위로 생성, 만드는 AI·방법도 고름 |
| 생성 성공 | `file`과 `madeForTitle` 기록, 오류 지움 |
| 사용자가 직접 올린 썸네일 | 파일만 기록(`madeForTitle`은 그대로) |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 화면 | 썸네일 안내 배너 | 없음/제목 변경 두 경우 | `blog-writer:src/job/JobDetail.tsx:307` |
| 화면 | 새 작업 폼에서 썸네일 체크 제거 | | `blog-writer:src/NewJob.tsx` |
| 서버 | `regenerate-images` `addThumbnail` | 기본 정보 생성 후 `runImages(thumbnail)` | `blog-writer:server/routes/images.ts` |
| 서버 | `record` | `madeForTitle` 기록 | `blog-writer:server/images/index.ts` |
| 공용 | `ImageSpec.madeForTitle` | | `blog-writer:shared/types.ts:203` |
| 테스트 | 썸네일 추가 때도 방법(크롬/API) 선택 | | `blog-writer:tests/imageParallel.test.ts:151`, `tests/api.test.ts` |

## 예외 / 경계값 · 변경 시 같이 볼 곳
- `madeForTitle`이 없는 예전 썸네일은 제목이 바뀌어도 안내하지 않는다(조건이 `madeForTitle && …`).
- 정책을 되돌려 "처음부터 같이 만들기"로 가려면 폼, 파이프라인(`doDraft`의 옵션), 글 작성 프롬프트의 썸네일 지시를 모두 본다.

## 영향받는 플로우
[[image/flows/제목 확정 후 썸네일 만들기]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-11-02 | wiki 재생성 때 코드(73f47a6) 기준으로 작성. 이 정책은 73f47a6에서 도입 | 코드 |
