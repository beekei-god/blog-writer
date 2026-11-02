---
type: business-rule
domain: image
id: BR-IMG-011
name: 이미지 직접 올리기 삭제 자리 추가
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/routes/images.ts:POST /api/jobs/:id/images/:target
  - blog-writer:server/routes/images.ts:POST /api/jobs/:id/images
  - blog-writer:server/routes/images.ts:DELETE /api/jobs/:id/images/:target
entities: [이미지 명세]
updated: 2026-11-02
---
# BR-IMG-011 이미지 직접 올리기 삭제 자리 추가

## 규칙
사용자는 이미지를 직접 올리거나(PNG/JPG/WEBP/GIF, 최대 20MB), 본문 이미지 자리를 고른 블록 뒤에 추가하거나, 이미지를 삭제할 수 있다. 썸네일을 삭제하면 "썸네일 만들기"로 다시 만들 수 있고, 본문 이미지를 삭제하면 그 블록이 없어진다. 블록 번호가 밀리는 자리 추가·삭제는 어떤 작업이든 진행 중이면 막는다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 올리기: 형식이 4종 밖/빈 파일 | 400 |
| 올리기: 그 이미지를 만드는 중 | 409 (다른 이미지를 만드는 중이면 올릴 수 있음) |
| 올리기 성공 | 파일 `<target>-upload-<시각>.<확장자>` 저장, 오류 지움, 예전 파일 삭제 |
| 자리 추가 | 이미지 블록(파일 없음) 삽입, 설명은 가까운 앞 소제목 기반, 6장이면 400, 만들기는 "이미지 생성"으로 |
| 삭제 | 글에서 먼저 빼고 그 뒤에 파일 삭제 |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 서버 | 세 라우트 | 위 표 | `blog-writer:server/routes/images.ts` |
| 서버 | `jobImagePath` | 파일명을 basename으로 제한 | `blog-writer:server/store.ts` |
| 화면 | 이미지 카드의 올리기·삭제·자리 추가 | | [[_system/modules/web-job]] |
| 테스트 | 업로드·삭제 | | `blog-writer:tests/api.test.ts` |

## 영향받는 플로우
[[image/flows/이미지 생성]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-11-02 | wiki 재생성 때 코드(73f47a6) 기준으로 작성 | 코드 |
