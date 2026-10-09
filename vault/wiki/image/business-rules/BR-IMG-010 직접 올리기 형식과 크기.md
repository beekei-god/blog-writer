---
type: business-rule
domain: image
id: BR-IMG-010
name: 직접 올리기 형식과 크기
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/routes/images.ts:112-137
  - blog-writer:src/job/images.tsx:228-251
entities: [ImageSpec]
updated: 2026-10-09
---
# BR-IMG-010 직접 올리기 형식과 크기

## 규칙
사용자는 썸네일이나 본문 이미지 자리에 자기 이미지를 직접 올릴 수 있다. PNG·JPG·WEBP·GIF만, 20MB 이하, 작업이 진행 중이 아닐 때만.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| Content-Type이 png/jpeg/webp/gif가 아니거나 본문이 비었음 | 400 "PNG, JPG, WEBP, GIF 이미지만 올릴 수 있습니다." |
| 20MB 초과 | body-parser 413 → "요청 형식이 올바르지 않습니다." |
| 진행 중 | 409 |
| 자리가 없음 | 404 "이미지를 넣을 자리를 찾지 못했습니다…" |
| 성공 | `<target>-upload-<timestamp>.<ext>` 저장, `file` 교체, 오류 3필드 삭제, 로그 "…직접 올린 이미지로 바꿨습니다." |

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 서버 | 형식·크기·대상 검사 | `blog-writer:server/routes/images.ts:112-137` |
| 서버 | 기록·예전 파일 삭제는 생성 결과와 같은 `recordImageFile`(`record`) | `blog-writer:server/images/index.ts:34-57` |
| 화면 | 파일 선택 `accept` 같은 4형식 | `blog-writer:src/job/images.tsx:243` |
| 테스트 | 형식 아님 400, 자리 없음 404 | `blog-writer:tests/api.test.ts:167-173` |

## 예외 / 경계값
- 업로드에 성공하면 그 자리의 예전 이미지 파일을 지운다 (2026-10-05 변경).
- 업로드는 `userEdited`·prompt를 바꾸지 않는다. 나중에 "다시 만들기"를 하면 업로드 이미지가 새 생성 이미지로 바뀐다.

## 영향받는 플로우
[[image/flows/이미지 다시 만들기 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-05 | 교체 시 예전 이미지 파일 삭제 | `blog-writer:server/routes/images.ts:133` |
| 2026-10-07 | 리팩터링: 코드 위치 이동 (`server/index.ts` → `server/routes/images.ts`). 동작 변화 없음 | |
| 2026-10-09 | 리팩터링: 업로드 기록을 이미지 생성과 같은 기록 함수(`recordImageFile`)로 합침. 동작 변화 없음 | 커밋 65bfa3e |
