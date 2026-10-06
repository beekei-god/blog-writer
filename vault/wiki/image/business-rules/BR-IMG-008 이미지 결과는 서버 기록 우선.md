---
type: business-rule
domain: image
id: BR-IMG-008
name: 이미지 결과는 서버 기록 우선
status: active
confidence: high
consistency: single-source
source:
  - blog-writer:server/routes/jobs.ts:17-39
  - blog-writer:server/routes/jobs.ts:90-94
entities: [ImageSpec]
updated: 2026-10-07
---
# BR-IMG-008 이미지 결과는 서버 기록 우선

## 규칙
이미지 파일과 실패 기록(`file`, `error`, `errorKind`, `errorProvider`)은 서버가 정한다. 화면이 예전 초안을 저장해도 서버가 새로 만든 이미지 기록을 덮어쓰지 않는다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 초안 저장(PUT) 시 새 초안의 각 이미지(썸네일 + 본문 이미지 순서) | 서버 초안에서 **prompt가 같은** 이미지를 찾아 그 결과 4필드를 복사 |
| prompt가 같은 게 없고, 이미지 개수가 같음 | 같은 순서의 이미지 결과를 복사 |
| 둘 다 아님 | 화면이 보낸 값 그대로 |
| 서버 쪽 필드가 undefined | 그 필드 삭제 |

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 서버 | `keepImageResults`, 초안 저장(`PUT /api/jobs/:id/post`)에서 호출 | `blog-writer:server/routes/jobs.ts:20-39`, `:90-94` |

## 예외 / 경계값
- 사용자가 prompt를 고치고 이미지 개수가 달라지면(블록 삭제) 매칭이 안 될 수 있다. 그때는 화면 값(예전 file)이 저장된다.
- 화면에서 직접 `file`을 바꾸는 UI는 없다. 업로드는 별도 API가 기록한다.

## 영향받는 플로우
[[writing/flows/초안 편집과 자동 저장 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-07 | 리팩터링: 코드 위치 이동 (`server/index.ts` → `server/routes/jobs.ts`). 동작 변화 없음 | |
