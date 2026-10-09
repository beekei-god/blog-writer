---
type: integration
project: blog-writer
system: 워드프레스 REST API (wp/v2, Application Password)
confidence: high
source:
  - blog-writer:server/wordpress.ts:1-323
  - blog-writer:server/pipeline.ts:369-423
  - blog-writer:server/secrets.ts:81-95
  - blog-writer:server/routes/settings.ts:157-182
  - blog-writer:server/routes/jobs.ts:101-161
  - blog-writer:tests/wordpress.test.ts:1-186
updated: 2026-10-09
---
# 워드프레스 REST API

## 무엇에 쓰나
워드프레스(설치형) 사이트에 글을 **임시저장 / 예약발행 / 자동발행**으로 올린다. 크롬 화면을 조작하지 않고 HTTP API만 쓴다. 예전의 워드프레스 크롬 경로(Claude in Chrome 안내, Playwright 어댑터)는 지웠다 → [[_system/integrations/blog-editors]].

## 인증
- **Application Password**를 HTTP Basic 헤더로 보낸다 (`blog-writer:server/wordpress.ts:44`). 사용자명과 비밀번호는 `data/secrets.json`의 `wpUsername`·`wpAppPassword`에만 둔다 (`blog-writer:server/secrets.ts:81-95`). 화면에는 사용자명만 돌려준다.
- 사이트 주소는 설정의 `wordpressUrl`. **https만** 허용하고, 프로토콜이 없으면 `https://`를 붙인다. `http://`는 거절한다 (`blog-writer:server/wordpress.ts:26-32`).
- 예전 WordPress.com 계정 연결 값(`wpcomToken`·`wpcomUsername`)은 더 쓰지 않으며, 워드프레스 연결을 저장·삭제할 때 같이 지운다 (`blog-writer:server/secrets.ts:16-29`, `:64-68`).
- 연결 저장 전 `GET /wp/v2/users/me?context=edit`로 확인하고, `edit_posts` 권한이 없으면 거절한다 (`blog-writer:server/wordpress.ts:124-131`).

## 호출 방식
| 하는 일 | 요청 | 근거 |
|---|---|---|
| 공통 요청 | `<site>/wp-json<route>`. 404이고 JSON이 아니면 `<site>/?rest_route=<route>`로 다시 (고유주소가 "기본"인 사이트). 30초 타임아웃(미디어 120초), 중지 신호 연결, 리다이렉트는 따라가지 않고 오류 | `blog-writer:server/wordpress.ts:53-80` |
| 카테고리 목록 | `GET /wp/v2/categories?per_page=100` — 설정 화면과 2026-10-09부터 올리기 화면(`GET /api/categories/wordpress`)에서 쓴다. 고른 카테고리는 `id`가 필수(없으면 400) | `blog-writer:server/wordpress.ts:133-137`, `blog-writer:server/wordpress.ts:300-301` |
| 이미지 | 이미 올린 파일(`mediaIds`에 있고 사이트에 남은 것)은 다시 쓰고, 아니면 `POST /wp/v2/media`(바이너리 + `Content-Disposition`) 뒤 `alt_text` 설정 | `blog-writer:server/wordpress.ts:148-171` |
| 태그 | 이름으로 검색해 정확히 같은 태그 사용, 없으면 `POST /wp/v2/tags`. 이미 있으면(`term_exists`) 응답의 `term_id` 사용. 최대 30개 | `blog-writer:server/wordpress.ts:174-196` |
| 본문 | 초안 블록 → Gutenberg 블록 마크업 (`postToBlocks`). 소제목 `h2`, 표는 서식 유지를 위해 HTML 블록(`wpTableHtml`: 본문 폭 100%, 칸 안쪽 여백 12×16px, 줄 높이 1.7, 위아래 간격 1.5em — 테마 기본 표가 좁게 나오는 것을 막음), 이미지는 올린 미디어 URL. 썸네일은 본문이 아니라 대표 이미지(`featured_media`) | `blog-writer:server/wordpress.ts:202-236` |
| 글 | `POST /wp/v2/posts` (새 글) 또는 `POST /wp/v2/posts/<id>` (이미 올린 글 갱신, 404면 새 글). `title`, `content`, `excerpt`(=요약), `status`, `tags`, `categories`(올릴 때 글 화면에서 고른 카테고리의 `id`만 보내고, 고르지 않으면 생략해 사이트 기본 카테고리로 올라감. 설정의 기본 카테고리 `wordpressCategoryId`는 2026-10-09에 삭제 — `blog-writer:server/wordpress.ts:300-301`), `featured_media`, 예약이면 `date_gmt`. 예약했거나 임시저장했던 글을 자동발행으로 다시 올리면 `date_gmt`를 지금으로 보낸다 (글에 남은 미래 예약 시각 때문에 사이트가 `future`로 되돌리는 것을 막음. 이미 자동발행한 글의 갱신은 공개 시각을 바꾸지 않음) | `blog-writer:server/wordpress.ts:255-323` |

등록 방식 → 워드프레스 `status`: 임시저장 `draft`, 예약발행 `future`, 자동발행 `publish` (`blog-writer:server/wordpress.ts:245`). 사이트가 돌려준 상태로 작업 상태를 정한다: `publish`→발행 완료, `future`→예약됨, 그 밖→임시저장 완료. 요청과 다르면(권한 부족 등) 로그에 "확인 필요"를 남긴다 (`blog-writer:server/pipeline.ts:407-418`).

## 실패 처리
| 상황 | 사용자에게 보이는 메시지 요지 | 근거 |
|---|---|---|
| 401 `rest_not_logged_in` | 값이 틀린 게 아니라 호스팅·보안 설정이 Authorization 헤더를 막고 있음 | `blog-writer:server/wordpress.ts:95-99` |
| 401 `invalid_username`/`invalid_email` | 표시 이름이 아니라 로그인 아이디(이메일) 입력 | `blog-writer:server/wordpress.ts:100-102` |
| 401 `incorrect_password` | 로그인 비밀번호가 아니라 애플리케이션 비밀번호 입력 | `blog-writer:server/wordpress.ts:103-105` |
| 403 | 글을 쓸 수 있는 사용자인지 확인 | `blog-writer:server/wordpress.ts:108` |
| 404 (JSON 아님) | REST API를 찾지 못함 (주소·보안 플러그인 확인) | `blog-writer:server/wordpress.ts:109` |
| 3xx | 실제 주소(https, www 여부)로 설정을 고치라고 안내 | `blog-writer:server/wordpress.ts:80-82` |
| 타임아웃·연결 실패 | 사이트가 제때 응답하지 않음 / 연결하지 못함 | `blog-writer:server/wordpress.ts:74-78` |
| 이미지 업로드 실패 | 어떤 이미지인지 밝혀 글 등록 전체를 실패로 | `blog-writer:server/wordpress.ts:282-284` |

실패·중지면 작업은 초안 검토(`draft_ready`)로 돌아간다(공용 `failStep`) (`blog-writer:server/pipeline.ts:418-419`). 비밀번호는 오류 메시지·로그에 넣지 않는다 (`tests/wordpress.test.ts`에서 확인).

## 바깥 변화에 취약한 지점
- 호스팅이 `Authorization` 헤더를 지우는 경우 (가장 흔한 실패).
- 보안 플러그인이 REST API를 막는 경우, 고유주소 설정(`?rest_route=` 대체 경로로 대응).
- `term_exists` 오류 형식, `date_gmt` 해석 등 워드프레스 버전별 동작.

## 테스트
`tests/wordpress.test.ts`가 `fetch`를 가짜로 바꿔 예약 글 생성, 갱신·미디어 재사용, 지워진 글 새로 만들기, 과거 예약 거절, `?rest_route=` 대체, 401 원인별 메시지, 권한 없음, 비밀번호 비노출을 확인한다 → [[_system/modules/tests]].

## 관련 규칙과 흐름
[[publishing/business-rules/BR-PUB-001 발행하지 않고 임시저장까지만]], [[publishing/business-rules/BR-PUB-014 워드프레스 등록 방식과 예약 시각]], [[publishing/business-rules/BR-PUB-016 워드프레스 재등록은 같은 글 갱신]], [[publishing/flows/워드프레스 API 등록 플로우]], 모듈 [[_system/modules/server-wordpress]]
