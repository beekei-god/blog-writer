---
type: business-rule
domain: publishing
id: BR-PUB-009
name: 네이버 이미지 파일 이름과 크기
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/browser/postHtml.ts:26-38
  - blog-writer:server/browser/userChrome.ts:202-222
  - blog-writer:server/browser/adapters.ts:245-257
  - blog-writer:server/browser/blogPost.ts:128-143
  - blog-writer:server/browser/blogPost.ts:68
updated: 2026-10-09
---
# BR-PUB-009 네이버 이미지 파일 이름과 크기

## 규칙
네이버 SmartEditor ONE에는 대체 텍스트 칸이 없고 **올린 파일 이름이 이미지 alt**가 된다. 그래서 대체 텍스트로 파일 이름을 만들어 올린다. 평소 크롬 경로에서는 페이지로 넘길 크기를 줄이려고 JPEG(가로 최대 1600px, 품질 88)로 줄인다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 파일 이름 | alt에서 `\ / : * ? " < > |`·제어문자를 공백으로, 공백 정리, 60자, 비면 `image` + 확장자 |
| 확장자 없음 | 업로드가 거절되므로 항상 붙임 |
| 평소 크롬 | `sips`로 JPEG 변환(`.jpg`), 실패하면 원본(확장자에 맞는 MIME) |
| 자동 조작(네이버) | 원본을 임시 폴더에 alt 이름으로 복사해 올림 |
| Claude in Chrome(네이버) | 서버가 alt 이름의 사본을 임시 폴더(`bw-alt-*`)에 만들어 그 경로를 조각으로 넘김, 같은 이름은 " (2)"를 붙여 구분, 작업 뒤 폴더 삭제 (2026-10-05 변경). 프롬프트: "path 파일 이름이 이미 대체 텍스트" |
| 티스토리 | 에디터(TinyMCE) API로 alt 속성 설정 (실패하면 로그 후 계속) |
| 워드프레스 (API) | 원래 파일 이름으로 미디어 업로드 후 미디어의 `alt_text`를 설정. 본문 `<img alt>`에도 넣음 |

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 서버 | `altFileName` | `blog-writer:server/browser/postHtml.ts:30-38` |
| 평소 크롬 | `shrinkImage` | `blog-writer:server/browser/userChrome.ts:202-222` |
| 자동 조작 | alt 이름 사본 | `blog-writer:server/browser/adapters.ts:245-257` |
| Claude in Chrome | alt 이름 사본 + 안내 | `blog-writer:server/browser/blogPost.ts:128-143`, `:67` |
| 워드프레스 API | `ensureMedia`의 `alt_text` | `blog-writer:server/wordpress.ts:149-171` |

## 예외 / 경계값
- 세 경로 모두 alt 이름의 파일로 올린다 (Claude in Chrome 경로는 2026-10-05부터).

## 영향받는 플로우
[[publishing/flows/블로그 임시저장 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-05 | Claude in Chrome 경로도 alt 이름 사본으로 올림 | `blog-writer:server/browser/blogPost.ts:133-148` |
| 2026-10-07 | 워드프레스는 크롬 에디터 대신 API로 미디어 `alt_text` 설정 | `blog-writer:server/wordpress.ts:168` |
| 2026-10-09 | 근거 줄 번호 갱신 (동작 변화 없음) | 커밋 65bfa3e |
