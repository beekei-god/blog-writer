---
type: business-rule
domain: publishing
id: BR-PUB-006
name: 태그 입력 위치
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:shared/postHtml.ts:53-57
  - blog-writer:server/browser/blogPost.ts:51-55
  - blog-writer:server/browser/userChrome.ts:173-183
  - blog-writer:server/browser/adapters.ts:274-279
  - blog-writer:server/browser/adapters.ts:389-395
  - blog-writer:server/wordpress.ts:175-194
  - blog-writer:server/browser/publish.ts:315
entities: [블로그 설정]
updated: 2026-10-09
---
# BR-PUB-006 태그 입력 위치

## 규칙
네이버 블로그는 태그 칸이 발행 창에만 있어서 **본문 마지막 줄에 `#태그 #태그` 한 줄**로 넣는다. 태그는 임시저장 전 본문 입력 때 넣으므로 임시저장만 해도 남는다. 예약발행·자동발행으로 발행 창을 열 때도 발행 창의 태그 칸은 채우지 않는다 (Claude in Chrome 안내는 "비워 둡니다", 코드 경로의 발행 창 단계는 태그 칸을 건드리지 않음). 본문 끝과 태그 줄 사이에는 **빈 줄 3개**를 둔다. 태그의 공백은 지운다. 티스토리는 에디터의 태그 입력란에 하나씩 넣는다. 워드프레스는 API로 태그를 이름으로 찾아(없으면 만들어) 글에 붙인다.

## 조건과 결과
| 플랫폼 | 위치 | 형식 |
|---|---|---|
| 네이버 | 본문 끝, 빈 줄 3개 뒤 | `#태그` 공백 없이, 공백으로 구분 |
| 티스토리 | 하단 `#tagText`, 하나씩 Enter | 원래 태그 |
| 워드프레스 (API) | 글의 `tags`(ID 목록). 이름이 대소문자 무시로 정확히 같은 태그를 쓰고, 없으면 만듦. 만들 때 "이미 있음"(`term_exists`)이면 그 ID 사용 | 원래 태그 (앞뒤 공백 제거, 중복 제거, 최대 30개) |

## 구현 현황
| 레이어 | 구현 | 값/내용 | 근거 |
|---|---|---|---|
| 공용 | `TAG_GAP_LINES`, `tagLine` | 3, 공백 제거, 최대 30 | `blog-writer:shared/postHtml.ts:54`, `:57` |
| Claude in Chrome | 네이버만 본문 끝 `<p>&nbsp;</p>`×3 + 태그 문단 | 3 | `blog-writer:server/browser/blogPost.ts:51-55` |
| 평소 크롬 | `<p>&nbsp;</p>`×3 + 태그 문단, 검증에서 빈 줄 수 확인 | 3 | `blog-writer:server/browser/userChrome.ts:173-183`, `:322-328` |
| 자동 조작(네이버) | Enter 3번 후 타이핑 | 3 (상수 아닌 숫자) | `blog-writer:server/browser/adapters.ts:274-279` |
| 자동 조작(티스토리) | 태그 입력란 | | `blog-writer:server/browser/adapters.ts:389-395` |
| 워드프레스 API | `resolveTagIds` | 최대 `MAX_TAGS` | `blog-writer:server/wordpress.ts:175-194` |
| 발행 창 (네이버) | Claude in Chrome 안내: 발행 창의 태그 칸은 비워 둠 | | `blog-writer:server/browser/publish.ts:315` |

## 예외 / 경계값
- 이미지 바로 뒤에서는 네이버가 빈 문단(`<p><br></p>`)을 지우므로 공백 문자가 든 문단(`&nbsp;`)을 쓴다 (`blog-writer:server/browser/userChrome.ts:173-178`).
- 미리보기 태그 줄은 공백을 지우지 않는다 (`blog-writer:src/job/Preview.tsx:126`, [[_system/known-issues]]).

## 영향받는 플로우
[[publishing/flows/블로그 임시저장 플로우]], [[publishing/flows/워드프레스 API 등록 플로우]], [[writing/flows/초안 편집과 자동 저장 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-07 | 워드프레스 태그는 에디터 설정 패널 입력(`addWordPressTags`) 대신 REST API로 이름 조회·생성 후 ID로 붙임 | `blog-writer:server/wordpress.ts:175-194` |
| 2026-10-09 | 네이버도 발행 창을 열 수 있게 됐지만 태그는 계속 본문 끝 줄로만 넣음(발행 창 태그 칸 비움). 화면 "본문 복사" 기능 삭제로 복사용 태그 줄 없어짐. 근거 줄 번호 갱신 | 커밋 65bfa3e, `blog-writer:server/browser/publish.ts:315` |
