---
type: business-rule
domain: image
id: BR-IMG-015
name: 본문 이미지 자리 추가와 이미지 삭제
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:shared/types.ts:15
  - blog-writer:server/routes/images.ts:139-199
  - blog-writer:server/store.ts:81-83
  - blog-writer:src/api.ts:109-112
  - blog-writer:src/job/JobDetail.tsx:136-149
  - blog-writer:src/job/images.tsx:235-239
  - blog-writer:src/job/PostEditor.tsx:220-239
  - blog-writer:tests/api.test.ts:174-222
entities: [ImageSpec, ImageOptions]
updated: 2026-10-09
---
# BR-IMG-015 본문 이미지 자리 추가와 이미지 삭제

## 규칙
초안이 만들어진 뒤에도 사용자가 본문 이미지를 직접 늘리거나 줄일 수 있다.
- **자리 추가**: 고른 블록 바로 뒤에 파일이 없는 이미지 블록을 넣는다. 이미지는 "이미지 생성"(만들기 직전에 주변 본문을 보고 설명·문구를 다시 정함, [[image/business-rules/BR-IMG-004 본문 기반 이미지 기획]])이나 "직접 올리기"로 채운다.
- **삭제**: 썸네일이면 `post.thumbnail`을 없애고(다시 "썸네일 만들기"로 만들 수 있음), 본문 이미지면 그 블록을 없앤다. 글에서 뺀 뒤에 이미지 파일도 지운다.
- 둘 다 블록 번호(`body-<n>`)가 밀리므로 **어떤 작업이든 진행 중이면 409**다. 한 장씩 다시 만들기가 도는 중에도 막는다 ([[image/business-rules/BR-IMG-014 한 장씩 다시 만들기 동시 실행]]의 예외 아님).

## 조건과 결과
| 조건 | 결과 |
|---|---|
| `POST /api/jobs/:id/images {afterBlock}` 정상 | 201, 블록 `afterBlock+1` 위치에 `{type:"image", alt, prompt}` 삽입, 로그 "본문 이미지 자리를 추가했습니다 (#N). …" |
| `afterBlock`이 정수 0 이상이 아님 | 400 "이미지를 넣을 자리를 골라 주세요." |
| 초안 없음 | 400 "초안이 없습니다." |
| 작업 진행 중 (추가·삭제 모두) | 409 |
| `afterBlock`이 블록 수 이상 | 404 "이미지를 넣을 자리를 찾지 못했습니다. 화면을 새로고침해 주세요." |
| 본문 이미지가 이미 `MAX_BODY_IMAGES`(6)장 | 400 "본문 이미지는 최대 6장입니다." (409 아님) |
| 자리 추가 시 alt | 가까운 앞쪽 소제목(`**` 제거), 없으면 글 제목 |
| 자리 추가 시 prompt | `블로그 글 "<제목>"의 "<소제목>" 부분에 들어갈 삽화. …` (소제목이 없으면 "이 위치") |
| `DELETE /api/jobs/:id/images/:target` 정상 | 200, 썸네일은 `thumbnail` 삭제 / 본문은 블록 삭제 + 파일 삭제(`removeImageFile`), 로그 "썸네일을|본문 이미지 #N을 삭제했습니다." |
| 삭제 대상이 없음 | 404 "삭제할 이미지를 찾지 못했습니다. 화면을 새로고침해 주세요." |

## 화면
| 위치 | 동작 |
|---|---|
| 편집 화면의 블록 사이 | "＋ 여기에 이미지 추가". 블록이 이미지이거나 바로 다음 블록이 이미지면 안 보이고, 6장이면 비활성(툴팁), 작업 중(`locked`)이면 비활성 |
| 이미지 도구 `ImageTools` | "이미지 삭제" 버튼은 **파일이 있는 이미지에만**(`hasFile`). 파일 없는 자리·실패한 이미지는 에디터 ×로 지운다 |
| 에디터 블록의 × | 이미지 블록이면 같은 삭제 API(툴팁 "이미지 삭제 (이미지 파일도 지웁니다)"), 다른 블록은 단순 블록 삭제 |
| 공통 | 삭제는 확인창("이미지 파일도 같이 지워집니다.") 후 대기 중인 편집을 먼저 저장(`flush`)하고 서버 호출. 추가도 `flush` 후 호출 |

## 다른 규칙과의 관계
- 이미지 없는 자리는 블로그에 올릴 때 건너뛴다 → [[publishing/business-rules/BR-PUB-008 생성되지 않은 이미지 건너뜀]]. 그래서 자리만 추가하고 채우지 않아도 등록은 된다.
- 추가·삭제는 `imageOptions.bodyImages`를 바꾸지 않는다 ([[image/open-questions]] #9). 6장 제한([[image/business-rules/BR-IMG-001 본문 이미지 개수]])은 글 안의 이미지 블록 수로 센다.
- 추가한 자리는 `userEdited`가 아니므로 이미지 생성 시 자동 기획 대상이다 ([[image/business-rules/BR-IMG-006 직접 고친 이미지 보호]]).

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 공용 | `MAX_BODY_IMAGES = 6`, `imageSpecAt`·`bodyIndexOf` | `blog-writer:shared/types.ts:15` |
| 서버 API | 자리 추가 | `blog-writer:server/routes/images.ts:139-173` |
| 서버 API | 삭제 | `blog-writer:server/routes/images.ts:175-199` |
| 서버 | `removeImageFile` (폴더 밖은 건드리지 않음) | `blog-writer:server/store.ts:81-83` |
| 화면 | `api.addImage`·`api.deleteImage` | `blog-writer:src/api.ts:109-112` |
| 화면 | `onAdd`·`onDelete`·`locked`, 삭제 확인 | `blog-writer:src/job/JobDetail.tsx:136-149` |
| 화면 | 삭제 버튼(`hasFile`) | `blog-writer:src/job/images.tsx:235-239` |
| 화면 | "＋ 여기에 이미지 추가"·블록 × | `blog-writer:src/job/PostEditor.tsx:220-239` |
| 테스트 | 자리 추가(위치·소제목 이름), 자리·개수·진행 중 검사, 삭제(썸네일·본문·파일 삭제), 없는 이미지 404 | `blog-writer:tests/api.test.ts:174-222` |

## 예외 / 경계값
- 파일이 있는 이미지를 지우면 파일도 사라져 되돌릴 수 없다. 서버는 글에서 먼저 빼고 파일을 지우므로 중간에 실패해도 글이 깨진 파일을 가리키지 않는다.

## 영향받는 플로우
[[image/flows/이미지 생성 플로우]], [[image/flows/이미지 다시 만들기 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-09 | 최초 기록 (본문 이미지 자리 추가, 이미지 삭제) | 커밋 b7ced30 |
