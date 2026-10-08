---
type: module
project: blog-writer
module: server-wordpress
paths: [server/wordpress.ts]
source:
  - blog-writer:server/wordpress.ts:1-320
updated: 2026-10-09
---
# server-wordpress 모듈

## 책임
워드프레스 REST API로 글을 임시저장·예약발행·자동발행한다. 크롬을 쓰지 않으므로 크롬 작업 큐를 거치지 않는다. 바깥 시스템 설명은 [[_system/integrations/wordpress-rest]].

## 파일
| 파일 | 줄 | 역할 | 주요 export | 관련 페이지 |
|---|---|---|---|---|
| `server/wordpress.ts` | 320 | 사이트 주소 정리, 인증 요청과 오류 메시지, 연결 확인, 카테고리, 이미지 업로드·재사용, 태그 조회·생성, Gutenberg 블록 변환(표는 본문 폭·넉넉한 여백의 `wpTableHtml` — 2026-10-09부터 `shared/postHtml`의 `tableHtml`에 칸·표 스타일만 더해 만든다. `plain`·`skippedImageLabel`도 공용 것을 쓴다), 예약 시각 검사, 등록(예약했던 글을 자동발행하면 공개 시각을 지금으로) | `WordPressError`, `normalizeSite`, `wordpressSiteOf`, `testWordPress`, `listCategories`, `postToBlocks`, `checkSchedule`, `publishToWordPress` | [[publishing/flows/워드프레스 API 등록 플로우]] |

## 의존
- 사용하는 모듈: [[_system/modules/server-core]] (`getSettings`, `jobImageDir`, `getWordPressAuth`, 중지 신호), [[_system/modules/shared]] (`postHtml`의 `esc`·`rich`·`tableHtml`, `MAX_TAGS`)
- 사용되는 곳: [[_system/modules/server-pipeline]] (`doWordPressPost`), [[_system/modules/server-routes]] (연결 확인·카테고리·등록 전 검사)

## 주의할 점
- 업로드할 이미지가 하나라도 실패하면 글 등록 전체가 실패한다 (어떤 이미지인지 메시지에 표시).
- 예약 시각 검사(`checkSchedule`)는 라우터와 등록 함수 양쪽에서 한다. 라우터에서 400으로 먼저 막고, 등록 직전에도 다시 확인한다 (`blog-writer:server/routes/jobs.ts:121-128`, `blog-writer:server/wordpress.ts:264`). 2026-10-09부터 네이버·티스토리 예약발행도 라우터에서 같은 `checkSchedule`을 쓴다 (`blog-writer:server/routes/jobs.ts:133-143`).
