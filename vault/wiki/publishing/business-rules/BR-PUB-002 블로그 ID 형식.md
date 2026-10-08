---
type: business-rule
domain: publishing
id: BR-PUB-002
name: 블로그 ID 형식
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/routes/settings.ts:17-35
  - blog-writer:server/routes/jobs.ts:116-120
  - blog-writer:server/routes/browser.ts:104-105
  - blog-writer:server/wordpress.ts:26-31
  - blog-writer:src/SettingsPanel.tsx:11-27
entities: [블로그 설정]
updated: 2026-10-07
---
# BR-PUB-002 블로그 ID 형식

## 규칙
블로그마다 따로 연결 값을 둔다: 네이버는 블로그 ID, 티스토리는 블로그 이름, 워드프레스는 **https 사이트 주소**. 모두 비워 둘 수 있지만(초안은 만들 수 있음), 그 블로그에 올리려면 있어야 한다. 200자 이하.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| 빈 값 | 저장 허용. 그 블로그로 올리기 400 "먼저 설정에서 <네이버·티스토리> 블로그 ID를 입력하세요." / "먼저 설정에서 워드프레스 사이트 주소를 입력하세요.", 로그인 창 400 |
| `naverBlogId`·`tistoryBlogId`가 `^[\w-]+$` 아님 | 400 "영문/숫자/_/- 만 가능합니다" |
| `wordpressUrl`이 `^(https://)?[\w.-]+(:\d+)?(/[\w./-]*)?$` 아님 (`http://` 포함) | 400 "워드프레스 사이트 주소는 https:// 주소여야 합니다. (예: https://myblog.com)" |
| 워드프레스 주소에 프로토콜 없음 | 쓸 때 `https://` 붙이고 끝 `/` 제거 (`normalizeSite`) |
| 쓸 때 `http://` 주소 | `WordPressError` "워드프레스 사이트 주소는 https://로 시작해야 합니다. (Application Password는 https에서만 쓸 수 있습니다)" |

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 서버(설정 저장) | `SettingsSchema.superRefine` 블로그별 검사 | `blog-writer:server/routes/settings.ts:17-35` |
| 서버(올리기) | 고른 블로그의 값이 비면 400 | `blog-writer:server/routes/jobs.ts:116-120` |
| 서버(로그인 창) | 블로그 ID가 비면 400 | `blog-writer:server/routes/browser.ts:104-105` |
| 서버(사용) | 글쓰기 URL·로그인 URL, 워드프레스 주소 정리 | `blog-writer:server/browser/blogPost.ts:61-66`, `blog-writer:server/routes/browser.ts:79-82`, `blog-writer:server/wordpress.ts:26-31` |
| 화면 | 블로그별 라벨·예시·도움말, 형식 검사 없음 (서버 메시지 표시) | `blog-writer:src/SettingsPanel.tsx:11-27`, `:172-262` |

## 영향받는 플로우
[[publishing/flows/블로그 임시저장 플로우]], [[publishing/flows/워드프레스 API 등록 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-07 | 플랫폼 하나의 `blogId` 대신 블로그별 필드(`naverBlogId`·`tistoryBlogId`·`wordpressUrl`)로 나눠 각각 검사. 워드프레스 주소는 `https?://`에서 `https://`만 허용으로 바뀜 | `blog-writer:server/routes/settings.ts:27-35` |
