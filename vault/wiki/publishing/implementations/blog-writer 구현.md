---
type: implementation
domain: publishing
project: blog-writer
paths: [server/browser/**, server/wordpress.ts, server/naverTopic.ts, server/categories.ts, server/routes/browser.ts, server/routes/categories.ts, shared/blogStatus.ts, shared/postHtml.ts, server/pipeline.ts]
last_ingested_commit: 73f47a6
updated: 2026-11-02
---
# blog-writer의 publishing 구현

## 파일과 역할
| 파일 | 함수/컴포넌트 | 구현하는 규칙/엔티티 |
|---|---|---|
| `server/pipeline.ts` | `runPost`, `doPost`, `doWordPressPost`, `setBlogStatus`, `enqueueBrowser` | BR-PUB-001/004/005, [[publishing/flows/블로그에 올리기]] |
| `server/routes/jobs.ts` | `post-to-blog`, `blogs/:platform/status` | BR-PUB-002/003/009 |
| `server/wordpress.ts` | `publishToWordPress`, `checkSchedule`, `postToBlocks`, `normalizeSite` | [[publishing/business-rules/BR-PUB-006 워드프레스 등록 규칙]] |
| `server/browser/claudeChrome.ts` | 확장 설치 확인, `BROWSER_RULES`, `SiteBlockedError` | BR-PUB-005 |
| `server/browser/blogPost.ts` | `postWithClaudeInChrome`, `buildSegments` | BR-PUB-005/008 |
| `server/browser/blockedSites.ts` | 차단 목록 | BR-PUB-005 |
| `server/browser/userChrome.ts` | `postNaverInUserChrome`, `readNaverCategories` | BR-PUB-005 |
| `server/browser/runner.ts`, `adapters.ts`, `mouse.ts`, `loginWindow.ts` | 앱 전용 크롬, 블로그 어댑터, 사람 같은 마우스, 로그인 창 | BR-PUB-005 |
| `server/browser/publish.ts` | 발행 창 단계, `PublishStepError`, `kstParts` | BR-PUB-003/004 |
| `server/browser/category.ts` | 카테고리 읽기·고르기, 네이버 주제 단계 | BR-PUB-007 |
| `server/categories.ts`, `server/naverTopic.ts` | 카테고리 기억, 주제 선택 | BR-PUB-007 |
| `shared/postHtml.ts`, `server/browser/postHtml.ts` | 붙여넣기 HTML | BR-PUB-008 |
| `shared/blogStatus.ts` | 위치·필터 | BR-PUB-001/009 |
| `server/routes/browser.ts`, `server/routes/categories.ts` | 확장 상태, 로그인 창, 카테고리 API | [[_system/api]] |

## 테스트
| 테스트 파일 | 확인하는 것 | 규칙 |
|---|---|---|
| `tests/wordpress.test.ts` | 사이트 주소, 예약, Gutenberg, 가짜 사이트 등록 | BR-PUB-003/006 |
| `tests/publish.test.ts` | 발행 창 단계, 실행, 구조 덤프 | BR-PUB-003/004 |
| `tests/categories.test.ts` | 카테고리 기억·단계 | BR-PUB-007 |
| `tests/naverTopic.test.ts` | 주제 선택 | BR-PUB-007 |
| `tests/extensionOptions.test.ts` | 확장 설정 화면 열기 | BR-PUB-005 |
| `tests/place.test.ts` | 붙여넣기 HTML의 장소 | BR-PUB-008 |
