---
type: business-rule
domain: publishing
id: BR-PUB-005
name: 썸네일 위치
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/browser/blogPost.ts:33-36
  - blog-writer:server/browser/blogPost.ts:69
  - blog-writer:server/browser/userChrome.ts:149-150
  - blog-writer:server/browser/adapters.ts:252-256
  - blog-writer:server/browser/adapters.ts:374-378
  - blog-writer:server/wordpress.ts:269-296
entities: [블로그 설정]
updated: 2026-10-09
---
# BR-PUB-005 썸네일 위치

## 규칙
썸네일은 네이버·티스토리에서는 **본문 첫 이미지**(제목 바로 아래 첫 줄)로 넣는다. 두 블로그는 본문 첫 이미지가 대표 이미지가 되기 때문이다. 워드프레스에서는 본문에 넣지 않고 **대표 이미지(Featured image)**로 설정한다.

## 조건과 결과
| 플랫폼 | 썸네일 파일 있음 | 썸네일 파일 없음 |
|---|---|---|
| 네이버 | 본문 맨 앞 이미지 | 넣지 않음 |
| 티스토리 | 본문 맨 앞 이미지 | 넣지 않음 |
| 워드프레스 (API) | 미디어로 올린 뒤 글의 `featured_media`로 지정. 본문 블록에는 넣지 않음 | `featured_media: 0` (대표 이미지 없음) |

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| Claude in Chrome | 조각 맨 앞 + 네이버 안내 "제목 바로 아래, 본문 첫 줄" | `blog-writer:server/browser/blogPost.ts:33-36`, `:69` |
| 평소 크롬(네이버) | 조각 맨 앞 | `blog-writer:server/browser/userChrome.ts:149-150` |
| 자동 조작 | 네이버·티스토리 본문 첫 삽입 | `blog-writer:server/browser/adapters.ts:252-256`, `:374-378` |
| 워드프레스 API | 썸네일 업로드 → `featured_media` | `blog-writer:server/wordpress.ts:271`, `:289`, `:296` |

## 영향받는 플로우
[[publishing/flows/블로그 임시저장 플로우]], [[publishing/flows/워드프레스 API 등록 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-07 | 워드프레스 대표 이미지는 크롬 자동 조작(`setFeaturedImage`) 대신 REST API의 `featured_media`로 지정. Claude in Chrome의 워드프레스 대표 이미지 경로 삭제 | `blog-writer:server/wordpress.ts:296-303` |
| 2026-10-09 | 화면의 "본문 복사" 기능이 없어져 복사용 `[썸네일]` 자리 표시도 없어짐. 근거 줄 번호 갱신 (규칙 변화 없음) | 커밋 65bfa3e |
