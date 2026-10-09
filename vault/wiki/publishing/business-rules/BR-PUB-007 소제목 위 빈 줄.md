---
type: business-rule
domain: publishing
id: BR-PUB-007
name: 소제목 위 빈 줄
status: active
confidence: medium
consistency: consistent
source:
  - blog-writer:rules/default-writing-rules.md:53-66
  - blog-writer:shared/postHtml.ts:50-51
  - blog-writer:server/browser/blogPost.ts:46-47
  - blog-writer:server/browser/userChrome.ts:161-168
  - blog-writer:server/browser/userChrome.ts:329-338
  - blog-writer:server/browser/adapters.ts:136-162
  - blog-writer:server/wordpress.ts:198-236
entities: [블로그 설정]
updated: 2026-10-09
---
# BR-PUB-007 소제목 위 빈 줄

## 규칙
섹션 구분은 구분선이 아니라 **소제목 위 빈 줄 한 줄**로만 한다. 글 맨 처음(제목 바로 아래)과 소제목 바로 아래, 같은 섹션 안 문단 사이에는 빈 줄을 두지 않고, 빈 줄을 두 줄 이상 연달아 두지 않는다 (글쓰기 규칙 6장). 빈 줄은 모델이 만들지 않고 프로그램이 넣는다.

## 조건과 결과
| 조건 | 기대 결과 |
|---|---|
| 첫 블록이 아닌 소제목 | 바로 위에 빈 줄 1개 |
| 맨 앞 소제목 (앞에 썸네일만 있는 경우 포함) | 빈 줄 없음 |
| 이미지 바로 뒤 소제목 (네이버) | 빈 문단이 지워지므로 `&nbsp;` 문단 |
| 소제목 서식 | 네이버는 에디터 "소제목" 서식(못 하면 굵게), 티스토리 자동 조작은 일반 줄, 워드프레스는 제목 블록(`wp:heading`, `<h2>`) |
| 워드프레스 (API) | 빈 문단을 넣지 않는다. Gutenberg 블록 사이 간격이 섹션 구분을 맡는다 |
| 문단 (모든 경로) | 한 문단(paragraph 블록) 안에서는 문장마다 줄바꿈 문자(`\n`)로 줄을 나누고, 입력 때 `<br>`가 된다 (워드프레스 `rich(...).replace(/\n/g, "<br>")`). 문단 사이에 빈 줄을 넣지 않는 규칙은 그대로이고, 문단 사이 간격은 각 에디터·사이트 테마 기본값이다 (워드프레스는 따로 간격을 지정하지 않아 사이트의 다른 글과 같다) |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 규칙 문서 | 6장 | 소제목 위 1줄만 | `blog-writer:rules/default-writing-rules.md:53-66` |
| Claude in Chrome 조각 | 첫 소제목 외 `BLANK_LINE` + `<h3>` (`pasteBlockHtml(b, "h3")`) | 1줄 | `blog-writer:server/browser/blogPost.ts:20`, `:46-47` |
| 평소 크롬(네이버) | 첫 소제목 외 `BLANK_LINE`/`&nbsp;` + `<p>`(`pasteBlockHtml(b, "p")`) 후 "소제목" 서식, 검증으로 빠진 곳 보고 | 1줄 | `blog-writer:server/browser/userChrome.ts:134`, `:161-168`, `:329-338`, `:447-464` |
| 워드프레스 API | 블록 마크업, 빈 문단 없음, 문단·목록·소제목 간격은 테마 기본. 표는 워드프레스 전용 `wpTableHtml`(본문 폭, 넉넉한 여백) | 0줄 (블록 간격) | `blog-writer:server/wordpress.ts:198-236` |
| 공용 | 붙여넣기 블록 HTML (소제목 태그만 경로별) | | `blog-writer:server/browser/postHtml.ts:7-20` |
| 자동 조작(네이버·티스토리) `fillPlainBody` | 소제목 앞에만 Enter 1번 (2026-10-05 수정, 예전엔 모든 블록 사이에 추가로 넣음). 문단은 `typeLines`가 줄마다 Enter | 소제목 위 1줄 | `blog-writer:server/browser/adapters.ts:150-151` |

## 예외 / 경계값
- 자동 조작 경로는 줄마다 Enter로 끝내는 `typeLines`를 쓰므로, 에디터가 Enter를 어떻게 처리하는지에 따라 실제 빈 줄 수가 달라질 수 있다. 수정 후 실제 에디터에서 확인하지 못해 `confidence: medium`을 유지한다.
- 네이버 SmartEditor는 문단 안 줄바꿈을 줄마다 문단으로 만든다(모양은 같음) — 검증에서 고려 (`blog-writer:server/browser/userChrome.ts:243-244`).

## 영향받는 플로우
[[publishing/flows/블로그 임시저장 플로우]]

## 확인 필요
- 해결(코드 기준): [[publishing/open-questions]] #1. 실제 에디터 확인은 남아 있음

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-05 | 자동 조작이 블록 사이 빈 줄을 넣지 않고 소제목 위에만 한 줄 (consistency conflict → consistent) | `blog-writer:server/browser/adapters.ts:140-141` |
| 2026-10-07 | 워드프레스 크롬 자동 조작(`## ` 단축키) 삭제. 워드프레스는 API 블록 마크업으로 올리며 빈 문단을 넣지 않음. 두 붙여넣기 경로의 블록 HTML을 `pasteBlockHtml`로 공용화(소제목 태그만 다름, 동작 같음) | `blog-writer:server/wordpress.ts:209-244`, `blog-writer:server/browser/postHtml.ts:7-20` |
| 2026-10-07 | 규칙 문서에서 문단을 "2~4줄"에서 "한 가지 내용 1~3줄, 길면 문단 블록으로 나눔, 짧은 내용은 한 줄 문단"으로 바꿈. 빈 줄 규칙은 변경 없음 | `blog-writer:rules/default-writing-rules.md:18`, `:66` |
| 2026-10-07 (정정) | 문단을 "잘게 나누기"로 바꿨던 것을 되돌림: 문단 안 문장마다 줄바꿈(`<br>`), 문단 블록 2~4줄. 워드프레스 문단·소제목 간격을 직접 지정해 보았다가 사이트의 다른 글과 달라져 지정을 없앰 | `blog-writer:rules/default-writing-rules.md:18`, `blog-writer:server/wordpress.ts:216-225` |
| 2026-10-09 | 규칙 변화 없음. 화면 "본문 복사" 기능 삭제로 복사 HTML/텍스트 경로 없어짐, 워드프레스 표가 공용 `tableHtml(b, cellExtra, tableExtra)`를 씀(모양 같음). 근거 줄 번호 갱신 | 커밋 65bfa3e, `blog-writer:shared/postHtml.ts:37-45`, `blog-writer:server/wordpress.ts:198-200` |
