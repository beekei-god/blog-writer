---
type: business-rule
domain: publishing
id: BR-PUB-008
name: 생성되지 않은 이미지 건너뜀
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:shared/postHtml.ts:47-48
  - blog-writer:server/browser/blogPost.ts:39-42
  - blog-writer:server/browser/blogPost.ts:124
  - blog-writer:server/browser/userChrome.ts:152-156
  - blog-writer:server/browser/adapters.ts:41-46
  - blog-writer:server/browser/adapters.ts:140-144
  - blog-writer:server/wordpress.ts:222-227
updated: 2026-10-09
---
# BR-PUB-008 생성되지 않은 이미지 건너뜀

## 규칙
파일이 없는(실패했거나 아직 안 만든) 이미지는 블로그에 넣지 않고 건너뛴다. 글 입력은 계속한다. 업로드할 파일 경로는 항상 그 작업의 이미지 폴더 안으로 제한한다. 워드프레스 API 경로도 같다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 본문 image 블록에 `file` 없음 | 로그 "이미지 건너뜀 (생성되지 않음): <alt 또는 prompt 앞 30자>" |
| 썸네일에 `file` 없음 | 조용히 넣지 않음 |
| `file` 값 | `path.basename`으로 잘라 `data/images/<jobId>/` 안 경로로 |

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 공용 | 로그에 쓰는 이름 `skippedImageLabel` (alt, 없으면 prompt 앞 30자) | `blog-writer:shared/postHtml.ts:47-48` |
| Claude in Chrome | `buildSegments` skipped | `blog-writer:server/browser/blogPost.ts:39-42`, `:124` |
| 평소 크롬 | `segmentsOf` | `blog-writer:server/browser/userChrome.ts:152-156` |
| 자동 조작 | `hasFile`, `imagePath` | `blog-writer:server/browser/adapters.ts:41-46`, `:140-144` |
| 워드프레스 API | 파일 있는 이미지만 업로드, `postToBlocks`가 올리지 않은 이미지 건너뜀(같은 로그) | `blog-writer:server/wordpress.ts:270-274`, `:222-227` |

## 영향받는 플로우
[[publishing/flows/블로그 임시저장 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-07 | 워드프레스 크롬 경로 삭제, 워드프레스 API 경로 추가(같은 규칙) | `blog-writer:server/wordpress.ts:229-234` |
| 2026-10-09 | 건너뛴 이미지 이름을 공용 `skippedImageLabel`로 모음(문구 같음). 근거 줄 번호 갱신 | 커밋 65bfa3e, `blog-writer:shared/postHtml.ts:47-48` |
