---
type: business-rule
domain: publishing
id: BR-PUB-006
name: 워드프레스 등록 규칙
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/wordpress.ts:1-326
entities: [워드프레스 기록]
updated: 2026-11-02
---
# BR-PUB-006 워드프레스 등록 규칙

## 규칙
워드프레스는 크롬이 아니라 **REST API**(Application Password 인증)로 올린다. 사이트 주소는 https로 정리하고 http는 거부한다(비밀번호를 평문으로 보낼 수 없어서). 이미지는 먼저 올리고(썸네일은 대표 이미지, 본문 이미지는 본문에), 이미 올린 파일은 다시 올리지 않는다. 태그는 이름이 같은 것이 있으면 쓰고 없으면 만든다. 이미 올린 글은 **갱신**하고, 사이트에서 지워졌으면(404) 새 글로 올린다. 카테고리는 올릴 때 고른 것만 보내고 고르지 않으면 사이트 기본 카테고리로 올라간다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 방식 draft / schedule / publish | WP 상태 draft / future / publish |
| 예약 | `date_gmt`로 보냄, 업로드 전에 시각 검사 |
| 예약해 둔 글을 자동발행으로 다시 올림 | 공개 시각을 지금으로 보냄(미래 시각 때문에 예약으로 되돌아가는 것 방지) |
| 이미 자동발행한 글을 갱신 | 원래 공개 시각 그대로 |
| `/wp-json`이 없음 | `?rest_route=`로 재시도 |
| 글 쓸 권한 없음 | 연결 테스트에서 거절 |
| 오류 메시지 | 비밀번호는 나오지 않음 |
| 이미지 업로드 실패 | "썸네일/본문 이미지 #N 업로드에 실패했습니다" 로 중단 |
| 장소·표 | Gutenberg 블록으로 변환(표는 사용자 지정 HTML 블록에 넣어 서식 유지, 올리지 못한 이미지는 건너뜀) |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 서버 | `normalizeSite`, `testWordPress`, `listCategories` | 연결·카테고리 | `blog-writer:server/wordpress.ts` |
| 서버 | `publishToWordPress`, `ensureMedia`, `resolveTagIds`, `postToBlocks` | 등록 | `blog-writer:server/wordpress.ts:148-326` |
| 서버 | `doWordPressPost` | 상태 기록 | `blog-writer:server/pipeline.ts:420-450` |
| 테스트 | 가짜 사이트로 업로드·갱신·예약·카테고리·권한·비밀번호 | | `blog-writer:tests/wordpress.test.ts` |

## 예외 / 경계값 · 변경 시 같이 볼 곳
- 인증 정보는 `data/secrets.json`에 있고 읽지 않는다 → [[_system/integrations/wordpress-rest]]

## 영향받는 플로우
[[publishing/flows/워드프레스 등록]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-11-02 | wiki 재생성 때 코드(73f47a6) 기준으로 작성 | 코드 |
