---
type: business-rule
domain: image
id: BR-IMG-008
name: 실패 기록과 계속 진행
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/images/index.ts:generateImages
  - blog-writer:shared/imageErrors.ts
  - blog-writer:server/routes/jobs.ts:keepImageResults
entities: [이미지 명세, 이미지 오류 종류]
updated: 2026-11-02
---
# BR-IMG-008 실패 기록과 계속 진행

## 규칙
이미지 한 장이 실패해도 글 전체는 실패시키지 않는다. 실패한 이미지는 `error`·`errorKind`·`errorProvider`와 함께 기록하고 나머지를 계속 만든다. **사용자의 중지는 실패로 기록하지 않고** 이미 만든 이미지는 그대로 둔다. 새 이미지가 기록된 뒤에만 예전 파일을 지운다. 화면이 예전 초안을 저장해도 서버가 기록한 이미지 결과(파일·오류)를 덮어쓰지 않는다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 생성 실패 | 파일 지움 + 오류 기록, 로그 "생성 실패 — 제목: 첫 줄" |
| 중지(`CancelledError`) | 실패 기록 없음 |
| 범위 `failed` | 파일 없는 이미지만 다시 만듦 |
| 초안 저장(`PUT /post`) | 같은 이미지(프롬프트 같거나, 개수가 같으면 같은 순서)의 file·error는 서버 값 유지 |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 서버 | `generateImages`의 `fail`, `record` | | `blog-writer:server/images/index.ts` |
| 서버 | `keepImageResults` | 저장 때 결과 보존 | `blog-writer:server/routes/jobs.ts:20-40` |
| 공용 | `IMAGE_ERROR_INFO`, `classifyImageError` | 안내 문구 | `blog-writer:shared/imageErrors.ts` |
| 화면 | 이미지별 오류 안내와 다시 만들기 | | [[_system/modules/web-job]] |
| 테스트 | 중지 시 동시 이미지 모두 멈춤 | | `blog-writer:tests/imageParallel.test.ts:99` |

## 예외 / 경계값 · 변경 시 같이 볼 곳
- 새 오류 종류는 `IMAGE_ERROR_KINDS`, `IMAGE_ERROR_INFO`, `classifyImageError`, 던지는 곳을 함께 고친다.

## 영향받는 플로우
[[image/flows/이미지 생성]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-11-02 | wiki 재생성 때 코드(73f47a6) 기준으로 작성 | 코드 |
