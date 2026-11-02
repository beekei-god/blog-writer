---
type: business-rule
domain: image
id: BR-IMG-010
name: 이미지 한 장씩 다시 만들기
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/pipeline.ts:runImage
  - blog-writer:server/routes/images.ts:regenerate
  - blog-writer:server/cancel.ts
entities: [이미지 명세]
updated: 2026-11-02
---
# BR-IMG-010 이미지 한 장씩 다시 만들기

## 규칙
이미지 한 장(썸네일 또는 `body-<블록 번호>`)을 다른 AI·스타일로 다시 만들 수 있다. 고른 AI·스타일은 이번에만 쓰고 글의 이미지 설정은 바꾸지 않는다. 다른 이미지를 한 장씩 다시 만드는 중이어도 받아서 **동시에** 만든다. 같은 이미지를 또 요청하거나 다른 단계(전체 재생성, 초안 수정)가 도는 중이면 거절한다. 중지하면 동시에 도는 이미지를 모두 멈춘다. 동시에 도는 모든 이미지가 끝나야 작업이 초안 상태로 돌아온다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 같은 이미지가 만드는 중 | 409 "이미 진행 중입니다" |
| 다른 단계가 도는 중 | 409 |
| 대상이 글에 없음 | 404 "다시 만들 이미지를 찾지 못했습니다" |
| 허용 안 되는 AI·스타일 조합 | 400 → [[image/business-rules/BR-IMG-002 AI별 허용 스타일]] |
| 썸네일 꺼진 채 썸네일 다시 만들기 | 썸네일을 켬 |
| 크롬 방식 | 브라우저 큐로 한 장씩 |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 서버 | `runImage`, `isImageBusy`, `imageRuns` | 동시 실행 관리 | `blog-writer:server/pipeline.ts:243-` |
| 서버 | 취소 | 작업당 여러 `AbortController` | `blog-writer:server/cancel.ts` |
| 서버 | 라우트 | 검사 | `blog-writer:server/routes/images.ts` |
| 테스트 | API 두 장 동시, 중복 요청 무시, 중지 | | `blog-writer:tests/imageParallel.test.ts` |

## 예외 / 경계값 · 변경 시 같이 볼 곳
- 본문 이미지의 키는 블록 번호라서 블록이 추가·삭제되면 번호가 밀린다. 그래서 자리 추가·삭제는 어떤 작업이든 진행 중이면 막는다. → [[image/business-rules/BR-IMG-011 이미지 직접 올리기 삭제 자리 추가]]

## 영향받는 플로우
[[image/flows/이미지 생성]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-11-02 | wiki 재생성 때 코드(73f47a6) 기준으로 작성 | 코드 |
