---
type: business-rule
domain: publishing
id: BR-PUB-003
name: 입력 경로 선택과 막힌 사이트 기억
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/pipeline.ts:261-271
  - blog-writer:server/pipeline.ts:312-359
  - blog-writer:server/browser/blockedSites.ts:6-37
  - blog-writer:server/browser/claudeChrome.ts:27-35
  - blog-writer:server/claude.ts:128-132
  - blog-writer:server/browser/blogPost.ts:207-209
  - blog-writer:server/routes/browser.ts:60-77
  - blog-writer:src/BlockedSites.tsx:9-65
entities: [막힌 사이트, 블로그 설정]
updated: 2026-10-07
---
# BR-PUB-003 입력 경로 선택과 막힌 사이트 기억

## 규칙
워드프레스는 REST API로 올리고 크롬을 쓰지 않는다. 네이버·티스토리는 먼저 Claude in Chrome으로 입력한다. Claude in Chrome이 안전 정책으로 그 사이트를 막으면 **제한을 우회하지 않고** 다른 방법으로 그 자리에서 이어서 진행하고, 그 플랫폼을 기억해 다음부터는 바로 다른 방법으로 간다.

## 조건과 결과
| 조건 | 경로 |
|---|---|
| 워드프레스 | REST API (`doWordPressPost`), 크롬 큐·확장·막힌 목록을 거치지 않음 → [[publishing/flows/워드프레스 API 등록 플로우]] |
| 네이버·티스토리, 확장 미설치 | 시작 전 400 "블로그 작성은 Claude in Chrome 확장 프로그램으로 합니다…" |
| 플랫폼이 막힌 목록에 없음 | Claude in Chrome (`postWithClaudeInChrome`) |
| 실행 중 `SiteBlockedError` (도구 결과 또는 Claude 결과 문구) | 막힌 목록에 기록 → 대체 경로로 이어서 |
| 막힌 목록에 있음 | 바로 대체 경로 |
| 대체 경로: 네이버 + macOS | 평소 크롬 + AppleScript (`postNaverInUserChrome`) |
| 대체 경로: 그 밖 (티스토리, macOS가 아닌 네이버) | 앱 전용 크롬 자동 조작 (`postWithChrome`) |
| 그 밖 오류 | 실패 (대체 경로로 가지 않음) |

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 서버 | 워드프레스 분기 | `blog-writer:server/pipeline.ts:265-269` |
| 서버 | 경로 선택·기억 | `blog-writer:server/pipeline.ts:329-356` |
| 서버 | 차단 감지 2곳 | `blog-writer:server/claude.ts:128-132`, `blog-writer:server/browser/blogPost.ts:207-209` |
| 저장 | `data/blocked-sites.json` | `blog-writer:server/browser/blockedSites.ts:10-37` |
| 서버(API) | 막힌 목록에 실제 대체 경로 `fallback`을 붙여 돌려줌, 초기화 | `blog-writer:server/routes/browser.ts:60-77` |
| 화면 | 막힌 목록, 초기화 버튼, 대체 경로 설명, 네이버·티스토리 로그인 창 | `blog-writer:src/BlockedSites.tsx:9-65` |

## 예외 / 경계값
- 화면 목록은 서버가 알려 준 `fallback`으로 실제 경로를 표시한다: 네이버+macOS는 "평소 크롬으로 진행", 그 밖은 "자동 조작(앱 전용 크롬)으로 진행" (`blog-writer:src/BlockedSites.tsx:30`).
- 차단 판단은 영어 문구 정규식에 의존 ([[_system/known-issues]]).
- 대체 경로는 Claude를 쓰지 않으므로 Claude 사용량이 들지 않는다.
- 막힌 목록 파일은 다른 저장 파일과 달리 임시 파일→이름 바꾸기 방식이 아니라 바로 덮어쓴다 ([[publishing/open-questions]] #9).

## 영향받는 플로우
[[publishing/flows/블로그 임시저장 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-05 | 최초 기록 | |
| 2026-10-05 | 막힌 목록에 실제 대체 경로(`fallback`) 표시 | `blog-writer:server/routes/browser.ts:60-70`, `blog-writer:src/BlockedSites.tsx:30` |
| 2026-10-07 | 워드프레스는 크롬 경로에서 빠지고 REST API로만 올림 (워드프레스 크롬 어댑터·Claude in Chrome 안내 삭제) | `blog-writer:server/pipeline.ts:265-269`, `blog-writer:server/browser/adapters.ts:382-386` |
