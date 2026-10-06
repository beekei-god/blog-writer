---
type: business-rule
domain: publishing
id: BR-PUB-017
name: 로그인 창은 한 블로그씩
status: active
confidence: high
consistency: consistent
source:
  - blog-writer:server/browser/loginWindow.ts:11-52
  - blog-writer:server/routes/browser.ts:79-121
  - blog-writer:src/LoginWindow.tsx:10-76
  - blog-writer:src/BlockedSites.tsx:58-61
  - blog-writer:tests/api.test.ts:133-138
entities: [블로그 설정]
updated: 2026-10-07
---
# BR-PUB-017 로그인 창은 한 블로그씩

## 규칙
로그인 창은 자동 조작(앱 전용 크롬)으로 올리는 **네이버·티스토리**에 로그인해 두는 창이다. 앱 전용 크롬 프로필은 한 프로세스만 열 수 있으므로 **한 번에 한 블로그의 창만** 연다. 서버는 지금 열린 창이 어느 블로그용인지 기억하고, 다른 블로그의 창을 열려고 하면 먼저 닫게 한다. 워드프레스는 API로 올리므로 로그인 창이 없다.

## 조건과 결과
| 조건 | 결과 |
|---|---|
| `platform`이 `naver`/`tistory`가 아님 (워드프레스 포함) | 400 "로그인할 블로그(네이버 또는 티스토리)를 고르세요. 워드프레스는 API로 올려서 로그인 창이 필요 없습니다." |
| 자동 조작 중 | 409 "지금 자동 조작으로 작업 중입니다. 작업이 끝난 뒤 로그인 창을 열어 주세요." |
| 같은 블로그 창이 이미 열림 | 그대로 두고 상태만 돌려줌 |
| 다른 블로그 창이 열림 | 409 "<블로그> 로그인 창이 열려 있습니다. 그 창에서 "로그인 완료 (창 닫기)"를 누른 뒤 다시 여세요." |
| 그 블로그의 ID가 설정에 없음 | 400 "먼저 설정에서 <블로그> 블로그 ID를 입력하세요." |
| 열기 | 남아 있는 자동 조작 창을 닫고, 네이버는 로그인 후 그 블로그로 가는 주소, 티스토리는 로그인 주소로 새 창 |
| 상태 응답 | `{open, platform(열린 창의 블로그, 닫혀 있으면 null), automationRunning}` |
| 화면: 다른 블로그 창이 열림 | 이 블로그의 "로그인 창 열기" 버튼 비활성, 툴팁 "<블로그> 로그인 창을 먼저 닫으세요" |
| 화면: 이 블로그 창이 열림 | "<블로그> 로그인 창이 열려 있습니다." + "로그인 완료 (창 닫기)" |

## 구현 현황
| 레이어 | 구현 | 근거 |
|---|---|---|
| 서버 | `procFor`, `loginWindowFor`, `openLoginWindow(urls, forBlog)` | `blog-writer:server/browser/loginWindow.ts:11-52` |
| 서버(API) | 검사 순서: 자동 조작 → 블로그 값 → 열린 창 → 블로그 ID → 열기 | `blog-writer:server/routes/browser.ts:90-114` |
| 화면 | `LoginWindow` (블로그별, 3초마다 상태 확인) | `blog-writer:src/LoginWindow.tsx:10-76` |
| 화면(설정) | 네이버·티스토리 로그인 창 버튼 | `blog-writer:src/BlockedSites.tsx:58-61` |
| 테스트 | 워드프레스 거절, 블로그 ID 없음 | `blog-writer:tests/api.test.ts:133-138` |

## 예외 / 경계값
- 서버가 다시 시작되면 열린 창의 기록을 잃는다(창은 남아 있어도 `open: false`).
- 로그인 창이 열린 채 자동 조작이 시작되면 창을 닫고 진행한다 → [[publishing/business-rules/BR-PUB-004 크롬 작업 직렬화]].

## 영향받는 플로우
[[publishing/flows/블로그 임시저장 플로우]]

## 변경 이력
| 날짜 | 변경 | 근거 |
|---|---|---|
| 2026-10-07 | 최초 기록. 예전에는 설정의 기본 블로그로만 열었고, 어느 블로그 창인지 구분하지 않았다 | `blog-writer:server/routes/browser.ts:96-103` |
